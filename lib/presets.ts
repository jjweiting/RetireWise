import { DEFAULT_PARAMS } from './retirement'
import type { RetirementParams } from './types'

export interface RetirementPreset {
  id: 'conservative' | 'baseline' | 'aggressive'
  name: string
  description: string
  params: RetirementParams
}

export const RETIREMENT_PRESETS: RetirementPreset[] = [
  {
    id: 'conservative',
    name: '保守',
    description: '較低報酬、較高通膨，適合壓力測試。',
    params: {
      ...DEFAULT_PARAMS,
      pre_return: 5,
      post_return: 3,
      inflation: 3.5,
      monthly_expense: 65_000,
    },
  },
  {
    id: 'baseline',
    name: '基準',
    description: '使用目前預設值，適合快速開始。',
    params: DEFAULT_PARAMS,
  },
  {
    id: 'aggressive',
    name: '積極',
    description: '提高退休前報酬、降低通膨假設。',
    params: {
      ...DEFAULT_PARAMS,
      pre_return: 9,
      post_return: 5,
      inflation: 2.5,
    },
  },
]

const PRESET_CONTROLLED_KEYS: Array<keyof RetirementParams> = [
  'monthly_expense',
  'pre_return',
  'post_return',
  'inflation',
  'withdrawal_rate',
  'bequest',
  'current_age',
  'death_age',
]

export function touchesPresetControlledParams(updates: Partial<RetirementParams>): boolean {
  return PRESET_CONTROLLED_KEYS.some((key) => key in updates)
}
