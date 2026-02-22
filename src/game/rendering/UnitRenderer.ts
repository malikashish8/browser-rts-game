import Phaser from 'phaser'
import type { GameState, Unit } from '../core/GameState.ts'
import { playArrowSound, playSpearSound, playMeleeSound, playLanceSound } from '../../audio/sfx.ts'

type UnitVisualState = 'idle' | 'moving' | 'attacking' | 'gathering' | 'sleeping'

interface UnitView {
  container: Phaser.GameObjects.Container
  body: Phaser.GameObjects.Rectangle
  baseBodyColor: number
  unitType: Unit['type']
  ownerId: string
  /** Weapon parts repositioned / rotated during attack. */
  weaponParts: Phaser.GameObjects.Rectangle[]
  /** Health-bar foreground – width scaled to current HP. */
  hpBar: Phaser.GameObjects.Rectangle
  /** Selection ring drawn beneath the unit. */
  selectionRing: Phaser.GameObjects.Graphics
  /** Floating "z z z" shown when a villager sleeps. */
  statusGfx?: Phaser.GameObjects.Text
  lastX: number
  lastY: number
  lastState: UnitVisualState
}

/** A flying arrow projectile (visual only). */
interface Arrow {
  go: Phaser.GameObjects.Container
  startX: number
  startY: number
  endX: number
  endY: number
  elapsed: number   // ms
  duration: number  // ms
  arcH: number      // px, peak arc height
}

// ─── Colour constants ─────────────────────────────────────────────────────────

const SKIN   = 0xfde68a
const SILVER = 0xd4d4d8
const BAR_BG = 0x1f2937

function dark(hex: number): number {
  const r = (hex >> 16) & 0xff
  const g = (hex >> 8)  & 0xff
  const b =  hex        & 0xff
  return ((r * 0.55 | 0) << 16) | ((g * 0.55 | 0) << 8) | (b * 0.55 | 0)
}

// ─── Main class ───────────────────────────────────────────────────────────────

export class UnitRenderer {
  private readonly scene: Phaser.Scene
  private readonly views  = new Map<string, UnitView>()
  private readonly arrows: Arrow[] = []

  constructor(scene: Phaser.Scene) {
    this.scene = scene
  }

  sync(state: GameState, delta = 16, selectedIds: ReadonlySet<string> = new Set()): void {
    const seenIds = new Set<string>()

    for (const unit of state.units) {
      seenIds.add(unit.id)
      const existing = this.views.get(unit.id)
      if (existing) {
        this.updateView(unit, existing, state, selectedIds.has(unit.id))
      } else {
        this.views.set(unit.id, this.createView(unit))
      }
    }

    for (const [id, view] of this.views) {
      if (!seenIds.has(id)) {
        view.container.destroy()
        this.views.delete(id)
      }
    }

    this.tickArrows(delta)
  }

  // ─── Factory ───────────────────────────────────────────────────────────────

  private createView(unit: Unit): UnitView {
    switch (unit.type) {
      case 'villager': return this.buildVillager(unit)
      case 'spearman': return this.buildSpearman(unit)
      case 'archer':   return this.buildArcher(unit)
      case 'horseman': return this.buildHorseman(unit)
    }
  }

  // ── Selection ring helper ─────────────────────────────────────────────────

  private makeRing(radius: number): Phaser.GameObjects.Graphics {
    const g = this.scene.add.graphics()
    // Outer glow (soft, wider)
    g.lineStyle(4, 0x38bdf8, 0.25)
    g.strokeCircle(0, 0, radius + 2)
    // Inner ring (sharp)
    g.lineStyle(2, 0x38bdf8, 0.95)
    g.strokeCircle(0, 0, radius)
    g.setVisible(false)
    return g
  }

  // ── Health-bar helpers ─────────────────────────────────────────────────────

  private makeHpBar(
    unit: Unit,
    barY: number,
  ): { hpBg: Phaser.GameObjects.Rectangle; hpBar: Phaser.GameObjects.Rectangle } {
    const hpBg  = this.scene.add.rectangle(0, barY, 22, 4, BAR_BG)
    const hpBar = this.scene.add.rectangle(-10, barY, 20, 2.5,
      unit.ownerId === 'player' ? 0x4ade80 : 0xef4444)
    hpBar.setOrigin(0, 0.5)
    return { hpBg, hpBar }
  }

