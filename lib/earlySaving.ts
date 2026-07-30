import { calculateRetirementFI, futureValue } from './retirement'
import type { RetirementParams, RetirementResult, RetirementYearRow } from './types'

export interface EarlySavingComparison {
  accelerationYears: number
  extraMonthlySaving: number
  applicableAccelerationYears: number
  totalExtraContribution: number
  baseline: RetirementResult
  accelerated: RetirementResult
  baselineFiYear: number | null
  acceleratedFiYear: number | null
  fiYearDelta: number | null
  baselineDepletionYear: number | null
  acceleratedDepletionYear: number | null
  depletionYearDelta: number | null
  baselineEndingAssetAtLifespan: number
  acceleratedEndingAssetAtLifespan: number
  assetDifferenceAtLifespan: number
  headline: string
  fiLabel: string
  depletionLabel: string
}

export function calculateEarlySavingComparison(
  params: RetirementParams,
  accelerationYears: number,
  extraMonthlySaving: number,
): EarlySavingComparison {
  const safeAccelerationYears = Math.max(Math.floor(accelerationYears), 0)
  const safeExtraMonthlySaving = Math.max(extraMonthlySaving, 0)
  const preReturn = params.pre_return / 100
  const baseline = calculateRetirementFI(params)
  const accelerated = calculateRetirementFI(params, {
    projectAsset: (years) => projectAssetWithEarlyExtraSaving(params, preReturn, safeAccelerationYears, safeExtraMonthlySaving, years),
  })
  const baselineFiYear = baseline.fi4.gap <= 0 ? baseline.fi4.retire_year : null
  const acceleratedFiYear = accelerated.fi4.gap <= 0 ? accelerated.fi4.retire_year : null
  const fiYearDelta = baselineFiYear !== null && acceleratedFiYear !== null ? baselineFiYear - acceleratedFiYear : null
  const neitherPlanReachesFi = baselineFiYear === null && acceleratedFiYear === null
  const baselineDepletionYear = neitherPlanReachesFi ? null : findDepletionYear(baseline.fi4.table)
  const acceleratedDepletionYear = neitherPlanReachesFi ? null : findDepletionYear(accelerated.fi4.table)
  const depletionYearDelta = baselineDepletionYear !== null && acceleratedDepletionYear !== null
    ? acceleratedDepletionYear - baselineDepletionYear
    : null
  const applicableAccelerationYears = Math.min(safeAccelerationYears, accelerated.fi4.years_to_retire ?? safeAccelerationYears)
  const totalExtraContribution = applicableAccelerationYears * 12 * safeExtraMonthlySaving
  const assetComparisonYears = baseline.fi4.years_to_retire ?? accelerated.fi4.years_to_retire ?? safeAccelerationYears
  const baselineEndingAssetAtLifespan = projectAssetAtLifespan(
    params,
    futureValue(params.current_base, params.monthly_saving, preReturn, assetComparisonYears),
    assetComparisonYears,
  )
  const acceleratedEndingAssetAtLifespan = projectAssetAtLifespan(
    params,
    projectAssetWithEarlyExtraSaving(params, preReturn, applicableAccelerationYears, safeExtraMonthlySaving, assetComparisonYears),
    assetComparisonYears,
  )
  const assetDifferenceAtLifespan = acceleratedEndingAssetAtLifespan - baselineEndingAssetAtLifespan

  return {
    accelerationYears: safeAccelerationYears,
    extraMonthlySaving: safeExtraMonthlySaving,
    applicableAccelerationYears,
    totalExtraContribution,
    baseline,
    accelerated,
    baselineFiYear,
    acceleratedFiYear,
    fiYearDelta,
    baselineDepletionYear,
    acceleratedDepletionYear,
    depletionYearDelta,
    baselineEndingAssetAtLifespan,
    acceleratedEndingAssetAtLifespan,
    assetDifferenceAtLifespan,
    headline: formatHeadline(applicableAccelerationYears, safeExtraMonthlySaving, totalExtraContribution, fiYearDelta, depletionYearDelta, baselineFiYear, acceleratedFiYear),
    fiLabel: formatFiLabel(baselineFiYear, acceleratedFiYear, fiYearDelta),
    depletionLabel: formatDepletionLabel(baselineDepletionYear, acceleratedDepletionYear, depletionYearDelta, neitherPlanReachesFi),
  }
}

function projectAssetWithEarlyExtraSaving(
  params: RetirementParams,
  preReturn: number,
  accelerationYears: number,
  extraMonthlySaving: number,
  years: number,
): number {
  const firstPhaseYears = Math.min(years, accelerationYears)
  const secondPhaseYears = Math.max(years - firstPhaseYears, 0)
  const firstPhaseAsset = futureValue(
    params.current_base,
    params.monthly_saving + extraMonthlySaving,
    preReturn,
    firstPhaseYears,
  )

  return futureValue(firstPhaseAsset, params.monthly_saving, preReturn, secondPhaseYears)
}

