import Phaser from 'phaser'
import { createInitialGameState } from './core/GameState.ts'
import type { GameState, ResourceType, UnitType, Vec2 } from './core/GameState.ts'
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
  private readonly devMode = import.meta.env.DEV
  private gameOver = false

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

    // Show dev mode indicator
    if (this.devMode) {
      const badge = document.createElement('div')
      badge.textContent = 'DEV MODE'
      badge.style.cssText = `
        position: fixed;
        top: 1rem;
        left: 1rem;
        padding: 0.25rem 0.75rem;
        background: rgba(239, 68, 68, 0.9);
        color: white;
        font-size: 0.75rem;
        font-weight: 700;
        border-radius: 4px;
        z-index: 1000;
        letter-spacing: 0.05em;
      `
      document.body.appendChild(badge)
    }

    this.mapRenderer.init(this.state)
    this.state = this.systems.spawning.spawnInitialArmy(this.state)
    this.fogRenderer.sync(this.state)
    this.resourceRenderer.sync(this.state)
    this.unitRenderer.sync(this.state)
    this.hud.render(this.state)
  }

  update(_time: number, delta: number): void {
    if (this.gameOver) return

    const dtSeconds = delta / 1000
    this.state = this.systems.updateAll(this.state, dtSeconds)
    this.input.update(dtSeconds)
    this.hud.render(this.state)

    // Check win/lose conditions
    this.checkGameOver()

    // DEV MODE: Show everything, no fog of war
    if (this.devMode) {
      this.resourceRenderer.sync(this.state)
      this.unitRenderer.sync(this.state, delta, new Set(this.selectedUnitIds))
      return
    }

    // PRODUCTION: Update fog of war and filter hidden entities
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

  private checkGameOver(): void {
    const playerUnits = this.state.units.filter((u) => u.ownerId === 'player').length
    const aiUnits = this.state.units.filter((u) => u.ownerId === 'ai').length

    if (playerUnits === 0) {
      this.gameOver = true
      this.showGameOver('DEFEAT', 'All your units have been destroyed!')
    } else if (aiUnits === 0) {
      this.gameOver = true
      this.showGameOver('VICTORY', 'Enemy forces eliminated!')
    }
  }

  private showGameOver(result: string, message: string): void {
    const overlay = document.createElement('div')
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.85);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      z-index: 2000;
      animation: fadeIn 0.5s ease;
    `

    const title = document.createElement('h1')
    title.textContent = result
    title.style.cssText = `
      font-size: 4rem;
      font-weight: 900;
      margin: 0 0 1rem 0;
      color: ${result === 'VICTORY' ? '#4ade80' : '#ef4444'};
      text-shadow: 0 0 20px ${result === 'VICTORY' ? 'rgba(74, 222, 128, 0.5)' : 'rgba(239, 68, 68, 0.5)'};
      letter-spacing: 0.1em;
    `

    const msg = document.createElement('p')
    msg.textContent = message
    msg.style.cssText = `
      font-size: 1.25rem;
      color: #e5e7eb;
      margin: 0 0 2rem 0;
    `

    const stats = document.createElement('div')
    const finalTime = Math.floor(this.state.time)
    const minutes = Math.floor(finalTime / 60)
    const seconds = finalTime % 60
    stats.innerHTML = `
      <div style="color: #94a3b8; font-size: 0.9rem; margin-bottom: 2rem;">
        Time: ${minutes}:${seconds.toString().padStart(2, '0')}
      </div>
    `

    const restartBtn = document.createElement('button')
    restartBtn.textContent = 'Play Again'
    restartBtn.style.cssText = `
      padding: 0.75rem 2rem;
      font-size: 1rem;
      font-weight: 600;
      background: rgba(59, 130, 246, 0.9);
      color: white;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.2s;
    `
    restartBtn.onmouseover = () => {
      restartBtn.style.background = 'rgba(59, 130, 246, 1)'
      restartBtn.style.transform = 'scale(1.05)'
    }
    restartBtn.onmouseout = () => {
      restartBtn.style.background = 'rgba(59, 130, 246, 0.9)'
      restartBtn.style.transform = 'scale(1)'
    }
    restartBtn.onclick = () => {
      window.location.reload()
    }

    overlay.append(title, msg, stats, restartBtn)
    document.body.appendChild(overlay)

    // Add fade-in animation
    const style = document.createElement('style')
    style.textContent = `
      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
    `
    document.head.appendChild(style)
  }
}