  private updateHpBar(unit: Unit, view: UnitView): void {
    const pct = Math.max(0, unit.hp / unit.maxHp)
    view.hpBar.width = Math.max(1, 20 * pct)

    if (unit.ownerId === 'player') {
      // Always green so it's never confused with enemy red bars.
      if (pct > 0.55)      view.hpBar.setFillStyle(0x4ade80)   // bright green
      else if (pct > 0.25) view.hpBar.setFillStyle(0x22c55e)   // mid green
      else                 view.hpBar.setFillStyle(0x15803d)   // dark green
    } else {
      if (pct > 0.55)      view.hpBar.setFillStyle(0xef4444)   // bright red
      else if (pct > 0.25) view.hpBar.setFillStyle(0xb91c1c)   // mid red
      else                 view.hpBar.setFillStyle(0x7f1d1d)   // dark red
    }
  }

  // ─── Villager ──────────────────────────────────────────────────────────────

  private buildVillager(unit: Unit): UnitView {
    const col = unit.ownerId === 'player' ? 0xfbbf24 : 0x9ca3af
    const { hpBg, hpBar } = this.makeHpBar(unit, -27)
    const selectionRing = this.makeRing(11)

    const body   = this.scene.add.rectangle(0, 0, 9, 17, col)
    body.setOrigin(0.5, 0.9)
    const head   = this.scene.add.rectangle(0, -15, 9, 9, SKIN)
    const handle = this.scene.add.rectangle(-7, -10, 2, 14, 0x92400e)
    handle.setAngle(25)
    const blade  = this.scene.add.rectangle(-11, -15, 9, 3, 0x78350f)
    const legL   = this.scene.add.rectangle(-2, 1, 3, 7, dark(col))
    const legR   = this.scene.add.rectangle( 2, 1, 3, 7, dark(col))
    legL.setOrigin(0.5, 0); legR.setOrigin(0.5, 0)

    // Floating "z z z" for sleep state.
    const zzz = this.scene.add.text(8, -30, 'z z z', {
      fontSize: '16px',
      color: '#cbd5e1',
      fontStyle: 'italic',
      fontFamily: 'serif',
    })
    zzz.setVisible(false)

    const container = this.scene.add.container(
      unit.position.x, unit.position.y,
      [selectionRing, legL, legR, body, head, handle, blade, zzz, hpBg, hpBar],
    )
    container.setDepth(10)

    return { container, body, baseBodyColor: col, unitType: 'villager',
      ownerId: unit.ownerId, weaponParts: [handle, blade], hpBar, selectionRing,
      statusGfx: zzz,
      lastX: unit.position.x, lastY: unit.position.y, lastState: 'idle' }
  }

  // ─── Spearman ──────────────────────────────────────────────────────────────

  private buildSpearman(unit: Unit): UnitView {
    const col    = unit.ownerId === 'player' ? 0x60a5fa : 0xf97316
    const armour = dark(col)
    const shield = unit.ownerId === 'player' ? 0x1e40af : 0x9a3412
    const { hpBg, hpBar } = this.makeHpBar(unit, -35)
    const selectionRing = this.makeRing(13)

    const shieldRect = this.scene.add.rectangle(-11, -10, 7, 15, shield)
    const body       = this.scene.add.rectangle(0, 0, 13, 20, col)
    body.setOrigin(0.5, 0.9)
    const chest  = this.scene.add.rectangle(0, -11, 13, 6, armour)
    const head   = this.scene.add.rectangle(0, -21, 10, 10, SKIN)
    const helmet = this.scene.add.rectangle(0, -27, 13, 5, armour)

    // Spear: pivots at its bottom so we can angle it toward enemies.
    const spear  = this.scene.add.rectangle(9, -22, 2, 28, SILVER)
    spear.setOrigin(0.5, 1)
    const tip    = this.scene.add.rectangle(9, -50, 5, 6, 0xe8e8e8)

    const legL = this.scene.add.rectangle(-2, 1, 4, 8, dark(col))
    const legR = this.scene.add.rectangle( 3, 1, 4, 8, dark(col))
    legL.setOrigin(0.5, 0); legR.setOrigin(0.5, 0)

    const container = this.scene.add.container(
      unit.position.x, unit.position.y,
      [selectionRing, shieldRect, legL, legR, body, chest, head, helmet, spear, tip, hpBg, hpBar],
    )
    container.setDepth(10)

    return { container, body, baseBodyColor: col, unitType: 'spearman',
      ownerId: unit.ownerId, weaponParts: [spear, tip], hpBar, selectionRing,
      lastX: unit.position.x, lastY: unit.position.y, lastState: 'idle' }
  }

