import type { Vec2, UnitType } from './GameState.ts'

/**
 * A Command represents a user or AI intent that can be applied to
 * GameState. Keeping this serialisable and deterministic makes it
 * suitable for future multiplayer (lockstep or server-authoritative).
 */
export type Command =
  | {
      kind: 'trainUnit'
      playerId: string
      buildingId: string
      unitType: UnitType
    }
  | {
      kind: 'moveUnits'
      playerId: string
      unitIds: string[]
      destination: Vec2
    }
  | {
      kind: 'attackMove'
      playerId: string
      unitIds: string[]
      targetUnitId: string
    }

