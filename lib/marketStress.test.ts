import test from 'node:test'
import assert from 'node:assert/strict'
import { calculateHistoricalMarketStress } from './marketStress'
import { DEFAULT_PARAMS } from './retirement'

test('historical stress test identifies a valid historical sequence', () => {
  const result = calculateHistoricalMarketStress(DEFAULT_PARAMS, 20_000_000, 15)

  assert.ok(result)
  assert.ok(result.startYear >= 1926)
  assert.ok(result.requiredAsset > 0)
  assert.ok(result.endingAsset >= 0)
})

test('historical stress test rejects retirement periods longer than available history', () => {
  const result = calculateHistoricalMarketStress({ ...DEFAULT_PARAMS, death_age: 120, current_age: 18 }, 20_000_000, 1)

  assert.equal(result, null)
})