  // ─── Archer ────────────────────────────────────────────────────────────────

  private buildArcher(unit: Unit): UnitView {
    const col  = unit.ownerId === 'player' ? 0x22c55e : 0xfacc15
    const hood = dark(col)
    const { hpBg, hpBar } = this.makeHpBar(unit, -28)
    const selectionRing = this.makeRing(11)

    const body    = this.scene.add.rectangle(0, 0, 8, 17, col)
    body.setOrigin(0.5, 0.9)
    const head    = this.scene.add.rectangle(0, -15, 9, 9, SKIN)
    const hoodCap = this.scene.add.rectangle(0, -19, 10, 5, hood)

    const bow = this.scene.add.graphics()
    bow.lineStyle(3, 0xc4a35a)
    bow.beginPath()
    bow.arc(10, -12, 10, -Math.PI * 0.44, Math.PI * 0.44, false)
    bow.strokePath()

    const bowstring = this.scene.add.rectangle(18, -12, 1, 18, 0xf5f5f5)
    bowstring.setOrigin(0.5, 0.5)
    // Arrow on the bow (the "nocked" arrow before release)
    const nocked = this.scene.add.rectangle(13, -12, 14, 1, 0xc4a35a)
    nocked.setOrigin(0, 0.5)

    const legL = this.scene.add.rectangle(-2, 1, 3, 7, dark(col))
    const legR = this.scene.add.rectangle( 2, 1, 3, 7, dark(col))
    legL.setOrigin(0.5, 0); legR.setOrigin(0.5, 0)

    const container = this.scene.add.container(
      unit.position.x, unit.position.y,
      [selectionRing, legL, legR, body, head, hoodCap, bow, bowstring, nocked, hpBg, hpBar],
    )
    container.setDepth(10)

    return { container, body, baseBodyColor: col, unitType: 'archer',
      ownerId: unit.ownerId, weaponParts: [nocked, bowstring], hpBar, selectionRing,
      lastX: unit.position.x, lastY: unit.position.y, lastState: 'idle' }
  }

  // ─── Horseman ──────────────────────────────────────────────────────────────

  private buildHorseman(unit: Unit): UnitView {
    const riderCol = unit.ownerId === 'player' ? 0xf97316 : 0xef4444
    const armour   = dark(riderCol)
    const horse    = 0xc8965c
    const horseDk  = 0xa07040
    const { hpBg, hpBar } = this.makeHpBar(unit, -40)
    const selectionRing = this.makeRing(16)

    const legXs = [-8, -3, 3, 8]
    const legs  = legXs.map(x => {
      const l = this.scene.add.rectangle(x, 4, 3, 13, horseDk)
      l.setOrigin(0.5, 0)
      return l
    })

    const horseBody = this.scene.add.rectangle(1, -6, 22, 12, horse)
    const horseNeck = this.scene.add.rectangle(-9, -14, 7, 11, horse)
    horseNeck.setAngle(-15)
    const horseHead = this.scene.add.rectangle(-15, -21, 10, 8, horse)
    const ear       = this.scene.add.rectangle(-18, -26, 4, 5, horseDk)
    const eye       = this.scene.add.rectangle(-18, -21, 2, 2, 0x1a1a2e)

    const body  = this.scene.add.rectangle(4, -18, 11, 13, riderCol)
    body.setOrigin(0.5, 1)
    const plate = this.scene.add.rectangle(4, -21, 11, 5, armour)
    const head  = this.scene.add.rectangle(4, -25, 10, 9, SKIN)
    const helm  = this.scene.add.rectangle(4, -30, 12, 5, armour)

    // Lance – extends right; origin at its left end so rotation looks natural.
    const lance    = this.scene.add.rectangle(10, -22, 30, 2, SILVER)
    lance.setOrigin(0, 0.5)
    const lanceTip = this.scene.add.rectangle(40, -22, 6, 5, 0xe8e8e8)
    lanceTip.setOrigin(0, 0.5)

    const all = [selectionRing, ...legs, horseBody, horseNeck, horseHead, ear, eye,
                 body, plate, head, helm, lance, lanceTip, hpBg, hpBar]
    const container = this.scene.add.container(unit.position.x, unit.position.y, all)
    container.setDepth(10)

    return { container, body, baseBodyColor: riderCol, unitType: 'horseman',
      ownerId: unit.ownerId, weaponParts: [lance, lanceTip], hpBar, selectionRing,
      lastX: unit.position.x, lastY: unit.position.y, lastState: 'idle' }
  }

