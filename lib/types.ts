export type MarketStressLevel = 'baseline' | 'historical75' | 'historical90' | 'historicalWorst'

export interface RetirementParams {
  current_base: number
  basis_label: string
  monthly_expense: number
  pre_return: number
  post_return: number
  inflation: number
  withdrawal_rate: number
  bequest: number
  current_age: number
  death_age: number
  monthly_saving: number
  market_stress_level: MarketStressLevel
}

export interface RetirementYearRow {
  year: number
  age: string
  monthly_expense: number
  annual_expense: number
  investment_return: number
  end_asset: number
  depleted: boolean
}

export interface RetirementModeResult {
  years_to_retire: number | null
  retire_year: number | null
  retire_age: number | null
  required: number
  gap: number
  progress: number
  monthly_at_retire: number
  table: RetirementYearRow[]
}

export interface RetirementResult {
  fi4: RetirementModeResult
  filt: RetirementModeResult
  filt_max_monthly: number
  filt_retire_year_input: number
}

export interface SavedScenarioSummary {
  fi_year: number | null
  required_assets: number
  max_monthly_spending: number
}

export interface SavedScenario {
  id: string
  name: string
  params: RetirementParams
  summary: SavedScenarioSummary
  created_at: string
  updated_at: string
}
