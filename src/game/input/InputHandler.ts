import Phaser from 'phaser'
import type { GameState, Vec2 } from '../core/GameState.ts'

type StateProvider = () => GameState

interface InputCallbacks {
  setSelection: (unitIds: string[]) => void
  issueMove: (destination: Vec2) => void
}

/**
 * InputHandler maps mouse / keyboard input to higher-level game commands.
 *
 * v1:
 * - Left-click selects the closest unit under the cursor (if any).
 * - Right-click orders currently selected units to move to the target.
 */
export class InputHandler {
  private readonly scene: Phaser.Scene
  private readonly getState: StateProvider
  private readonly callbacks: InputCallbacks
  private selectedUnitIds: string[] = []
  private isDragging = false
  private dragStartX = 0
  private dragStartY = 0
  private dragGraphics: Phaser.GameObjects.Graphics | null = null

  constructor(
    scene: Phaser.Scene,
    getState: StateProvider,
    callbacks: InputCallbacks,
  ) {
    this.scene = scene
    this.getState = getState
    this.callbacks = callbacks

    this.registerMouseBindings()
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  update(_dtSeconds: number): void {
    // Reserved for keyboard shortcuts / drag selection later.
  }

  private registerMouseBindings(): void {
    this.scene.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (pointer.leftButtonDown()) {
        this.beginDrag(pointer)
      } else if (pointer.rightButtonDown()) {
        this.handleRightClick(pointer)
      }
    })

    this.scene.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (!this.isDragging || !this.dragGraphics) return
      this.updateDragVisual(pointer)
    })

    this.scene.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      if (pointer.leftButtonReleased() && this.isDragging) {
        this.finishDrag(pointer)
      }
    })
  }

  private beginDrag(pointer: Phaser.Input.Pointer): void {
    this.isDragging = true
    this.dragStartX = pointer.worldX
    this.dragStartY = pointer.worldY

    if (this.dragGraphics) {
      this.dragGraphics.destroy()
    }

    this.dragGraphics = this.scene.add.graphics()
    this.dragGraphics.lineStyle(1, 0x93c5fd, 1)
    this.dragGraphics.fillStyle(0x3b82f6, 0.15)
  }

  private finishDrag(pointer: Phaser.Input.Pointer): void {
    const dragDX = pointer.worldX - this.dragStartX
    const dragDY = pointer.worldY - this.dragStartY
    const dragDistance = Math.hypot(dragDX, dragDY)

    if (this.dragGraphics) {
      this.dragGraphics.destroy()
      this.dragGraphics = null
    }

    this.isDragging = false

    // Treat very small drags as a simple click selection.
    const clickThreshold = 6
    if (dragDistance < clickThreshold) {
      this.handleClickSelection(pointer)
    } else {
      this.handleBoxSelection(pointer)
    }
  }

  private updateDragVisual(pointer: Phaser.Input.Pointer): void {
    if (!this.dragGraphics) return

    const x1 = this.dragStartX
    const y1 = this.dragStartY
    const x2 = pointer.worldX
    const y2 = pointer.worldY

    const left = Math.min(x1, x2)
    const top = Math.min(y1, y2)
    const width = Math.abs(x2 - x1)
    const height = Math.abs(y2 - y1)

    this.dragGraphics.clear()
    this.dragGraphics.lineStyle(1, 0x93c5fd, 1)
    this.dragGraphics.strokeRect(left, top, width, height)
    this.dragGraphics.fillStyle(0x3b82f6, 0.15)
    this.dragGraphics.fillRect(left, top, width, height)
  }

  private handleClickSelection(pointer: Phaser.Input.Pointer): void {
    const state = this.getState()
    const pickRadius = 18

    let closestUnitId: string | null = null
    let closestDistance = Number.POSITIVE_INFINITY

    for (const unit of state.units) {
      const dx = unit.position.x - pointer.worldX
      const dy = unit.position.y - pointer.worldY
      const distance = Math.hypot(dx, dy)
      if (distance < pickRadius && distance < closestDistance) {
        closestDistance = distance
        closestUnitId = unit.id
      }
    }

    if (closestUnitId) {
      this.selectedUnitIds = [closestUnitId]
    } else {
      this.selectedUnitIds = []
    }

    this.callbacks.setSelection(this.selectedUnitIds)
  }

  private handleBoxSelection(pointer: Phaser.Input.Pointer): void {
    const state = this.getState()

    const x1 = this.dragStartX
    const y1 = this.dragStartY
    const x2 = pointer.worldX
    const y2 = pointer.worldY

    const left = Math.min(x1, x2)
    const right = Math.max(x1, x2)
    const top = Math.min(y1, y2)
    const bottom = Math.max(y1, y2)

    const selected: string[] = []
    for (const unit of state.units) {
      if (
        unit.position.x >= left &&
        unit.position.x <= right &&
        unit.position.y >= top &&
        unit.position.y <= bottom
      ) {
        selected.push(unit.id)
      }
    }

    this.selectedUnitIds = selected
    this.callbacks.setSelection(this.selectedUnitIds)
  }

  private handleRightClick(pointer: Phaser.Input.Pointer): void {
    if (this.selectedUnitIds.length === 0) {
      return
    }

    const destination: Vec2 = {
      x: pointer.worldX,
      y: pointer.worldY,
    }

    this.callbacks.issueMove(destination)
  }
}

