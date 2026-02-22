import type { GameState, Resources, Unit, UnitType, Vec2 } from './GameState.ts'

export interface GameSystems {
  resource: ResourceSystem
  spawning: SpawningSystem
  movement: MovementSystem
  combat: CombatSystem
  ai: AISystem
  updateAll: (state: GameState, dtSeconds: number) => GameState
}

export interface AISystem {
  update(state: GameState, dtSeconds: number): GameState
}

export interface ResourceSystem {
  applyIncome(state: GameState, dtSeconds: number): GameState
}

export interface SpawningSystem {
  spawnInitialArmy(state: GameState): GameState
}

export interface MovementSystem {
  update(state: GameState, dtSeconds: number): GameState
}

export interface CombatSystem {
  update(state: GameState, dtSeconds: number): GameState
}

/** Income per second for one villager actively gathering at a node. */
const RESOURCE_INCOME_PER_VILLAGER: Record<string, Resources> = {
  food: { food: 0.8, wood: 0, gold: 0 },
  wood: { food: 0, wood: 0.7, gold: 0 },
  gold: { food: 0, wood: 0, gold: 0.5 },
}

/** Villager must be within this many pixels of a node to gather from it. */
const GATHER_RANGE = 150

function getUnitRadius(unit: Unit): number {
  switch (unit.type) {
    case 'horseman': return 14
    case 'spearman':
    case 'archer':   return 9
    case 'villager':
    default:         return 8
  }
}

function addResources(a: Resources, b: Resources, factor = 1): Resources {
  return {
    food: a.food + b.food * factor,
    wood: a.wood + b.wood * factor,
    gold: a.gold + b.gold * factor,
  }
}

function createResourceSystem(): ResourceSystem {
  return {
    applyIncome(state: GameState, dtSeconds: number): GameState {
      const hasVillager = state.units.some((u) => u.type === 'villager' && u.ownerId === 'player')
      if (!hasVillager) return state

      const next = structuredClone(state) as GameState
      const player = next.players.find((p) => p.id === 'player')
      if (!player) return state

      for (const villager of next.units) {
        if (villager.type !== 'villager' || villager.ownerId !== 'player') continue

        // ── Auto-assign: if unassigned & idle near a node, start gathering it ──
        if (!villager.resourceAssignment && villager.currentOrder.type === 'idle') {
          for (const node of next.resourceNodes) {
            if (node.amount <= 0) continue
            const d = Math.hypot(node.position.x - villager.position.x, node.position.y - villager.position.y)
            if (d <= GATHER_RANGE) {
              villager.resourceAssignment = node.type
              villager.gatherTargetNodeId = node.id
              break
            }
          }
        }

        // Auto-assign if stuck/blocked (has move order but VERY close to a resource)
        if (!villager.resourceAssignment && villager.currentOrder.type === 'move') {
          for (const node of next.resourceNodes) {
            if (node.amount <= 0) continue
            const d = Math.hypot(node.position.x - villager.position.x, node.position.y - villager.position.y)
            if (d <= 40) {  // Only if extremely close (indicates blocked/stuck)
              villager.resourceAssignment = node.type
              villager.gatherTargetNodeId = node.id
              break
            }
          }
        }

        if (!villager.resourceAssignment) continue

        const resType = villager.resourceAssignment

        // Prefer previously assigned node (stickiness), else pick nearest non-depleted match.
        let targetNode = next.resourceNodes.find(
          (n) => n.id === villager.gatherTargetNodeId && n.type === resType && n.amount > 0,
        )
        if (!targetNode) {
          let minDist = Infinity
          for (const n of next.resourceNodes) {
            if (n.type !== resType || n.amount <= 0) continue
            const d = Math.hypot(n.position.x - villager.position.x, n.position.y - villager.position.y)
            if (d < minDist) { minDist = d; targetNode = n }
          }
        }
        if (!targetNode) continue

        villager.gatherTargetNodeId = targetNode.id

        const dist = Math.hypot(
          targetNode.position.x - villager.position.x,
          targetNode.position.y - villager.position.y,
        )

        if (dist <= GATHER_RANGE) {
          // At the node — gather.
          const income = RESOURCE_INCOME_PER_VILLAGER[resType]
          player.resources = addResources(player.resources, income, dtSeconds)
          targetNode.amount = Math.max(0, targetNode.amount - (income.food + income.wood + income.gold) * dtSeconds)
          villager.currentOrder = { type: 'idle' }
        } else {
          // Walk to the node if not already heading there.
          const alreadyMovingThere =
            villager.currentOrder.type === 'move' &&
            villager.currentOrder.targetPosition != null &&
            Math.hypot(
              villager.currentOrder.targetPosition.x - targetNode.position.x,
              villager.currentOrder.targetPosition.y - targetNode.position.y,
            ) < 5
          if (!alreadyMovingThere) {
            villager.currentOrder = { type: 'move', targetPosition: { ...targetNode.position } }
          }
        }
      }

      // Remove fully depleted nodes.
      next.resourceNodes = next.resourceNodes.filter((n) => n.amount > 0)

      return next
    },
  }
}

