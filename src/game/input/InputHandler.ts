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
        this.handleLeftClick(pointer)
      } else if (pointer.rightButtonDown()) {
        this.handleRightClick(pointer)
      }
    })
  }

  private handleLeftClick(pointer: Phaser.Input.Pointer): void {
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

