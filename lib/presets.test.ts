import test from 'node:test'
import assert from 'node:assert/strict'
import { touchesPresetControlledParams } from './presets'

test('touchesPresetControlledParams detects edits that should clear preset selection', () => {
  assert.equal(touchesPresetControlledParams({ monthly_expense: 70_000 }), true)
  assert.equal(touchesPresetControlledParams({ pre_return: 8 }), true)
  assert.equal(touchesPresetControlledParams({ post_return: 4 }), true)
  assert.equal(touchesPresetControlledParams({ inflation: 2.5 }), true)
  assert.equal(touchesPresetControlledParams({ current_age: 35 }), true)
  assert.equal(touchesPresetControlledParams({ death_age: 90 }), true)
  assert.equal(touchesPresetControlledParams({ withdrawal_rate: 3.5 }), true)
  assert.equal(touchesPresetControlledParams({ bequest: 1_000_000 }), true)
})

test('touchesPresetControlledParams ignores asset-start edits preserved by presets', () => {
  assert.equal(touchesPresetControlledParams({ current_base: 5_000_000 }), false)
  assert.equal(touchesPresetControlledParams({ monthly_saving: 40_000 }), false)
  assert.equal(touchesPresetControlledParams({ basis_label: '手動輸入' }), false)
})
