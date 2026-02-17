import type { AgeId, UnitType } from './GameState.ts'

export interface AgeDefinition {
  id: AgeId
  displayName: string
  availableUnits: UnitType[]
}

/**
 * Data-driven age configuration. Expanding the game to multiple ages
 * will largely be a matter of appending to this list and adjusting
 * balance numbers, not core logic.
 */
export const AGES: AgeDefinition[] = [
  {
    id: 'dark',
    displayName: 'Dark Age',
    availableUnits: ['villager', 'spearman', 'archer', 'horseman'],
  },
]

