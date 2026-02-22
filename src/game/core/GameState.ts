export type ResourceType = 'food' | 'wood' | 'gold'

export interface Resources {
  food: number
  wood: number
  gold: number
}

export interface Vec2 {
  x: number
  y: number
}

export interface ResourceNode {
  id: string
  type: ResourceType
  position: Vec2
  amount: number
  maxAmount: number
}

export type UnitType = 'spearman' | 'archer' | 'horseman' | 'villager'

/** Resource cost to train one unit. */
export const UNIT_COSTS: Record<UnitType, Partial<Resources>> = {
  villager: { food: 50 },
  spearman: { food: 50, wood: 30 },
  archer: { food: 35, wood: 45 },
  horseman: { food: 70, gold: 40 },
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
  /** Which resource this villager is currently gathering. null = idle. */
  resourceAssignment: ResourceType | null
  /** ID of the resource node this villager is walking to / gathering from. */
  gatherTargetNodeId: string | null
  /** How far this unit can see (pixels). */
  sightRange: number
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
  resourceNodes: ResourceNode[]
  time: number
}

export function createInitialGameState(): GameState {
  const world: WorldConfig = { width: 1280, height: 720 }

  const player: PlayerState = {
    id: 'player',
    name: 'Player',
    resources: {
      food: 200,
      wood: 150,
      gold: 50,
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

  const edge = 55 // distance from screen edge
  const resourceNodes: ResourceNode[] = [
    // ── Left edge (player territory) ──
    { id: 'farm-L', type: 'food', position: { x: edge, y: 120 }, amount: 500, maxAmount: 500 },
    { id: 'tree-L', type: 'wood', position: { x: edge + 5, y: 360 }, amount: 400, maxAmount: 400 },
    { id: 'mine-L', type: 'gold', position: { x: edge, y: 600 }, amount: 300, maxAmount: 300 },
    // ── Right edge (AI territory) — mirrored ──
    { id: 'farm-R', type: 'food', position: { x: world.width - edge, y: 120 }, amount: 500, maxAmount: 500 },
    { id: 'tree-R', type: 'wood', position: { x: world.width - edge - 5, y: 360 }, amount: 400, maxAmount: 400 },
    { id: 'mine-R', type: 'gold', position: { x: world.width - edge, y: 600 }, amount: 300, maxAmount: 300 },
  ]

  return {
    world,
    players: [player, ai],
    units: [],
    buildings: [],
    resourceNodes,
    time: 0,
  }
}
