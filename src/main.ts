import './style.css'
import Phaser from 'phaser'
import { MainScene } from './game/scenes/MainScene.ts'

const GAME_WIDTH = 1280
const GAME_HEIGHT = 720

function isMobileScreen(): boolean {
  return window.innerWidth <= 768 || window.innerHeight <= 500
}

function bootstrapGame(): void {
  const parent = document.getElementById('game-container')

  if (!parent) {
    throw new Error('Missing #game-container element for Phaser game')
  }

  const mobile = isMobileScreen()

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
      // Mobile: fill full width for larger units (page scrolls vertically).
      // Desktop: fit within the container maintaining aspect ratio.
      mode: mobile ? Phaser.Scale.WIDTH_CONTROLS_HEIGHT : Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_HORIZONTALLY,
    },
    input: {
      touch: {
        // On mobile, don't preventDefault on touch events so the browser
        // can handle vertical page scrolling.
        capture: !mobile,
      },
    },
  })
}

bootstrapGame()