  // ─── Per-frame update ─────────────────────────────────────────────────────

  private updateView(unit: Unit, view: UnitView, state: GameState, selected = false): void {
    const dx = unit.position.x - view.lastX
    const dy = unit.position.y - view.lastY
    const movedDistance = Math.hypot(dx, dy)

    view.container.setPosition(unit.position.x, unit.position.y)
    view.lastX = unit.position.x
    view.lastY = unit.position.y

    const visualState = this.deriveVisualState(unit, movedDistance)

    // Reset each frame.
    view.container.setAngle(0)
    view.body.setFillStyle(view.baseBodyColor)
    view.weaponParts.forEach((w, i) => { w.setAngle(0); w.setPosition(...this.defaultWeaponPos(view.unitType, w, i)) })

    // Hide Zzz by default each frame (villager sleeping will re-show it below).
    if (view.statusGfx) view.statusGfx.setVisible(false)

    if (visualState === 'moving') {
      const angleDeg = (Math.atan2(dy, dx) * 180) / Math.PI
      view.container.setAngle(angleDeg * 0.12)
      view.container.y += Math.sin(this.scene.time.now / 110) * 1.5

    } else if (visualState === 'attacking') {
      view.body.setFillStyle(0xef4444)
      const enemy = this.nearestEnemy(unit, state)

      switch (view.unitType) {
        case 'spearman': this.animateSpear(view, unit, enemy);  break
        case 'horseman': this.animateLance(view, unit, enemy);  break
        case 'villager': view.weaponParts[0]?.setAngle(50);     break
        case 'archer':   /* bow draw-back handled below */       break
      }

      // Archer: draw bow back (pull nocked arrow left) and spawn projectile on transition.
      if (view.unitType === 'archer') {
        const nocked = view.weaponParts[0]
        if (nocked) {
          nocked.x = 9   // pulled back from default 13
          nocked.scaleX = 0.7
        }
        if (visualState === 'attacking' && view.lastState !== 'attacking' && enemy) {
          this.spawnArrow(unit.position.x + 18, unit.position.y - 12,
                          enemy.position.x, enemy.position.y)
        }
      }

    } else if (visualState === 'gathering') {
      // Rhythmic chopping / working motion.
      const t = this.scene.time.now
      const swing = Math.sin(t / 180) * 35
      const [handle, blade] = view.weaponParts
      if (handle) handle.setAngle(25 + swing)
      if (blade)  blade.setAngle(swing * 0.6)
      // Body bob in sync with swings.
      view.container.y += Math.sin(t / 180) * 1.2

    } else if (visualState === 'sleeping') {
      // Leaning / resting posture.
      view.container.setAngle(-12)
      view.container.y += Math.sin(this.scene.time.now / 800) * 1.5

      // Floating "z z z" drifts upward and fades in a loop.
      if (view.statusGfx) {
        view.statusGfx.setVisible(true)
        const cycle = (this.scene.time.now % 2500) / 2500
        view.statusGfx.setPosition(10, -32 - cycle * 26)
        view.statusGfx.setAlpha(0.95 - cycle * 0.85)
        view.statusGfx.setScale(0.8 + cycle * 0.4)
      }
    }

    if (visualState === 'attacking' && view.lastState !== 'attacking') {
      switch (view.unitType) {
        case 'spearman': playSpearSound();  break
        case 'horseman': playLanceSound();  break
        case 'villager': playMeleeSound();  break
        // archer sound plays on arrow spawn below
      }
    }

    view.selectionRing.setVisible(selected)
    this.updateHpBar(unit, view)
    view.lastState = visualState
  }

  // ── Attack animations ─────────────────────────────────────────────────────

  private animateSpear(view: UnitView, unit: Unit, enemy: Unit | null): void {
    if (!enemy) { for (const w of view.weaponParts) w.setAngle(30); return }

    const dx = enemy.position.x - unit.position.x
    const dy = enemy.position.y - unit.position.y
    const angle = Math.atan2(dy, dx) * (180 / Math.PI)

    // Lean container toward the enemy so the spear points that way.
    view.container.setAngle(Phaser.Math.Clamp(angle * 0.25, -35, 35))
    // Thrust: tip the spear shaft forward.
    const [spear, tip] = view.weaponParts
    const thrust = Phaser.Math.Clamp(angle * 0.5, -60, 60)
    spear?.setAngle(thrust)
    tip?.setAngle(thrust)
  }

