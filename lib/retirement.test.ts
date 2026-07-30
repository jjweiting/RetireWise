import test from 'node:test'
import assert from 'node:assert/strict'
import { calculateRetirementFI, DEFAULT_PARAMS } from './retirement'

test('default params produce FI and lifespan results', () => {
  const result = calculateRetirementFI(DEFAULT_PARAMS)
  assert.ok(result.fi4.required > 0)
  assert.ok(result.fi4.table.length > 0)
  assert.ok(result.filt.table.length > 0)
  assert.ok(result.filt_max_monthly > 0)
})

test('zero pre-retirement return with monthly saving does not divide by zero', () => {
  const result = calculateRetirementFI({ ...DEFAULT_PARAMS, pre_return: 0, monthly_saving: 30000 })
  assert.ok(Number.isFinite(result.fi4.required))
  assert.ok(result.fi4.years_to_retire !== null)
})

test('higher monthly expense increases required assets', () => {
  const low = calculateRetirementFI({ ...DEFAULT_PARAMS, monthly_expense: 40000 })
  const high = calculateRetirementFI({ ...DEFAULT_PARAMS, monthly_expense: 100000 })
  assert.ok(high.fi4.required > low.fi4.required)
})

test('bequest reduces lifespan-mode max monthly spending', () => {
  const noBequest = calculateRetirementFI({ ...DEFAULT_PARAMS, bequest: 0 })
  const withBequest = calculateRetirementFI({ ...DEFAULT_PARAMS, bequest: 3000000 })
  assert.ok(withBequest.filt_max_monthly < noBequest.filt_max_monthly)
})
