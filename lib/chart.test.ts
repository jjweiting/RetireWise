import test from 'node:test'
import assert from 'node:assert/strict'
import { calculateRetirementFI, DEFAULT_PARAMS } from './retirement'
import { buildRetirementChartData } from './chart'

test('buildRetirementChartData flags single-point fixed-expense series as needing a visible dot', () => {
  const result = calculateRetirementFI({
    ...DEFAULT_PARAMS,
    current_base: 4_400_000,
    monthly_saving: 35_000,
    monthly_expense: 70_000,
    pre_return: 5,
    post_return: 3,
    inflation: 3.5,
    current_age: 32,
    death_age: 108,
  })
  const chart = buildRetirementChartData(result)

  assert.equal(chart.showFi4Dot, true)
  assert.equal(chart.showFiltDot, false)
  assert.equal(chart.fi4Note, '指定月花費模式尚未達成 FI，沒有退休後資產曲線；圖上單點是最後檢查年份的資產投影。')
  assert.ok(chart.data.length > 1)
})

test('buildRetirementChartData does not show dots for multi-point series', () => {
  const chart = buildRetirementChartData(calculateRetirementFI(DEFAULT_PARAMS))

  assert.equal(chart.showFi4Dot, false)
  assert.equal(chart.showFiltDot, false)
  assert.equal(chart.fi4Note, null)
})
