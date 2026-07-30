import { calculateRetirementFI } from './retirement'
import type { RetirementParams } from './types'

export interface SensitivityRow {
  id: string
  label: string
  description: string
  baselineYear: number | null
  scenarioYear: number | null
  yearDelta: number | null
  requiredDelta: number
  status: string
}

interface SensitivityScenario {
  id: string
  label: string
  description: string
  apply: (params: RetirementParams) => RetirementParams
}

const SCENARIOS: SensitivityScenario[] = [
  {
    id: 'saving-plus-5000',
    label: '每月多存 5,000',
    description: '提高退休前每月投入。',
    apply: (params) => ({ ...params, monthly_saving: Math.min(params.monthly_saving + 5_000, 1_000_000) }),
  },
  {
    id: 'expense-minus-10000',
    label: '月花費少 10,000',
    description: '降低退休後目標生活費。',
    apply: (params) => ({ ...params, monthly_expense: Math.max(params.monthly_expense - 10_000, 10_000) }),
  },
  {
    id: 'pre-return-plus-1',
    label: '退休前報酬 +1%',
    description: '提高累積期年化報酬假設。',
    apply: (params) => ({ ...params, pre_return: Math.min(params.pre_return + 1, 30) }),
  },
  {
    id: 'inflation-plus-1',
    label: '通膨 +1%',
    description: '測試生活費通膨升高的壓力。',
    apply: (params) => ({ ...params, inflation: Math.min(params.inflation + 1, 8) }),
  },
]

export function calculateSensitivity(params: RetirementParams): SensitivityRow[] {
  const baseline = calculateRetirementFI(params)
  const baselineYear = baseline.fi4.gap <= 0 ? baseline.fi4.retire_year : null

  return SCENARIOS.map((scenario) => {
    const scenarioResult = calculateRetirementFI(scenario.apply(params))
    const scenarioYear = scenarioResult.fi4.gap <= 0 ? scenarioResult.fi4.retire_year : null
    const yearDelta = baselineYear !== null && scenarioYear !== null ? baselineYear - scenarioYear : null

    return {
      id: scenario.id,
      label: scenario.label,
      description: scenario.description,
      baselineYear,
      scenarioYear,
      yearDelta,
      requiredDelta: scenarioResult.fi4.required - baseline.fi4.required,
      status: formatYearDelta(yearDelta),
    }
  })
}

function formatYearDelta(delta: number | null): string {
  if (delta === null) return '尚未達成'
  if (delta > 0) return `提早 ${delta} 年`
  if (delta < 0) return `延後 ${Math.abs(delta)} 年`
  return '無變化'
}