  private animateLance(view: UnitView, unit: Unit, enemy: Unit | null): void {
    if (!enemy) { for (const w of view.weaponParts) w.setAngle(-15); return }

    const dx = enemy.position.x - unit.position.x
    const dy = enemy.position.y - unit.position.y
    const angle = Math.atan2(dy, dx) * (180 / Math.PI)

    // Point lance in the direction of the enemy (clamped to avoid
    // flipping it completely if enemy is behind).
    const lanceAngle = Phaser.Math.Clamp(angle, -35, 35)
    for (const w of view.weaponParts) w.setAngle(lanceAngle)
    view.container.setAngle(Phaser.Math.Clamp(angle * 0.1, -12, 12))
  }

  // ── Weapon position reset helpers ────────────────────────────────────────

  /** Returns the [x, y] that a weapon part should be reset to each frame. */
  private defaultWeaponPos(type: Unit['type'], _w: Phaser.GameObjects.Rectangle, index: number): [number, number] {
    if (type === 'archer') return [13, -12]
    // Villager: handle at index 0, blade at index 1.
    if (type === 'villager') return index === 0 ? [-7, -10] : [-11, -15]
    return [_w.x, _w.y]   // no-op for other types
  }

  // ─── Arrow projectiles ────────────────────────────────────────────────────

  private spawnArrow(fromX: number, fromY: number, toX: number, toY: number): void {
    playArrowSound()

    const dist = Math.hypot(toX - fromX, toY - fromY)

    // Arrow container: shaft + head, pointing right at angle 0.
    const shaft = this.scene.add.rectangle(0, 0, 18, 2, 0xc4a35a)
    shaft.setOrigin(0.5, 0.5)
    const head  = this.scene.add.rectangle(9, 0, 7, 4, 0xd4d4d8)
    head.setOrigin(0, 0.5)

    const go = this.scene.add.container(fromX, fromY, [shaft, head])
    go.setDepth(20)

    const duration = Phaser.Math.Clamp(dist * 1.8, 150, 600)
    this.arrows.push({ go, startX: fromX, startY: fromY,
      endX: toX, endY: toY, elapsed: 0, duration,
      arcH: dist * 0.18 })
  }

  private tickArrows(delta: number): void {
    for (let i = this.arrows.length - 1; i >= 0; i--) {
      const a = this.arrows[i]
      a.elapsed += delta
      const t = Math.min(a.elapsed / a.duration, 1)

      // Parabolic arc position.
      const x = a.startX + (a.endX - a.startX) * t
      const y = a.startY + (a.endY - a.startY) * t - a.arcH * Math.sin(t * Math.PI)
      a.go.setPosition(x, y)

      // Rotate to match the tangent of the arc so the tip always leads.
      const vx = a.endX - a.startX
      const vy = (a.endY - a.startY) - a.arcH * Math.PI * Math.cos(t * Math.PI)
      a.go.setAngle(Math.atan2(vy, vx) * (180 / Math.PI))

      if (t >= 1) {
        a.go.destroy()
        this.arrows.splice(i, 1)
      }
    }
  }

  // ─── Utilities ────────────────────────────────────────────────────────────

  private nearestEnemy(unit: Unit, state: GameState): Unit | null {
    let nearest: Unit | null = null
    let nearestDist = Infinity
    for (const u of state.units) {
      if (u.ownerId === unit.ownerId) continue
      const d = Math.hypot(u.position.x - unit.position.x, u.position.y - unit.position.y)
      if (d < nearestDist) { nearestDist = d; nearest = u }
    }
    return nearest
  }

  private deriveVisualState(unit: Unit, movedDistance: number): UnitVisualState {
    if (unit.attackCooldown > 0 || unit.currentOrder.type === 'attackMove') return 'attacking'
    if (unit.currentOrder.type === 'move' && unit.currentOrder.targetPosition && movedDistance > 0.5) return 'moving'
    // Villager-specific: gathering when assigned to a resource, sleeping when idle.
    if (unit.type === 'villager') {
      if (unit.resourceAssignment !== null) return 'gathering'
      return 'sleeping'
    }
    return 'idle'
  }
}
