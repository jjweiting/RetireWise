import type { SavedScenario } from './types'

export const SCENARIO_STORAGE_KEY = 'retirewise.scenarios.v1'

export function loadSavedScenarios(): SavedScenario[] {
  if (typeof window === 'undefined') return []

  try {
    const raw = window.localStorage.getItem(SCENARIO_STORAGE_KEY)
    if (!raw) return []

    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function saveSavedScenarios(scenarios: SavedScenario[]): void {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(SCENARIO_STORAGE_KEY, JSON.stringify(scenarios))
}

export function deleteSavedScenario(id: string): SavedScenario[] {
  const next = loadSavedScenarios().filter((scenario) => scenario.id !== id)
  saveSavedScenarios(next)
  return next
}
