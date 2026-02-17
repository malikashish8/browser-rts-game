import type { GameState, Resources, Unit, UnitType, Vec2 } from './GameState.ts'

export interface GameSystems {
  /**
   * Periodic resource collection and income.
   */
  resource: ResourceSystem
  /**
   * Spawning helper utilities (starting armies, scripted waves, etc.).
   */
  spawning: SpawningSystem
  /**
   * Movement resolution for units following orders.
   */
  movement: MovementSystem
  /**
   * Combat resolution (target acquisition, damage application).
   */
  combat: CombatSystem
  /**
   * Top-level update hook that advances the entire simulation by dtSeconds.
   */
  updateAll: (state: GameState, dtSeconds: number) => GameState
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

const RESOURCE_INCOME_PER_VILLAGER: Record<string, Resources> = {
  food: { food: 0.8, wood: 0, gold: 0 },
  wood: { food: 0, wood: 0.7, gold: 0 },
  gold: { food: 0, wood: 0, gold: 0.5 },
}

function cloneResources(r: Resources): Resources {
  return { food: r.food, wood: r.wood, gold: r.gold }
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
      // Simple placeholder: each villager contributes fixed income to food.
      const villagers = state.units.filter((u) => u.type === 'villager')
      if (villagers.length === 0) {
        return state
      }

      const next = structuredClone(state) as GameState
      const player = next.players.find((p) => p.id === 'player')
      if (!player) {
        return state
      }

      const incomePerSecond: Resources = cloneResources(
        RESOURCE_INCOME_PER_VILLAGER.food,
      )
      const totalIncome = addResources(
        { food: 0, wood: 0, gold: 0 },
        incomePerSecond,
        villagers.length,
      )

      player.resources = addResources(player.resources, totalIncome, dtSeconds)
      return next
    },
  }
}

function spawnUnit(
  ownerId: string,
  type: UnitType,
  position: Vec2,
  idSeed: number,
): Unit {
  const baseStats: Record<
    UnitType,
    {
      hp: number
      maxHp: number
      attack: number
      armor: number
      range: number
      speed: number
      attackCooldown: number
    }
  > = {
    villager: {
      hp: 40,
      maxHp: 40,
      attack: 2,
      armor: 0,
      range: 10,
      speed: 80,
      attackCooldown: 0,
    },
    spearman: {
      hp: 60,
      maxHp: 60,
      attack: 8,
      armor: 1,
      range: 18,
      speed: 70,
      attackCooldown: 0,
    },
    archer: {
      hp: 40,
      maxHp: 40,
      attack: 7,
      armor: 0,
      range: 120,
      speed: 75,
      attackCooldown: 0,
    },
    horseman: {
      hp: 80,
      maxHp: 80,
      attack: 10,
      armor: 1,
      range: 24,
      speed: 110,
      attackCooldown: 0,
    },
  }

  const stats = baseStats[type]

  return {
    id: `${ownerId}-${type}-${idSeed}`,
    ownerId,
    type,
    position: { ...position },
    hp: stats.hp,
    maxHp: stats.maxHp,
    attack: stats.attack,
    armor: stats.armor,
    range: stats.range,
    speed: stats.speed,
    currentOrder: { type: 'idle' },
    attackCooldown: stats.attackCooldown,
  }
}

function createSpawningSystem(): SpawningSystem {
  return {
    spawnInitialArmy(state: GameState): GameState {
      const next = structuredClone(state) as GameState
      let idSeed = 0

      const center: Vec2 = {
        x: next.world.width * 0.3,
        y: next.world.height * 0.6,
      }

      const playerUnits: Unit[] = []
      for (let i = 0; i < 3; i += 1) {
        playerUnits.push(
          spawnUnit(
            'player',
            'spearman',
            { x: center.x - 40 + i * 20, y: center.y },
            (idSeed += 1),
          ),
        )
      }
      for (let i = 0; i < 3; i += 1) {
        playerUnits.push(
          spawnUnit(
            'player',
            'archer',
            { x: center.x - 40 + i * 20, y: center.y + 40 },
            (idSeed += 1),
          ),
        )
      }
      for (let i = 0; i < 2; i += 1) {
        playerUnits.push(
          spawnUnit(
            'player',
            'horseman',
            { x: center.x - 20 + i * 40, y: center.y - 40 },
            (idSeed += 1),
          ),
        )
      }

      next.units.push(...playerUnits)
      return next
    },
  }
}

function createMovementSystem(): MovementSystem {
  return {
    update(state: GameState, dtSeconds: number): GameState {
      const next = structuredClone(state) as GameState

      for (const unit of next.units) {
        if (unit.currentOrder.type !== 'move' || !unit.currentOrder.targetPosition) {
          continue
        }

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
        unit.position.x = nx
        unit.position.y = ny
      }

      return next
    },
  }
}

function createCombatSystem(): CombatSystem {
  return {
    update(state: GameState, dtSeconds: number): GameState {
      // Simple placeholder that only decrements attackCooldown timers for now.
      const next = structuredClone(state) as GameState

      for (const unit of next.units) {
        if (unit.attackCooldown > 0) {
          unit.attackCooldown = Math.max(0, unit.attackCooldown - dtSeconds)
        }
      }

      return next
    },
  }
}

export function createSystems(): GameSystems {
  const resource = createResourceSystem()
  const spawning = createSpawningSystem()
  const movement = createMovementSystem()
  const combat = createCombatSystem()

  return {
    resource,
    spawning,
    movement,
    combat,
    updateAll(state: GameState, dtSeconds: number): GameState {
      let next = state

      // Increase global time.
      next = {
        ...next,
        time: next.time + dtSeconds,
      }

      // Apply resource income first.
      next = resource.applyIncome(next, dtSeconds)

      // Then movement (positions updated according to orders).
      next = movement.update(next, dtSeconds)

      // Finally combat (cooldowns, damage in future iterations).
      next = combat.update(next, dtSeconds)

      return next
    },
  }
}

