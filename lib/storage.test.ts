import test from 'node:test'
import assert from 'node:assert/strict'
import { DEFAULT_PARAMS } from './retirement'
import {
  deleteSavedScenario,
  loadSavedScenarios,
  saveSavedScenarios,
  SCENARIO_STORAGE_KEY,
} from './storage'
import type { SavedScenario } from './types'

function installLocalStorage(initial: Record<string, string> = {}) {
  const store = new Map(Object.entries(initial))
  ;(globalThis as unknown as { window: unknown }).window = {
    localStorage: {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => store.set(key, value),
      removeItem: (key: string) => store.delete(key),
    },
  }
  return store
}

function removeWindow() {
  delete (globalThis as unknown as { window?: unknown }).window
}

function scenario(id: string): SavedScenario {
  return {
    id,
    name: `情境 ${id}`,
    params: DEFAULT_PARAMS,
    summary: {
      fi_year: 2045,
      required_assets: 20_000_000,
      max_monthly_spending: 80_000,
    },
    created_at: '2026-07-30T00:00:00.000Z',
    updated_at: '2026-07-30T00:00:00.000Z',
  }
}

test('loadSavedScenarios returns empty list without browser window', () => {
  removeWindow()
  assert.deepEqual(loadSavedScenarios(), [])
})

test('loadSavedScenarios returns empty list for malformed JSON', () => {
  installLocalStorage({ [SCENARIO_STORAGE_KEY]: '{bad json' })
  assert.deepEqual(loadSavedScenarios(), [])
})

test('saveSavedScenarios persists the full scenario list', () => {
  const store = installLocalStorage()
  const saved = [scenario('one'), scenario('two')]

  saveSavedScenarios(saved)

  assert.deepEqual(JSON.parse(store.get(SCENARIO_STORAGE_KEY) ?? '[]'), saved)
})

test('deleteSavedScenario removes one scenario and returns the remaining list', () => {
  const saved = [scenario('one'), scenario('two')]
  installLocalStorage({ [SCENARIO_STORAGE_KEY]: JSON.stringify(saved) })

  const remaining = deleteSavedScenario('one')

  assert.equal(remaining.length, 1)
  assert.equal(remaining[0].id, 'two')
  assert.deepEqual(loadSavedScenarios(), remaining)
})