const BASE_STATS: Record<
  UnitType,
  { hp: number; attack: number; armor: number; range: number; speed: number; sightRange: number }
> = {
  villager: { hp: 40,  attack: 2,  armor: 0, range: 10,  speed: 80,  sightRange: 100 },
  spearman: { hp: 60,  attack: 8,  armor: 1, range: 18,  speed: 70,  sightRange: 120 },
  archer:   { hp: 40,  attack: 7,  armor: 0, range: 120, speed: 75,  sightRange: 150 },
  horseman: { hp: 80,  attack: 10, armor: 1, range: 24,  speed: 110, sightRange: 140 },
}

/** Creates a new unit with sensible defaults. Exported so GameClient can use it. */
export function spawnUnit(
  ownerId: string,
  type: UnitType,
  position: Vec2,
  idSeed: number,
): Unit {
  const s = BASE_STATS[type]
  return {
    id: `${ownerId}-${type}-${idSeed}`,
    ownerId,
    type,
    position: { ...position },
    hp: s.hp,
    maxHp: s.hp,
    attack: s.attack,
    armor: s.armor,
    range: s.range,
    speed: s.speed,
    currentOrder: { type: 'idle' },
    attackCooldown: 0,
    resourceAssignment: null,
    gatherTargetNodeId: null,
    sightRange: s.sightRange,
  }
}

function createSpawningSystem(): SpawningSystem {
  return {
    spawnInitialArmy(state: GameState): GameState {
      const next = structuredClone(state) as GameState
      let idSeed = 0

      const midY = next.world.height * 0.5

      // Player: villagers far LEFT near resources, soldiers distinctly to the right.
      const playerVillagerX = next.world.width * 0.10   // ~128 px
      for (let i = 0; i < 3; i++) {
        next.units.push(
          spawnUnit('player', 'villager', { x: playerVillagerX + i * 25, y: midY - 20 + i * 20 }, (idSeed += 1)),
        )
      }

      // Enemy: 6 villagers, 2 assigned to each resource (food, wood, gold)
      const aiVillagerX = next.world.width * 0.90  // Near right edge resources

      // 2 villagers at farm (food) - y: 120
      for (let i = 0; i < 2; i++) {
        const villager = spawnUnit('ai', 'villager', { x: aiVillagerX + i * 20 - 10, y: 120 + i * 15 }, (idSeed += 1))
        villager.resourceAssignment = 'food'
        villager.gatherTargetNodeId = 'farm-R'
        next.units.push(villager)
      }

      // 2 villagers at trees (wood) - y: 360
      for (let i = 0; i < 2; i++) {
        const villager = spawnUnit('ai', 'villager', { x: aiVillagerX + i * 20 - 10, y: 360 + i * 15 }, (idSeed += 1))
        villager.resourceAssignment = 'wood'
        villager.gatherTargetNodeId = 'tree-R'
        next.units.push(villager)
      }

      // 2 villagers at mine (gold) - y: 600
      for (let i = 0; i < 2; i++) {
        const villager = spawnUnit('ai', 'villager', { x: aiVillagerX + i * 20 - 10, y: 600 + i * 15 }, (idSeed += 1))
        villager.resourceAssignment = 'gold'
        villager.gatherTargetNodeId = 'mine-R'
        next.units.push(villager)
      }

      return next
    },
  }
}

function createMovementSystem(): MovementSystem {
  return {
    update(state: GameState, dtSeconds: number): GameState {
      const next = structuredClone(state) as GameState

      for (const unit of next.units) {
        if (unit.currentOrder.type !== 'move' || !unit.currentOrder.targetPosition) continue

        const { x: tx, y: ty } = unit.currentOrder.targetPosition
        const dx = tx - unit.position.x
        const dy = ty - unit.position.y
        const distance = Math.hypot(dx, dy)

        if (distance < 1) {
          unit.position.x = tx
          unit.position.y = ty
          unit.currentOrder = { type: 'idle' }
          continue
        }

        const maxStep = unit.speed * dtSeconds
        const step = Math.min(maxStep, distance)
        const nx = unit.position.x + (dx / distance) * step
        const ny = unit.position.y + (dy / distance) * step

        const radius = getUnitRadius(unit)
        let blocked = false
        const epsilon = 1e-6

        for (const other of state.units) {
          if (other.id === unit.id) continue
          const sumRadius = radius + getUnitRadius(other)
          const cdx = unit.position.x - other.position.x
          const cdy = unit.position.y - other.position.y
          const currentDist = Math.hypot(cdx, cdy)
          const odx = nx - other.position.x
          const ody = ny - other.position.y
          const nextDist = Math.hypot(odx, ody)

          if (currentDist >= sumRadius && nextDist < sumRadius) { blocked = true; break }
          if (currentDist < sumRadius && nextDist <= currentDist + epsilon) { blocked = true; break }
        }

        if (!blocked) {
          unit.position.x = nx
          unit.position.y = ny
        }
      }

      return next
    },
  }
}

