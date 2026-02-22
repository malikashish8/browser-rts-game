import Phaser from 'phaser'
import { createInitialGameState } from './core/GameState.ts'
import type { GameState, UnitType, Vec2 } from './core/GameState.ts'
import { UNIT_COSTS } from './core/GameState.ts'
import { createSystems, spawnUnit } from './core/Systems.ts'
import type { GameSystems } from './core/Systems.ts'
import { MapRenderer } from './rendering/MapRenderer.ts'
import { ResourceRenderer } from './rendering/ResourceRenderer.ts'
import { UnitRenderer } from './rendering/UnitRenderer.ts'
import { FogOfWarRenderer } from './rendering/FogOfWarRenderer.ts'
import { InputHandler } from './input/InputHandler.ts'
import { HUD } from '../ui/HUD.ts'
import { initMusic } from '../audio/music.ts'
import { initSfxToggle } from '../audio/sfx.ts'

export class GameClient {
  private state: GameState
  private readonly systems: GameSystems
  private readonly input: InputHandler
  private readonly hud: HUD
  private readonly mapRenderer: MapRenderer
  private readonly resourceRenderer: ResourceRenderer
  private readonly unitRenderer: UnitRenderer
  private readonly fogRenderer: FogOfWarRenderer
  private selectedUnitIds: string[] = []
  private nextUnitId = 1000

  constructor(scene: Phaser.Scene) {
    this.state = createInitialGameState()
    this.systems = createSystems()
    this.mapRenderer = new MapRenderer(scene)
    this.resourceRenderer = new ResourceRenderer(scene)
    this.unitRenderer = new UnitRenderer(scene)
    this.fogRenderer = new FogOfWarRenderer(scene, this.state.world.width, this.state.world.height)
    this.input = new InputHandler(
      scene,
      () => this.state,
      {
        setSelection: (unitIds: string[]) => { this.selectedUnitIds = unitIds },
        issueMove: (destination: Vec2) => { this.issueMoveCommand(destination) },
      },
    )
    this.hud = new HUD(
      () => this.state,
      () => this.selectedUnitIds,
      {
        trainUnit: (type) => { this.trainUnit(type) },
      },
    )
  }

  init(): void {
    initMusic()
    initSfxToggle()
    this.mapRenderer.init(this.state)
    this.state = this.systems.spawning.spawnInitialArmy(this.state)
    this.fogRenderer.sync(this.state)
    this.resourceRenderer.sync(this.state)
    this.unitRenderer.sync(this.state)
    this.hud.render(this.state)
  }

  update(_time: number, delta: number): void {
    const dtSeconds = delta / 1000
    this.state = this.systems.updateAll(this.state, dtSeconds)
    this.input.update(dtSeconds)
    this.hud.render(this.state)

    // Update fog of war (computes visibility grid).
    this.fogRenderer.sync(this.state)

    // Filter state for renderers: hide enemies in fog, but always show resources.
    const visibleState: GameState = {
      ...this.state,
      units: this.state.units.filter(
        (u) => u.ownerId === 'player' || this.fogRenderer.isVisible(u.position.x, u.position.y),
      ),
    }

    this.resourceRenderer.sync(visibleState)
    this.unitRenderer.sync(visibleState, delta, new Set(this.selectedUnitIds))
  }

  private trainUnit(type: UnitType): void {
    const costs = UNIT_COSTS[type]
    const player = this.state.players.find((p) => p.id === 'player')
    if (!player) return

    // Check affordability.
    for (const [res, amt] of Object.entries(costs)) {
      if (player.resources[res as ResourceType] < (amt ?? 0)) return
    }

    // Deduct costs.
    const newResources = { ...player.resources }
    for (const [res, amt] of Object.entries(costs)) {
      newResources[res as ResourceType] -= amt ?? 0
    }

    // Villagers spawn near left-edge resources, soldiers spawn further right.
    const midY = this.state.world.height * 0.5
    let spawnPos: Vec2
    if (type === 'villager') {
      spawnPos = {
        x: this.state.world.width * 0.10 + (Math.random() - 0.5) * 40,
        y: midY + (Math.random() - 0.5) * 60,
      }
    } else {
      spawnPos = {
        x: this.state.world.width * 0.30 + (Math.random() - 0.5) * 60,
        y: midY + (Math.random() - 0.5) * 60,
      }
    }

    const newUnit = spawnUnit('player', type, spawnPos, (this.nextUnitId += 1))

    this.state = {
      ...this.state,
      players: this.state.players.map((p) =>
        p.id === 'player' ? { ...p, resources: newResources } : p,
      ),
      units: [...this.state.units, newUnit],
    }
  }

  private issueMoveCommand(destination: Vec2): void {
    if (this.selectedUnitIds.length === 0) return
    const selectedIds = new Set(this.selectedUnitIds)
    this.state = {
      ...this.state,
      units: this.state.units.map((unit) =>
        selectedIds.has(unit.id)
          ? {
              ...unit,
              currentOrder: { type: 'move', targetPosition: { ...destination } },
              // Clear gather state so the villager can auto-assign at the new destination.
              resourceAssignment: unit.type === 'villager' ? null : unit.resourceAssignment,
              gatherTargetNodeId: unit.type === 'villager' ? null : unit.gatherTargetNodeId,
            }
          : unit,
      ),
    }
  }
}
