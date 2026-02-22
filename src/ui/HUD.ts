import type { GameState, ResourceType, UnitType } from '../game/core/GameState.ts'
import { UNIT_COSTS } from '../game/core/GameState.ts'

type StateProvider = () => GameState
type SelectionProvider = () => string[]

export interface HUDActions {
  trainUnit: (type: UnitType) => void
}

const RESOURCE_ICON: Record<ResourceType, string> = {
  food: '🌾',
  wood: '🌲',
  gold: '⛏',
}

/** Income per second per villager (must match Systems.ts values). */
const INCOME_RATE: Record<ResourceType, number> = {
  food: 0.8,
  wood: 0.7,
  gold: 0.5,
}

const UNIT_LABELS: Record<UnitType, string> = {
  villager: 'Villager',
  spearman: 'Spearman',
  archer:   'Archer',
  horseman: 'Horseman',
}

export class HUD {
  private readonly getState: StateProvider
  private readonly getSelectedUnitIds: SelectionProvider
  private readonly actions: HUDActions

  private readonly resourceBar: HTMLElement | null
  private readonly workerPanel: HTMLElement | null
  private readonly recruitPanel: HTMLElement | null

  constructor(
    getState: StateProvider,
    getSelectedUnitIds: SelectionProvider,
    actions: HUDActions,
  ) {
    this.getState = getState
    this.getSelectedUnitIds = getSelectedUnitIds
    this.actions = actions

    this.resourceBar  = document.getElementById('resource-bar')
    this.workerPanel  = document.getElementById('selection-panel')
    this.recruitPanel = document.getElementById('actions-panel')

    this.buildRecruitPanel()
  }

  render(state: GameState): void {
    void this.getState
    void this.getSelectedUnitIds

    this.renderResources(state)
    this.renderWorkers(state)
    this.updateRecruitAffordability(state)
  }

  // ─── Resource bar ──────────────────────────────────────────────────────────

  private renderResources(state: GameState): void {
    if (!this.resourceBar) return
    const player = state.players.find((p) => p.id === 'player')
    if (!player) return

    const { food, wood, gold } = player.resources
    this.resourceBar.textContent = ''

    const container = document.createElement('div')
    container.className = 'hud-resource-container'
    container.append(
      this.chip('🌾', Math.floor(food)),
      this.chip('🌲', Math.floor(wood)),
      this.chip('⛏', Math.floor(gold)),
    )

    // DEV MODE: Show enemy resources
    if (import.meta.env.DEV) {
      const ai = state.players.find((p) => p.id === 'ai')
      if (ai) {
        const separator = document.createElement('div')
        separator.style.cssText = 'width: 2px; height: 20px; background: rgba(148, 163, 184, 0.3); margin: 0 8px;'
        container.appendChild(separator)

        const aiLabel = document.createElement('span')
        aiLabel.textContent = '🤖'
        aiLabel.style.cssText = 'margin: 0 4px; opacity: 0.7;'
        container.appendChild(aiLabel)

        container.append(
          this.chip('🌾', Math.floor(ai.resources.food)),
          this.chip('🌲', Math.floor(ai.resources.wood)),
          this.chip('⛏', Math.floor(ai.resources.gold)),
        )
      }
    }

    this.resourceBar.appendChild(container)
  }

  private chip(icon: string, value: number): HTMLElement {
    const el = document.createElement('div')
    el.className = 'hud-resource-chip'
    el.textContent = `${icon} ${value}`
    return el
  }

  // ─── Worker summary panel ──────────────────────────────────────────────────

