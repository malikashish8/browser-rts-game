import Phaser from 'phaser'
import type { GameState } from '../core/GameState.ts'

const CELL = 32
const UNEXPLORED = 0
const EXPLORED   = 1
const VISIBLE    = 2

export class FogOfWarRenderer {
  private readonly scene: Phaser.Scene
  private readonly gfx: Phaser.GameObjects.Graphics
  private readonly cols: number
  private readonly rows: number
  private readonly grid: Uint8Array

  constructor(scene: Phaser.Scene, worldWidth: number, worldHeight: number) {
    this.scene = scene
    this.cols = Math.ceil(worldWidth / CELL)
    this.rows = Math.ceil(worldHeight / CELL)
    this.grid = new Uint8Array(this.cols * this.rows) // all UNEXPLORED (0)

    this.gfx = scene.add.graphics()
    this.gfx.setDepth(1)
  }

  /** Returns the visibility grid so GameClient can filter hidden entities. */
  cellState(worldX: number, worldY: number): number {
    const c = Math.floor(worldX / CELL)
    const r = Math.floor(worldY / CELL)
    if (c < 0 || c >= this.cols || r < 0 || r >= this.rows) return UNEXPLORED
    return this.grid[r * this.cols + c]
  }

  isVisible(worldX: number, worldY: number): boolean {
    return this.cellState(worldX, worldY) === VISIBLE
  }

  isExplored(worldX: number, worldY: number): boolean {
    return this.cellState(worldX, worldY) >= EXPLORED
  }

  sync(state: GameState): void {
    // 1. Downgrade VISIBLE → EXPLORED (keep EXPLORED and UNEXPLORED as-is).
    for (let i = 0; i < this.grid.length; i++) {
      if (this.grid[i] === VISIBLE) this.grid[i] = EXPLORED
    }

    // 2. Reveal cells around each player unit.
    for (const unit of state.units) {
      if (unit.ownerId !== 'player') continue
      this.reveal(unit.position.x, unit.position.y, unit.sightRange)
    }

    // 3. Redraw fog overlay.
    this.gfx.clear()

    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const v = this.grid[r * this.cols + c]
        if (v === UNEXPLORED) {
          this.gfx.fillStyle(0x000000, 0.92)
          this.gfx.fillRect(c * CELL, r * CELL, CELL, CELL)
        } else if (v === EXPLORED) {
          this.gfx.fillStyle(0x000000, 0.55)
          this.gfx.fillRect(c * CELL, r * CELL, CELL, CELL)
        }
        // VISIBLE → no fog drawn.
      }
    }
  }

  /** Mark all cells within `radius` of (cx, cy) as VISIBLE. */
  private reveal(cx: number, cy: number, radius: number): void {
    const rSq = radius * radius
    const cMin = Math.max(0, Math.floor((cx - radius) / CELL))
    const cMax = Math.min(this.cols - 1, Math.floor((cx + radius) / CELL))
    const rMin = Math.max(0, Math.floor((cy - radius) / CELL))
    const rMax = Math.min(this.rows - 1, Math.floor((cy + radius) / CELL))

    for (let r = rMin; r <= rMax; r++) {
      for (let c = cMin; c <= cMax; c++) {
        // Distance from unit center to cell center.
        const cellCX = c * CELL + CELL / 2
        const cellCY = r * CELL + CELL / 2
        const dx = cellCX - cx
        const dy = cellCY - cy
        if (dx * dx + dy * dy <= rSq) {
          this.grid[r * this.cols + c] = VISIBLE
        }
      }
    }
  }
}