function createAISystem(): AISystem {
  let nextUnitId = 5000
  let spawnTimer = 0

  return {
    update(state: GameState, dtSeconds: number): GameState {
      spawnTimer += dtSeconds
      if (spawnTimer < 3) return state  // Spawn every 3 seconds

      spawnTimer = 0
      const next = structuredClone(state) as GameState
      const ai = next.players.find((p) => p.id === 'ai')
      if (!ai) return state

      // Random unit selection from affordable options
      const { food, wood, gold } = ai.resources

      // Check which units are affordable
      const affordable: Array<{ type: UnitType; cost: Partial<Resources> }> = []

      if (food >= 50 && wood >= 30) {
        affordable.push({ type: 'spearman', cost: { food: 50, wood: 30 } })
      }
      if (food >= 35 && wood >= 45) {
        affordable.push({ type: 'archer', cost: { food: 35, wood: 45 } })
      }
      if (food >= 70 && gold >= 40) {
        affordable.push({ type: 'horseman', cost: { food: 70, gold: 40 } })
      }

      if (affordable.length === 0) return state  // Not enough resources

      // Randomly pick one of the affordable units
      const choice = affordable[Math.floor(Math.random() * affordable.length)]
      const unitType = choice.type
      const cost = choice.cost

      // Deduct resources
      ai.resources.food -= cost.food ?? 0
      ai.resources.wood -= cost.wood ?? 0
      ai.resources.gold -= cost.gold ?? 0

      // Spawn near center-right
      const spawnX = next.world.width * 0.70
      const spawnY = next.world.height * 0.5 + (Math.random() - 0.5) * 60

      const newUnit = spawnUnit('ai', unitType, { x: spawnX, y: spawnY }, (nextUnitId += 1))
      next.units.push(newUnit)

      return next
    },
  }
}

function createCombatSystem(): CombatSystem {
  return {
    update(state: GameState, dtSeconds: number): GameState {
      const next = structuredClone(state) as GameState

      for (const unit of next.units) {
        // Military units (spearman, archer, horseman) auto-engage enemies
        const isMilitary = unit.type !== 'villager'

        if (unit.attackCooldown > 0) {
          unit.attackCooldown = Math.max(0, unit.attackCooldown - dtSeconds)
          if (!isMilitary) continue  // Villagers don't pursue
        }

        const enemies = next.units.filter((u) => u.ownerId !== unit.ownerId)
        let closest: Unit | null = null
        let closestDist = Number.POSITIVE_INFINITY

        for (const enemy of enemies) {
          const dist = Math.hypot(enemy.position.x - unit.position.x, enemy.position.y - unit.position.y)
          if (dist < closestDist) { closestDist = dist; closest = enemy }
        }

        if (!closest) continue

        // Enemy in attack range - stay and attack
        if (closestDist <= unit.range) {
          // Stop moving, focus on attacking
          if (unit.currentOrder.type === 'move') {
            unit.currentOrder = { type: 'idle' }
          }

          // Attack if cooldown is ready
          if (unit.attackCooldown === 0) {
            const dmg = Math.max(1, unit.attack - closest.armor)
            closest.hp -= dmg
            unit.attackCooldown = 1
          }
        }
        // Enemy out of range but visible - pursue (military units only)
        else if (isMilitary && closestDist <= unit.sightRange) {
          // Only update move order if not already moving toward this enemy
          const shouldPursue =
            unit.currentOrder.type === 'idle' ||
            (unit.currentOrder.type === 'move' &&
             unit.currentOrder.targetPosition &&
             Math.hypot(
               unit.currentOrder.targetPosition.x - closest.position.x,
               unit.currentOrder.targetPosition.y - closest.position.y
             ) > 20)  // Update target if enemy moved significantly

          if (shouldPursue) {
            unit.currentOrder = { type: 'move', targetPosition: { ...closest.position } }
          }
        }
      }

      next.units = next.units.filter((u) => u.hp > 0)
      return next
    },
  }
}

export function createSystems(): GameSystems {
  const resource = createResourceSystem()
  const spawning = createSpawningSystem()
  const movement = createMovementSystem()
  const combat = createCombatSystem()
  const ai = createAISystem()

  return {
    resource,
    spawning,
    movement,
    combat,
    ai,
    updateAll(state: GameState, dtSeconds: number): GameState {
      let next = { ...state, time: state.time + dtSeconds }
      next = resource.applyIncome(next, dtSeconds)
      next = ai.update(next, dtSeconds)
      next = movement.update(next, dtSeconds)
      next = combat.update(next, dtSeconds)
      return next
    },
  }
}