  private renderWorkers(state: GameState): void {
    if (!this.workerPanel) return

    const villagers = state.units.filter(
      (u) => u.type === 'villager' && u.ownerId === 'player',
    )

    // Count villagers per assignment.
    const counts: Record<ResourceType | 'idle', number> = { food: 0, wood: 0, gold: 0, idle: 0 }
    for (const v of villagers) {
      if (v.resourceAssignment) counts[v.resourceAssignment]++
      else counts.idle++
    }

    this.workerPanel.innerHTML = ''

    const header = document.createElement('div')
    header.className = 'hud-panel-header'
    header.textContent = `Villagers (${villagers.length})`
    this.workerPanel.appendChild(header)

    if (villagers.length === 0) {
      const msg = document.createElement('div')
      msg.className = 'hud-empty-msg'
      msg.textContent = 'No villagers'
      this.workerPanel.appendChild(msg)
      return
    }

    const list = document.createElement('div')
    list.className = 'hud-gather-list'

    const resTypes: ResourceType[] = ['food', 'wood', 'gold']
    for (const res of resTypes) {
      const count = counts[res]
      const rate = +(count * INCOME_RATE[res]).toFixed(1)

      const row = document.createElement('div')
      row.className = 'hud-gather-row'

      const icon = document.createElement('span')
      icon.className = 'hud-gather-icon'
      icon.textContent = RESOURCE_ICON[res]

      const countEl = document.createElement('span')
      countEl.className = 'hud-gather-count'
      countEl.textContent = `${count}`

      const rateEl = document.createElement('span')
      rateEl.className = count > 0 ? 'hud-gather-rate active' : 'hud-gather-rate'
      rateEl.textContent = `+${rate}/s`

      row.append(icon, countEl, rateEl)
      list.appendChild(row)
    }

    // Idle row
    if (counts.idle > 0) {
      const row = document.createElement('div')
      row.className = 'hud-gather-row idle'

      const icon = document.createElement('span')
      icon.className = 'hud-gather-icon'
      icon.textContent = '💤'

      const countEl = document.createElement('span')
      countEl.className = 'hud-gather-count'
      countEl.textContent = `${counts.idle}`

      const rateEl = document.createElement('span')
      rateEl.className = 'hud-gather-rate'
      rateEl.textContent = 'idle'

      row.append(icon, countEl, rateEl)
      list.appendChild(row)
    }

    this.workerPanel.appendChild(list)
  }

  // ─── Recruit panel ─────────────────────────────────────────────────────────

  private buildRecruitPanel(): void {
    if (!this.recruitPanel) return
    this.recruitPanel.innerHTML = ''

    const header = document.createElement('div')
    header.className = 'hud-panel-header'
    header.textContent = 'Train Units'
    this.recruitPanel.appendChild(header)

    const unitTypes: UnitType[] = ['villager', 'spearman', 'archer', 'horseman']

    for (const type of unitTypes) {
      const costs = UNIT_COSTS[type]
      const costStr = (Object.entries(costs) as Array<[ResourceType, number]>)
        .map(([res, amt]) => `${RESOURCE_ICON[res]}${amt}`)
        .join(' ')

      const btn = document.createElement('button')
      btn.className = 'hud-train-btn'
      btn.dataset.trainType = type

      const nameEl = document.createElement('span')
      nameEl.className = 'train-name'
      nameEl.textContent = UNIT_LABELS[type]

      const costEl = document.createElement('span')
      costEl.className = 'train-cost'
      costEl.textContent = costStr

      btn.appendChild(nameEl)
      btn.appendChild(costEl)
      btn.addEventListener('click', (e) => {
        e.stopPropagation()
        this.actions.trainUnit(type)
      })

      this.recruitPanel.appendChild(btn)
    }
  }

  private updateRecruitAffordability(state: GameState): void {
    if (!this.recruitPanel) return
    const player = state.players.find((p) => p.id === 'player')
    if (!player) return

    for (const btn of this.recruitPanel.querySelectorAll<HTMLButtonElement>('[data-train-type]')) {
      const type = btn.dataset.trainType as UnitType
      const costs = UNIT_COSTS[type]
      const canAfford = (Object.entries(costs) as Array<[ResourceType, number]>).every(
        ([res, amt]) => player.resources[res] >= amt,
      )
      btn.disabled = !canAfford
      btn.classList.toggle('unaffordable', !canAfford)
    }
  }
}
