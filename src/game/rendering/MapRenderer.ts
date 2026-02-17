import Phaser from 'phaser'
import type { GameState } from '../core/GameState.ts'

/**
 * MapRenderer is responsible for drawing the terrain / background.
 *
 * For v1 we simply render a flat colored rectangle matching the
 * logical world bounds.
 */
export class MapRenderer {
  private readonly scene: Phaser.Scene
  private background?: Phaser.GameObjects.Rectangle

  constructor(scene: Phaser.Scene) {
    this.scene = scene
  }

  init(state: GameState): void {
    if (this.background) {
      this.background.destroy()
    }

    this.background = this.scene.add.rectangle(
      state.world.width / 2,
      state.world.height / 2,
      state.world.width,
      state.world.height,
      0x14532d,
    )
    this.background.setDepth(0)
  }
}

