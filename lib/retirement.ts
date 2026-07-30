import type { RetirementModeResult, RetirementParams, RetirementResult, RetirementYearRow } from './types'

const CURRENT_YEAR = new Date().getFullYear()
const MAX_SEARCH_YEARS = 60
const BINARY_SEARCH_MAX_ASSET = 2_000_000_000

export interface RetirementCalculationOptions {
  projectAsset?: (years: number) => number
}

export const DEFAULT_PARAMS: RetirementParams = {
  current_base: 3_000_000,
  basis_label: '手動輸入',
  monthly_expense: 60_000,
  pre_return: 7,
  post_return: 5,
  inflation: 3,
  withdrawal_rate: 4,
  bequest: 0,
  current_age: 32,
  death_age: 85,
  monthly_saving: 30_000,
}

export function validateRetirementParams(params: RetirementParams): string[] {
  const errors: string[] = []

  if (params.current_base < 0) errors.push('目前資產不能小於 0')
  if (params.monthly_saving < 0) errors.push('每月儲蓄不能小於 0')
  if (params.monthly_expense <= 0) errors.push('每月目標生活費必須大於 0')
  if (params.current_age <= 0) errors.push('目前年齡必須大於 0')
  if (params.death_age <= params.current_age) errors.push('預期壽命必須大於目前年齡')
  if (params.pre_return < 0 || params.post_return < 0 || params.inflation < 0) {
    errors.push('報酬率與通膨率不能小於 0')
  }
  if (params.bequest < 0) errors.push('死亡時目標剩餘不能小於 0')

  return errors
}

export function calculateRetirementFI(params: RetirementParams, options: RetirementCalculationOptions = {}): RetirementResult {
  const errors = validateRetirementParams(params)
  if (errors.length > 0) {
    throw new Error(errors[0])
  }

  const preReturn = params.pre_return / 100
  const postReturn = params.post_return / 100
  const inflation = params.inflation / 100
  const projectAsset = options.projectAsset ?? ((years: number) => futureValue(params.current_base, params.monthly_saving, preReturn, years))
  const fixedExpenseMode = calculateFixedExpenseMode(params, preReturn, postReturn, inflation, projectAsset)
  const yearsToRetire = fixedExpenseMode.years_to_retire ?? 30
  const retireYear = CURRENT_YEAR + yearsToRetire
  const retireAge = params.current_age + yearsToRetire
  const yearsAfterRetirement = Math.max(params.death_age - retireAge, 1)
  const retirementAsset = projectAsset(yearsToRetire)
  const maxMonthly = calculateMaxMonthly(retirementAsset, postReturn, inflation, yearsAfterRetirement, params.bequest)
  const lifespanTable = simulateRetirement(
    retirementAsset,
    maxMonthly,
    inflation,
    postReturn,
    retireYear,
    yearsAfterRetirement,
    retireAge,
  )

  return {
    fi4: fixedExpenseMode,
    filt: {
      years_to_retire: yearsToRetire,
      retire_year: retireYear,
      retire_age: retireAge,
      required: retirementAsset,
      gap: 0,
      progress: 100,
      monthly_at_retire: maxMonthly,
      table: lifespanTable,
    },
    filt_max_monthly: Math.round(maxMonthly),
    filt_retire_year_input: retireYear,
  }
}

