import Phaser from 'phaser'
import type { GameState, ResourceNode } from '../core/GameState.ts'

interface NodeView {
  container: Phaser.GameObjects.Container
  fillBar: Phaser.GameObjects.Rectangle
  maxWidth: number
  maxAmount: number
}

export class ResourceRenderer {
  private readonly scene: Phaser.Scene
  private readonly views = new Map<string, NodeView>()

  constructor(scene: Phaser.Scene) {
    this.scene = scene
  }

  sync(state: GameState): void {
    const seenIds = new Set<string>()

    for (const node of state.resourceNodes) {
      seenIds.add(node.id)
      const existing = this.views.get(node.id)
      if (existing) {
        this.updateView(node, existing)
      } else {
        this.views.set(node.id, this.createView(node))
      }
    }

    for (const [id, view] of this.views) {
      if (!seenIds.has(id)) {
        view.container.destroy()
        this.views.delete(id)
      }
    }
  }

  private createView(node: ResourceNode): NodeView {
    switch (node.type) {
      case 'food': return this.buildFarm(node)
      case 'wood': return this.buildTree(node)
      case 'gold': return this.buildMine(node)
    }
  }

  // ─── Farm (food) ───────────────────────────────────────────────────────────

  private buildFarm(node: ResourceNode): NodeView {
    const g = this.scene.add.graphics()

    // Soil base — large field
    g.fillStyle(0xc8893e)
    g.fillRect(-44, -30, 88, 62)

    // Crop rows (7 rows across the field)
    const rowColors = [0x6aaa3a, 0x4a8a28, 0x6aaa3a, 0x4a8a28, 0x6aaa3a, 0x4a8a28, 0x6aaa3a]
    for (let i = 0; i < 7; i++) {
      g.fillStyle(rowColors[i])
      g.fillRect(-36, -24 + i * 8, 70, 5)
    }

    // Farmhouse body (upper-left of field)
    g.fillStyle(0x7c5830)
    g.fillRect(-60, -46, 20, 26)
    // Farmhouse roof
    g.fillStyle(0xaa3333)
    g.fillTriangle(-63, -46, -40, -46, -51, -62)
    // Door
    g.fillStyle(0x3a2008)
    g.fillRect(-53, -30, 7, 10)
    // Window
    g.fillStyle(0x8ecae6)
    g.fillRect(-46, -40, 5, 5)

    // Fence posts (left + right)
    g.fillStyle(0x8b6914)
    for (let i = 0; i < 5; i++) {
      g.fillRect(-48, -28 + i * 14, 3, 10)
      g.fillRect(43, -28 + i * 14, 3, 10)
    }

    const barW = 80
    const hpBg  = this.scene.add.rectangle(0, 42, barW + 4, 6, 0x1f2937)
    const fillBar = this.scene.add.rectangle(-(barW / 2), 42, barW, 4, 0xfbbf24)
    fillBar.setOrigin(0, 0.5)

    const container = this.scene.add.container(node.position.x, node.position.y, [g, hpBg, fillBar])
    container.setDepth(2)

    return { container, fillBar, maxWidth: barW, maxAmount: node.maxAmount }
  }

  // ─── Tree cluster (wood) ───────────────────────────────────────────────────

  private buildTree(node: ResourceNode): NodeView {
    const g = this.scene.add.graphics()

    // Eight trees scattered in a wide cluster.
    const trees: Array<[number, number, number]> = [
      [-24, -14, 13],
      [  0, -20, 14],
      [ 24, -10, 12],
      [-30,   6, 11],
      [ -6,  10, 15],
      [ 20,  12, 12],
      [-16,  24, 10],
      [ 14,  26, 11],
    ]

    for (const [tx, ty, r] of trees) {
      // Trunk
      g.fillStyle(0x5c3d11)
      g.fillRect(tx - 3, ty + r - 4, 6, 12)
      // Shadow base
      g.fillStyle(0x1a5c1a)
      g.fillCircle(tx, ty, r)
      // Main canopy
      g.fillStyle(0x2d8a27)
      g.fillCircle(tx, ty - 2, r - 1)
      // Highlight
      g.fillStyle(0x4ab83a)
      g.fillCircle(tx - 3, ty - 5, Math.max(4, r - 5))
    }

    const barW = 72
    const hpBg  = this.scene.add.rectangle(0, 48, barW + 4, 6, 0x1f2937)
    const fillBar = this.scene.add.rectangle(-(barW / 2), 48, barW, 4, 0x4ade80)
    fillBar.setOrigin(0, 0.5)

    const container = this.scene.add.container(node.position.x, node.position.y, [g, hpBg, fillBar])
    container.setDepth(2)

    return { container, fillBar, maxWidth: barW, maxAmount: node.maxAmount }
  }

  // ─── Gold mine ─────────────────────────────────────────────────────────────

  private buildMine(node: ResourceNode): NodeView {
    const g = this.scene.add.graphics()

    // Rocky mountain silhouette — larger
    g.fillStyle(0x3a3a4a)
    g.fillTriangle(-50, 28, 50, 28, 0, -40)
    // Secondary face — lighter
    g.fillStyle(0x5a5a6a)
    g.fillTriangle(-14, 28, 50, 28, 34, -16)

    // Gold veins
    g.fillStyle(0xfbbf24)
    g.fillRect(-26, -10, 14, 4)
    g.fillRect(-14,   6, 12, 3)
    g.fillRect( 14, -20, 14, 4)
    g.fillRect( 24,  -4,  9, 3)
    g.fillStyle(0xf59e0b)
    g.fillRect(-20,   0,  9, 3)
    g.fillRect( 18,   6, 12, 3)
    g.fillRect( -8, -18,  8, 3)

    // Mine entrance — dark arch (larger)
    g.fillStyle(0x080808)
    g.fillRect(-14, 0, 28, 28)
    g.fillCircle(0, 0, 14)

    // Wooden entrance frame
    g.fillStyle(0x8b5e3c)
    g.fillRect(-16, -2, 4, 30)   // left post
    g.fillRect( 12, -2, 4, 30)   // right post
    g.fillRect(-16, -2, 32, 4)   // top beam

    // Mine cart tracks
    g.fillStyle(0x5a4a3a)
    g.fillRect(-6, 22, 12, 4)

    const barW = 80
    const hpBg  = this.scene.add.rectangle(0, 42, barW + 4, 6, 0x1f2937)
    const fillBar = this.scene.add.rectangle(-(barW / 2), 42, barW, 4, 0xfbbf24)
    fillBar.setOrigin(0, 0.5)

    const container = this.scene.add.container(node.position.x, node.position.y, [g, hpBg, fillBar])
    container.setDepth(2)

    return { container, fillBar, maxWidth: barW, maxAmount: node.maxAmount }
  }

  // ─── Per-frame update ─────────────────────────────────────────────────────

  private updateView(node: ResourceNode, view: NodeView): void {
    const pct = Math.max(0, node.amount / view.maxAmount)
    view.fillBar.width = Math.max(1, view.maxWidth * pct)
  }
}