function findDepletionYear(rows: RetirementYearRow[]): number | null {
  return rows.find((row) => row.depleted)?.year ?? null
}

function projectAssetAtLifespan(params: RetirementParams, startAsset: number, yearsToRetire: number): number {
  const postReturn = params.post_return / 100
  const inflation = params.inflation / 100
  const retireAge = params.current_age + yearsToRetire
  const yearsAfterRetirement = Math.max(params.death_age - retireAge, 1)
  let asset = startAsset

  for (let year = 1; year <= yearsAfterRetirement; year += 1) {
    const monthlyAtRetire = params.monthly_expense * (1 + inflation) ** yearsToRetire
    const annualExpense = monthlyAtRetire * (1 + inflation) ** (year - 1) * 12
    asset = Math.max(asset * (1 + postReturn) - annualExpense, 0)
  }

  return Math.round(asset)
}

function money(value: number): string {
  return `NT$${Math.round(value).toLocaleString()}`
}

function formatHeadline(
  applicableAccelerationYears: number,
  extraMonthlySaving: number,
  totalExtraContribution: number,
  fiYearDelta: number | null,
  depletionYearDelta: number | null,
  baselineFiYear: number | null,
  acceleratedFiYear: number | null,
): string {
  const prefix = `如果你在前 ${applicableAccelerationYears} 年每月多存 ${money(extraMonthlySaving)}，總共多投入 ${money(totalExtraContribution)}。`
  if (baselineFiYear === null && acceleratedFiYear === null) {
    return `${prefix} 在目前假設下，兩種方案皆尚未達成 FI，這筆前期投入主要反映在最後檢查年份的資產差額。`
  }
  if (baselineFiYear === null && acceleratedFiYear !== null) {
    return `${prefix} 在目前假設下，這筆前期投入可能讓原本尚未達成的 FI 目標變成 ${acceleratedFiYear} 年達成。`
  }
  if (fiYearDelta !== null && fiYearDelta > 0 && depletionYearDelta !== null && depletionYearDelta > 0) {
    return `${prefix} 在目前假設下，這筆前期投入可能讓 FI 年提前 ${fiYearDelta} 年，並讓退休後資產多支撐約 ${depletionYearDelta} 年。`
  }
  if (fiYearDelta !== null && fiYearDelta > 0) {
    return `${prefix} 在目前假設下，這筆前期投入可能讓 FI 年提前 ${fiYearDelta} 年。`
  }
  if (depletionYearDelta !== null && depletionYearDelta > 0) {
    return `${prefix} 在目前假設下，這筆前期投入可能讓退休後資產多支撐約 ${depletionYearDelta} 年。`
  }
  return `${prefix} 在目前假設下，這筆前期投入主要反映在預期壽命時的剩餘資產差額。`
}

function formatFiLabel(baselineFiYear: number | null, acceleratedFiYear: number | null, fiYearDelta: number | null): string {
  if (baselineFiYear === null && acceleratedFiYear === null) return '兩者皆尚未達成 FI'
  if (baselineFiYear === null && acceleratedFiYear !== null) return `加速後 ${acceleratedFiYear} 年達成 FI`
  if (baselineFiYear !== null && acceleratedFiYear === null) return '加速後仍尚無 FI 年份'
  if (fiYearDelta === null) return '尚無法比較'
  if (fiYearDelta > 0) return `提早 ${fiYearDelta} 年`
  if (fiYearDelta < 0) return `延後 ${Math.abs(fiYearDelta)} 年`
  return '無變化'
}

function formatDepletionLabel(
  baselineDepletionYear: number | null,
  acceleratedDepletionYear: number | null,
  depletionYearDelta: number | null,
  comparisonUnavailable = false,
): string {
  if (comparisonUnavailable) return '尚無法比較'
  if (baselineDepletionYear === null && acceleratedDepletionYear === null) return '兩者都能支撐到預期壽命'
  if (baselineDepletionYear !== null && acceleratedDepletionYear === null) return '加速後可支撐到預期壽命'
  if (baselineDepletionYear === null && acceleratedDepletionYear !== null) return '加速後仍需檢查耗盡風險'
  if (depletionYearDelta === null) return '尚無法比較'
  if (depletionYearDelta > 0) return `多支撐 ${depletionYearDelta} 年`
  if (depletionYearDelta < 0) return `少支撐 ${Math.abs(depletionYearDelta)} 年`
  return '無變化'
}