function calculateFixedExpenseMode(
  params: RetirementParams,
  preReturn: number,
  postReturn: number,
  inflation: number,
  projectAsset: (years: number) => number,
): RetirementModeResult {
  let yearsToRetire: number | null = null
  let requiredAtRetirement = 0
  let projectedAtRetirement = 0
  const maxRetirementYears = Math.min(MAX_SEARCH_YEARS, Math.max(params.death_age - params.current_age - 1, 0))

  for (let years = 1; years <= maxRetirementYears; years += 1) {
    const projected = projectAsset(years)
    const retireAge = params.current_age + years
    const yearsAfter = Math.max(params.death_age - retireAge, 1)
    const required = findRequiredPrincipal(params.monthly_expense, postReturn, inflation, years, yearsAfter)

    if (projected >= required) {
      yearsToRetire = years
      requiredAtRetirement = required
      projectedAtRetirement = projected
      break
    }

    requiredAtRetirement = required
    projectedAtRetirement = projected
  }

  const displayYears = yearsToRetire ?? Math.max(maxRetirementYears, 1)
  const retireYear = CURRENT_YEAR + displayYears
  const retireAge = params.current_age + displayYears
  const yearsAfter = Math.max(params.death_age - retireAge, 1)
  const required = yearsToRetire === null
    ? findRequiredPrincipal(params.monthly_expense, postReturn, inflation, displayYears, yearsAfter)
    : requiredAtRetirement
  const projected = yearsToRetire === null
    ? projectAsset(displayYears)
    : projectedAtRetirement
  const monthlyAtRetire = params.monthly_expense * (1 + inflation) ** displayYears
  const gap = Math.max(required - projected, 0)
  const progress = required > 0 ? Math.min((projected / required) * 100, 100) : 100
  const projectionTable: RetirementYearRow[] = [{
    year: retireYear,
    age: `${retireAge} 歲`,
    monthly_expense: Math.round(monthlyAtRetire),
    annual_expense: Math.round(monthlyAtRetire * 12),
    investment_return: 0,
    end_asset: Math.round(projected),
    depleted: false,
  }]

  return {
    years_to_retire: yearsToRetire,
    retire_year: yearsToRetire === null ? null : retireYear,
    retire_age: yearsToRetire === null ? null : retireAge,
    required,
    gap,
    progress,
    monthly_at_retire: monthlyAtRetire,
    table: yearsToRetire === null
      ? projectionTable
      : simulateRetirement(required, monthlyAtRetire, inflation, postReturn, retireYear, yearsAfter, retireAge),
  }
}

export function futureValue(currentBase: number, monthlySaving: number, annualReturn: number, years: number): number {
  const annualSaving = monthlySaving * 12
  if (annualReturn === 0) {
    return currentBase + annualSaving * years
  }

  return currentBase * (1 + annualReturn) ** years
    + annualSaving * (((1 + annualReturn) ** years - 1) / annualReturn)
}

function findRequiredPrincipal(
  monthlyExpenseToday: number,
  postReturn: number,
  inflation: number,
  yearsToRetire: number,
  yearsAfterRetirement: number,
): number {
  let lo = 0
  let hi = BINARY_SEARCH_MAX_ASSET

  for (let i = 0; i < 50; i += 1) {
    const mid = (lo + hi) / 2
    const finalAsset = simulateFinalAsset(mid, monthlyExpenseToday, inflation, postReturn, yearsToRetire, yearsAfterRetirement)
    if (finalAsset >= mid) {
      hi = mid
    } else {
      lo = mid
    }
  }

  return hi
}

function simulateFinalAsset(
  startAsset: number,
  monthlyExpenseToday: number,
  inflation: number,
  postReturn: number,
  yearsToRetire: number,
  yearsAfterRetirement: number,
): number {
  const monthlyAtRetire = monthlyExpenseToday * (1 + inflation) ** yearsToRetire
  let asset = startAsset

  for (let year = 1; year <= yearsAfterRetirement; year += 1) {
    const spend = monthlyAtRetire * (1 + inflation) ** (year - 1) * 12
    asset = asset * (1 + postReturn) - spend
    if (asset <= 0) return 0
  }

  return asset
}

function calculateMaxMonthly(
  startAsset: number,
  postReturn: number,
  inflation: number,
  years: number,
  bequest = 0,
): number {
  const discount = (1 + postReturn) ** years
  const presentBequest = discount === 0 ? 0 : bequest / discount
  let denominator = 0

  for (let year = 1; year <= years; year += 1) {
    denominator += (12 * (1 + inflation) ** (year - 1)) / (1 + postReturn) ** year
  }

  if (denominator <= 0) return 0
  return Math.max((startAsset - presentBequest) / denominator, 0)
}

function simulateRetirement(
  startAsset: number,
  monthlyAtRetire: number,
  inflation: number,
  postReturn: number,
  retireYear: number,
  years: number,
  retireAge: number,
): RetirementYearRow[] {
  const rows: RetirementYearRow[] = []
  let asset = startAsset

  for (let year = 1; year <= years; year += 1) {
    const monthly = monthlyAtRetire * (1 + inflation) ** (year - 1)
    const annualExpense = monthly * 12
    const investmentReturn = asset * postReturn
    const endAsset = asset + investmentReturn - annualExpense
    const depleted = endAsset <= 0

    rows.push({
      year: retireYear + year - 1,
      age: `${retireAge + year - 1} 歲`,
      monthly_expense: Math.round(monthly),
      annual_expense: Math.round(annualExpense),
      investment_return: Math.round(Math.max(investmentReturn, 0)),
      end_asset: Math.round(Math.max(endAsset, 0)),
      depleted,
    })

    asset = Math.max(endAsset, 0)
  }

  return rows
}
