import test from 'node:test'
import assert from 'node:assert/strict'
import { DEFAULT_PARAMS } from './retirement'
import { calculateSensitivity } from './sensitivity'

test('calculateSensitivity returns the four defined comparisons', () => {
  const rows = calculateSensitivity(DEFAULT_PARAMS)

  assert.equal(rows.length, 4)
  assert.deepEqual(rows.map((row) => row.id), [
    'saving-plus-5000',
    'expense-minus-10000',
    'pre-return-plus-1',
    'inflation-plus-1',
  ])
})

test('monthly saving increase does not make FI later when both years are valid', () => {
  const rows = calculateSensitivity(DEFAULT_PARAMS)
  const savingRow = rows.find((row) => row.id === 'saving-plus-5000')

  assert.ok(savingRow)
  assert.ok(savingRow.baselineYear !== null)
  assert.ok(savingRow.scenarioYear !== null)
  assert.ok(savingRow.scenarioYear <= savingRow.baselineYear)
})
