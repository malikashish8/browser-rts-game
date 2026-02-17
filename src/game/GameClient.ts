import Phaser from 'phaser'
import { createInitialGameState } from './core/GameState.ts'
import type { GameState, Vec2 } from './core/GameState.ts'
import { createSystems } from './core/Systems.ts'
import type { GameSystems } from './core/Systems.ts'
import { MapRenderer } from './rendering/MapRenderer.ts'
import { UnitRenderer } from './rendering/UnitRenderer.ts'
import { InputHandler } from './input/InputHandler.ts'
import { HUD } from '../ui/HUD.ts'

/**
 * GameClient orchestrates the Phaser scene, core game state, systems,
 * input handling, and HUD updates.
 */
export class GameClient {
  private state: GameState
  private readonly systems: GameSystems
  private readonly input: InputHandler
  private readonly hud: HUD
  private readonly mapRenderer: MapRenderer
  private readonly unitRenderer: UnitRenderer
  private selectedUnitIds: string[] = []

  constructor(scene: Phaser.Scene) {
    this.state = createInitialGameState()
    this.systems = createSystems()
    this.mapRenderer = new MapRenderer(scene)
    this.unitRenderer = new UnitRenderer(scene)
    this.input = new InputHandler(
      scene,
      () => this.state,
      {
        setSelection: (unitIds: string[]) => {
          this.selectedUnitIds = unitIds
        },
        issueMove: (destination: Vec2) => {
          this.issueMoveCommand(destination)
        },
      },
    )
    this.hud = new HUD(
      () => this.state,
      () => this.selectedUnitIds,
    )
  }

  init(): void {
    // Initialize terrain / background.
    this.mapRenderer.init(this.state)

    // Spawn a few starting units so the player sees something immediately.
    this.state = this.systems.spawning.spawnInitialArmy(this.state)

    // Initial unit sync.
    this.unitRenderer.sync(this.state)

    // Initial HUD sync.
    this.hud.render(this.state)
  }

  update(_time: number, delta: number): void {
    const dtSeconds = delta / 1000

    // Advance core game simulation.
    this.state = this.systems.updateAll(this.state, dtSeconds)

    // Let the input handler process commands (selection, orders) later.
    this.input.update(dtSeconds)

    // Re-render HUD and units from current state.
    this.hud.render(this.state)
    this.unitRenderer.sync(this.state)
  }

  private issueMoveCommand(destination: Vec2): void {
    if (this.selectedUnitIds.length === 0) return

    const selectedIds = new Set(this.selectedUnitIds)

    const nextUnits = this.state.units.map((unit) => {
      if (!selectedIds.has(unit.id)) {
        return unit
      }

      return {
        ...unit,
        currentOrder: {
          type: 'move' as const,
          targetPosition: { ...destination },
        },
      }
    })

    this.state = {
      ...this.state,
      units: nextUnits,
    }
  }
}

