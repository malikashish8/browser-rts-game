import Phaser from 'phaser'
import type { GameState, Unit } from '../core/GameState.ts'

type UnitVisualState = 'idle' | 'moving' | 'attacking'

interface UnitView {
  container: Phaser.GameObjects.Container
  body: Phaser.GameObjects.Rectangle
  head: Phaser.GameObjects.Arc
  weapon: Phaser.GameObjects.Rectangle
  lastX: number
  lastY: number
}

/**
 * UnitRenderer keeps a mapping between logical units in GameState and
 * lightweight visual representations in the Phaser scene.
 *
 * Each unit is drawn as a small humanoid figure made from simple
 * shapes (body, head, weapon). We vary pose / tint based on state:
 * - Idle: upright stance.
 * - Moving: slight lean and bobbing motion.
 * - Attacking: weapon raised and red highlight.
 */
export class UnitRenderer {
  private readonly scene: Phaser.Scene
  private readonly views = new Map<string, UnitView>()

  constructor(scene: Phaser.Scene) {
    this.scene = scene
  }

  sync(state: GameState): void {
    const seenIds = new Set<string>()

    for (const unit of state.units) {
      seenIds.add(unit.id)
      const view = this.views.get(unit.id)
      if (view) {
        this.updateView(unit, view)
      } else {
        const created = this.createView(unit)
        this.views.set(unit.id, created)
      }
    }

    // Remove visuals for units that no longer exist.
    for (const [id, view] of this.views) {
      if (!seenIds.has(id)) {
        view.container.destroy()
        this.views.delete(id)
      }
    }
  }

  private createView(unit: Unit): UnitView {
    const baseColor = this.getBodyColor(unit)
    const bodyHeight = unit.type === 'horseman' ? 26 : 22
    const bodyWidth = 10

    const body = this.scene.add.rectangle(0, 0, bodyWidth, bodyHeight, baseColor)
    body.setOrigin(0.5, 0.9)

    const head = this.scene.add.circle(0, -bodyHeight * 0.8, 6, 0xfacc15)

    const weaponLength =
      unit.type === 'archer'
        ? 16
        : unit.type === 'spearman'
          ? 20
          : 14
    const weapon = this.scene.add.rectangle(
      6,
      -bodyHeight * 0.4,
      3,
      weaponLength,
      0xd4d4d8,
    )
    weapon.setOrigin(0.5, 0)

    const container = this.scene.add.container(
      unit.position.x,
      unit.position.y,
      [body, head, weapon],
    )
    container.setDepth(10)

    return {
      container,
      body,
      head,
      weapon,
      lastX: unit.position.x,
      lastY: unit.position.y,
    }
  }

  private updateView(unit: Unit, view: UnitView): void {
    const { container, body, weapon } = view

    const prevX = view.lastX
    const prevY = view.lastY
    const dx = unit.position.x - prevX
    const dy = unit.position.y - prevY
    const movedDistance = Math.hypot(dx, dy)

    container.setPosition(unit.position.x, unit.position.y)
    view.lastX = unit.position.x
    view.lastY = unit.position.y

    const state = this.deriveVisualState(unit, movedDistance)

    // Base pose.
    container.setScale(1, 1)
    body.setFillStyle(this.getBodyColor(unit))
    weapon.setFillStyle(0xd4d4d8)
    weapon.setAngle(0)

    if (state === 'moving') {
      // Lean slightly in the direction of travel and bob.
      const angleDeg = (Math.atan2(dy, dx) * 180) / Math.PI
      container.setAngle(angleDeg * 0.1)
      const bob = Math.sin(this.scene.time.now / 120) * 1.5
      container.y += bob
    } else if (state === 'attacking') {
      // Raise weapon and tint body to indicate aggression.
      weapon.setAngle(-60)
      body.setFillStyle(0xef4444)
    }
  }

  private deriveVisualState(unit: Unit, movedDistance: number): UnitVisualState {
    if (unit.attackCooldown > 0 || unit.currentOrder.type === 'attackMove') {
      return 'attacking'
    }

    if (
      unit.currentOrder.type === 'move' &&
      unit.currentOrder.targetPosition &&
      movedDistance > 0.5
    ) {
      return 'moving'
    }

    return 'idle'
  }

  private getBodyColor(unit: Unit): number {
    if (unit.ownerId === 'player') {
      if (unit.type === 'spearman') return 0x60a5fa
      if (unit.type === 'archer') return 0x22c55e
      if (unit.type === 'horseman') return 0xf97316
      return 0xe5e7eb
    }

    // AI units use warmer palette.
    if (unit.type === 'spearman') return 0xf97316
    if (unit.type === 'archer') return 0xfacc15
    if (unit.type === 'horseman') return 0xef4444
    return 0x9ca3af
  }
}

