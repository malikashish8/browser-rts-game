import Phaser from 'phaser'
import { GameClient } from '../GameClient.ts'

export class MainScene extends Phaser.Scene {
  private gameClient!: GameClient

  constructor() {
    super('MainScene')
  }

  create(): void {
    // Prevent the browser context menu on right-click over the canvas.
    this.input.mouse?.disableContextMenu()

    this.gameClient = new GameClient(this)
    this.gameClient.init()
  }

  update(time: number, delta: number): void {
    this.gameClient.update(time, delta)
  }
}

