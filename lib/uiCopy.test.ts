import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

test('inputs clarify monthly saving and results use target living expenses', () => {
  const paramsComponent = readFileSync('components/retirement/RetirementParams.tsx', 'utf8')
  const summaryComponent = readFileSync('components/retirement/RetirementSummaryCards.tsx', 'utf8')

  assert.match(paramsComponent, /退休前每月投入/)
  assert.doesNotMatch(paramsComponent, /每月儲蓄 \/ 投入/)
  assert.match(summaryComponent, /每月目標生活費/)
})

test('home page presents the scenario studio as the primary workspace', () => {
  const page = readFileSync('app/page.tsx', 'utf8')

  assert.match(page, /情境工作台/)
  assert.match(page, /studio-live-results/)
})

test('mobile layout keeps an immediate retirement status visible', () => {
  const page = readFileSync('app/page.tsx', 'utf8')

  assert.match(page, /RetirementMobileStatus/)
})

test('mobile workspace separates inputs from results with tabs', () => {
  const page = readFileSync('app/page.tsx', 'utf8')

  assert.match(page, /輸入設定/)
  assert.match(page, /結果報告/)
})
