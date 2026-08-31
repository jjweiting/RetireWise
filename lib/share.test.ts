import test from 'node:test'
import assert from 'node:assert/strict'
import { DEFAULT_PARAMS } from './retirement'
import { buildShareUrl, parseSharedParams, serializeSharedParams } from './share'

test('parseSharedParams maps valid query values into params and name', () => {
  const parsed = parseSharedParams(
    '?asset=5000000&saving=45000&expense=80000&age=35&life=90&pre=8.5&post=4.5&inflation=2.5&withdrawal=3.5&bequest=1000000&safety=historical90&name=%E4%BF%9D%E5%AE%88%E9%80%80%E4%BC%91',
    DEFAULT_PARAMS,
  )

  assert.equal(parsed.params.current_base, 5_000_000)
  assert.equal(parsed.params.monthly_saving, 45_000)
  assert.equal(parsed.params.monthly_expense, 80_000)
  assert.equal(parsed.params.current_age, 35)
  assert.equal(parsed.params.death_age, 90)
  assert.equal(parsed.params.pre_return, 8.5)
  assert.equal(parsed.params.post_return, 4.5)
  assert.equal(parsed.params.inflation, 2.5)
  assert.equal(parsed.params.withdrawal_rate, 3.5)
  assert.equal(parsed.params.bequest, 1_000_000)
  assert.equal(parsed.params.market_stress_level, 'historical90')
  assert.equal(parsed.name, '保守退休')
})

test('parseSharedParams ignores invalid and out-of-range values', () => {
  const parsed = parseSharedParams('?asset=-1&saving=bad&expense=9999999&age=5&life=30&pre=99&name=', DEFAULT_PARAMS)

  assert.equal(parsed.params.current_base, DEFAULT_PARAMS.current_base)
  assert.equal(parsed.params.monthly_saving, DEFAULT_PARAMS.monthly_saving)
  assert.equal(parsed.params.monthly_expense, DEFAULT_PARAMS.monthly_expense)
  assert.equal(parsed.params.current_age, DEFAULT_PARAMS.current_age)
  assert.equal(parsed.params.death_age, DEFAULT_PARAMS.death_age)
  assert.equal(parsed.params.pre_return, DEFAULT_PARAMS.pre_return)
  assert.equal(parsed.name, null)
})

test('parseSharedParams rejects current assets above 5000萬', () => {
  const parsed = parseSharedParams('?asset=50000001', DEFAULT_PARAMS)

  assert.equal(parsed.params.current_base, DEFAULT_PARAMS.current_base)
})

test('serializeSharedParams includes all numeric params and optional name', () => {
  const query = serializeSharedParams(DEFAULT_PARAMS, '基準情境')
  const params = new URLSearchParams(query)

  assert.equal(params.get('asset'), String(DEFAULT_PARAMS.current_base))
  assert.equal(params.get('saving'), String(DEFAULT_PARAMS.monthly_saving))
  assert.equal(params.get('expense'), String(DEFAULT_PARAMS.monthly_expense))
  assert.equal(params.get('age'), String(DEFAULT_PARAMS.current_age))
  assert.equal(params.get('life'), String(DEFAULT_PARAMS.death_age))
  assert.equal(params.get('pre'), String(DEFAULT_PARAMS.pre_return))
  assert.equal(params.get('post'), String(DEFAULT_PARAMS.post_return))
  assert.equal(params.get('inflation'), String(DEFAULT_PARAMS.inflation))
  assert.equal(params.get('withdrawal'), String(DEFAULT_PARAMS.withdrawal_rate))
  assert.equal(params.get('bequest'), String(DEFAULT_PARAMS.bequest))
  assert.equal(params.get('safety'), DEFAULT_PARAMS.market_stress_level)
  assert.equal(params.get('name'), '基準情境')
})

test('buildShareUrl preserves origin and pathname', () => {
  const url = buildShareUrl('https://jjweiting.github.io', '/RetireWise/', DEFAULT_PARAMS, '分享')

  assert.ok(url.startsWith('https://jjweiting.github.io/RetireWise/?'))
  assert.ok(url.includes('name=%E5%88%86%E4%BA%AB'))
})
