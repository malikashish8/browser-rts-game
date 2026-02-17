export type ResourceType = 'food' | 'wood' | 'gold'

export interface Resources {
  food: number
  wood: number
  gold: number
}

export type UnitType = 'spearman' | 'archer' | 'horseman' | 'villager'

export interface Vec2 {
  x: number
  y: number
}

export type UnitOrderType = 'idle' | 'move' | 'attackMove'

export interface UnitOrder {
  type: UnitOrderType
  targetPosition?: Vec2
  targetUnitId?: string
}

export interface Unit {
  id: string
  type: UnitType
  ownerId: string
  position: Vec2
  hp: number
  maxHp: number
  attack: number
  armor: number
  range: number
  speed: number
  currentOrder: UnitOrder
  attackCooldown: number
}

export type BuildingType =
  | 'townCenter'
  | 'barracks'
  | 'archeryRange'
  | 'stables'

export interface ProductionQueueItem {
  unitType: UnitType
  remainingTime: number
}

export interface Building {
  id: string
  type: BuildingType
  ownerId: string
  position: Vec2
  hp: number
  maxHp: number
  isCompleted: boolean
  buildProgress: number
  queue: ProductionQueueItem[]
}

export type AgeId = 'dark' | 'feudal' | 'castle' | 'imperial'

export interface PlayerState {
  id: string
  name: string
  resources: Resources
  currentAge: AgeId
}

export interface WorldConfig {
  width: number
  height: number
}

/**
 * A serialisable structure that fully describes the game world.
 */
export interface GameState {
  world: WorldConfig
  players: PlayerState[]
  units: Unit[]
  buildings: Building[]
  time: number
}

export function createInitialGameState(): GameState {
  const world: WorldConfig = { width: 1280, height: 720 }

  const player: PlayerState = {
    id: 'player',
    name: 'Player',
    resources: {
      food: 200,
      wood: 200,
      gold: 100,
    },
    currentAge: 'dark',
  }

  const ai: PlayerState = {
    id: 'ai',
    name: 'AI',
    resources: {
      food: 200,
      wood: 200,
      gold: 100,
    },
    currentAge: 'dark',
  }

  return {
    world,
    players: [player, ai],
    units: [],
    buildings: [],
    time: 0,
  }
}

