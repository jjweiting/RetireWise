import test from 'node:test'
import assert from 'node:assert/strict'
import { calculateEarlySavingComparison } from './earlySaving'
import { DEFAULT_PARAMS } from './retirement'

test('extra early saving increases lifespan ending assets', () => {
  const comparison = calculateEarlySavingComparison(DEFAULT_PARAMS, 5, 5_000)

  assert.ok(comparison.assetDifferenceAtLifespan > 0)
  assert.ok(comparison.acceleratedEndingAssetAtLifespan > comparison.baselineEndingAssetAtLifespan)
})

test('total extra contribution uses acceleration years and monthly amount', () => {
  const comparison = calculateEarlySavingComparison(DEFAULT_PARAMS, 5, 5_000)

  assert.equal(comparison.totalExtraContribution, 300_000)
})

test('total extra contribution is capped by applicable pre-retirement years', () => {
  const comparison = calculateEarlySavingComparison({ ...DEFAULT_PARAMS, current_base: 100_000_000 }, 10, 5_000)

  assert.equal(comparison.totalExtraContribution, comparison.applicableAccelerationYears * 12 * 5_000)
  assert.ok(comparison.applicableAccelerationYears <= 10)
})

test('accelerated saving does not make FI later when both plans reach FI', () => {
  const comparison = calculateEarlySavingComparison(DEFAULT_PARAMS, 5, 20_000)

  assert.ok(comparison.baselineFiYear !== null)
  assert.ok(comparison.acceleratedFiYear !== null)
  assert.ok(comparison.fiYearDelta !== null)
  assert.ok(comparison.fiYearDelta >= 0)
})

test('unavailable depletion comparison is represented safely', () => {
  const comparison = calculateEarlySavingComparison({ ...DEFAULT_PARAMS, current_base: 100_000_000 }, 5, 5_000)

  assert.equal(comparison.depletionYearDelta, null)
  assert.match(comparison.depletionLabel, /尚無法比較|都能支撐/)
})

test('depletion comparison stays unavailable when neither plan reaches FI', () => {
  const comparison = calculateEarlySavingComparison({
    ...DEFAULT_PARAMS,
    current_base: 0,
    monthly_saving: 10_000,
    monthly_expense: 200_000,
  }, 5, 5_000)

  assert.equal(comparison.baselineFiYear, null)
  assert.equal(comparison.acceleratedFiYear, null)
  assert.equal(comparison.depletionYearDelta, null)
  assert.equal(comparison.depletionLabel, '尚無法比較')
  assert.doesNotMatch(comparison.headline, /支撐到預期壽命|多支撐/)
})

test('headline uses capped applicable acceleration years', () => {
  const comparison = calculateEarlySavingComparison({ ...DEFAULT_PARAMS, current_base: 100_000_000 }, 10, 5_000)

  assert.ok(comparison.applicableAccelerationYears < 10)
  assert.match(comparison.headline, new RegExp(`前 ${comparison.applicableAccelerationYears} 年每月多存`))
  assert.doesNotMatch(comparison.headline, /前 10 年每月多存/)
})

test('lifespan asset difference uses capped applicable acceleration years', () => {
  const comparison = calculateEarlySavingComparison({ ...DEFAULT_PARAMS, current_base: 15_000_000 }, 10, 5_000)
  const cappedComparison = calculateEarlySavingComparison(
    { ...DEFAULT_PARAMS, current_base: 15_000_000 },
    comparison.applicableAccelerationYears,
    5_000,
  )

  assert.ok(comparison.baselineFiYear !== null)
  assert.ok(comparison.acceleratedFiYear !== null)
  assert.ok(comparison.acceleratedFiYear < comparison.baselineFiYear)
  assert.ok(comparison.applicableAccelerationYears < comparison.accelerationYears)
  assert.equal(comparison.assetDifferenceAtLifespan, cappedComparison.assetDifferenceAtLifespan)
})
