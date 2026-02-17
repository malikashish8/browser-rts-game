import './style.css'
import Phaser from 'phaser'
import { MainScene } from './game/scenes/MainScene.ts'

const GAME_WIDTH = 1280
const GAME_HEIGHT = 720

function bootstrapGame(): void {
  const parent = document.getElementById('game-container')

  if (!parent) {
    throw new Error('Missing #game-container element for Phaser game')
  }

  // Phaser injects its own canvas into the parent container.
  // The HUD is handled separately via DOM elements.
  new Phaser.Game({
    type: Phaser.AUTO,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    parent,
    backgroundColor: '#1b2838',
    physics: {
      default: 'arcade',
    },
    scene: [MainScene],
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
  })
}

bootstrapGame()
