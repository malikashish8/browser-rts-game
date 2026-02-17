import type { GameState } from '../game/core/GameState.ts'

type StateProvider = () => GameState
type SelectionProvider = () => string[]

/**
 * Simple DOM-based HUD for v1.
 *
 * - Resource bar shows player food / wood / gold.
 * - Selection and actions panels are placeholders for now.
 */
export class HUD {
  private readonly getState: StateProvider
  private readonly getSelectedUnitIds: SelectionProvider
  private readonly resourceBar: HTMLElement | null
  private readonly selectionPanel: HTMLElement | null
  private readonly actionsPanel: HTMLElement | null

  constructor(getState: StateProvider, getSelectedUnitIds: SelectionProvider) {
    this.getState = getState
    this.getSelectedUnitIds = getSelectedUnitIds
    this.resourceBar = document.getElementById('resource-bar')
    this.selectionPanel = document.getElementById('selection-panel')
    this.actionsPanel = document.getElementById('actions-panel')
  }

  render(state: GameState): void {
    // Touch the state provider so TypeScript recognises it as used – the
    // current render API passes state explicitly, but we keep the provider
    // for future use (e.g. internal polling or event-based updates).
    void this.getState

    this.renderResources(state)
    this.renderSelection(state)
    this.renderActions(state)
  }

  private renderResources(state: GameState): void {
    if (!this.resourceBar) return

    const player = state.players.find((p) => p.id === 'player')
    if (!player) return

    const { food, wood, gold } = player.resources

    this.resourceBar.textContent = ''

    const container = document.createElement('div')
    container.className = 'hud-resource-container'

    container.append(
      this.createResourceChip('Food', Math.floor(food)),
      this.createResourceChip('Wood', Math.floor(wood)),
      this.createResourceChip('Gold', Math.floor(gold)),
    )

    this.resourceBar.appendChild(container)
  }

  private createResourceChip(label: string, value: number): HTMLElement {
    const chip = document.createElement('div')
    chip.className = 'hud-resource-chip'
    chip.textContent = `${label}: ${value}`
    return chip
  }

  private renderSelection(state: GameState): void {
    if (!this.selectionPanel) return

    const selectedIds = this.getSelectedUnitIds()

    if (selectedIds.length === 0) {
      this.selectionPanel.textContent = 'No selection'
      return
    }

    const selectedUnits = state.units.filter((u) => selectedIds.includes(u.id))

    if (selectedUnits.length === 0) {
      this.selectionPanel.textContent = 'No selection'
      return
    }

    const byType: Record<string, number> = {}
    for (const unit of selectedUnits) {
      byType[unit.type] = (byType[unit.type] ?? 0) + 1
    }

    const summary = Object.entries(byType)
      .map(([type, count]) => `${count}× ${type}`)
      .join(' | ')

    this.selectionPanel.textContent = summary
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private renderActions(_state: GameState): void {
    if (!this.actionsPanel) return
    if (!this.actionsPanel.textContent) {
      this.actionsPanel.textContent = 'No actions'
    }
  }
}

