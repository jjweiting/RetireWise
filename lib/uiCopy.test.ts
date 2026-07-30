import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

test('monthly saving copy clarifies it is pre-retirement investing', () => {
  const paramsComponent = readFileSync('components/retirement/RetirementParams.tsx', 'utf8')
  const summaryComponent = readFileSync('components/retirement/RetirementSummaryCards.tsx', 'utf8')

  assert.match(paramsComponent, /退休前每月投入/)
  assert.doesNotMatch(paramsComponent, /每月儲蓄 \/ 投入/)
  assert.match(summaryComponent, /退休前每月投入/)
})
