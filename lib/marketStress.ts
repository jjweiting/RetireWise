import type { RetirementParams } from './types'

// S&P 500 annual total returns, 1926-2025 (%). Source: NYU Stern historical returns data.
const HISTORICAL_STOCK_RETURNS = [
  11.62, 37.49, 43.81, -8.3, -25.12, -43.84, -8.64, 49.98, -1.19, 46.74,
  31.94, -35.34, 29.28, -1.1, -10.67, -12.77, 19.17, 25.82, 19.75, 36.44,
  -8.07, 5.71, 5.5, 18.79, 31.71, 24.02, 18.37, -0.99, 52.62, 31.56,
  6.56, -10.78, 43.36, 11.96, 0.47, 26.89, -8.73, 22.8, 16.48, 12.45,
  -10.06, 23.98, 11.06, -8.5, 4.01, 14.31, 18.98, -14.66, -26.47, 37.2,
  23.84, -7.18, 6.56, 18.44, 32.42, -4.91, 21.55, 22.56, 6.27, 31.73,
  18.67, 5.25, 16.61, 31.69, -3.1, 30.47, 7.62, 10.08, 1.32, 37.58,
  22.96, 33.36, 28.58, 21.04, -9.1, -11.89, -22.1, 28.68, 10.88, 4.91,
  15.79, 5.49, -37, 26.46, 15.06, 2.11, 16, 32.39, 13.69, 1.38,
  11.97, 21.83, -4.38, 31.49, 18.4, 28.71, -18.11, 26.29, 25.02, 17.88,
]

const FIRST_YEAR = 1926
const HISTORICAL_AVERAGE = HISTORICAL_STOCK_RETURNS.reduce((sum, value) => sum + value, 0) / HISTORICAL_STOCK_RETURNS.length

export interface HistoricalMarketStressResult {
  sampleCount: number
  successRate: number
  medianDepletedAge: number | null
  percentileRequiredAsset: number
  worstStartYear: number
  worstRequiredAsset: number
}

function simulate(
  startAsset: number,
  returns: number[],
  monthlyExpenseAtRetirement: number,
  inflation: number,
): { endingAsset: number; depletedYear: number | null } {
  let asset = startAsset

  for (let year = 0; year < returns.length; year += 1) {
    const expense = monthlyExpenseAtRetirement * (1 + inflation) ** year * 12
    asset = asset * (1 + returns[year]) - expense
    if (asset <= 0) return { endingAsset: 0, depletedYear: year }
  }

  return { endingAsset: asset, depletedYear: null }
}

function requiredToAvoidDepletion(
  returns: number[],
  monthlyExpenseAtRetirement: number,
  inflation: number,
  bequest: number,
): number {
  let low = 0
  let high = 2_000_000_000

  for (let iteration = 0; iteration < 50; iteration += 1) {
    const middle = (low + high) / 2
    const outcome = simulate(middle, returns, monthlyExpenseAtRetirement, inflation)
    if (outcome.depletedYear === null && outcome.endingAsset >= bequest) high = middle
    else low = middle
  }

  return high
}

export function calculateHistoricalMarketStress(
  params: RetirementParams,
  retirementAsset: number,
  yearsToRetire: number,
): HistoricalMarketStressResult | null {
  const retirementYears = params.death_age - params.current_age - yearsToRetire
  if (retirementYears < 1 || retirementYears > HISTORICAL_STOCK_RETURNS.length) return null

  const monthlyExpenseAtRetirement = params.monthly_expense * (1 + params.inflation / 100) ** yearsToRetire
  const expectedReturn = params.post_return / 100
  const inflation = params.inflation / 100
  const samples: { startYear: number; depletedAge: number | null; requiredAsset: number; succeeds: boolean }[] = []

  for (let start = 0; start <= HISTORICAL_STOCK_RETURNS.length - retirementYears; start += 1) {
    // Keep the user's expected return, but apply the sequence of historical gains and crashes.
    const returns = HISTORICAL_STOCK_RETURNS
      .slice(start, start + retirementYears)
      .map((returnPercent) => Math.max(expectedReturn + (returnPercent - HISTORICAL_AVERAGE) / 100, -0.99))
    const outcome = simulate(retirementAsset, returns, monthlyExpenseAtRetirement, inflation)
    const requiredAsset = requiredToAvoidDepletion(returns, monthlyExpenseAtRetirement, inflation, params.bequest)
    samples.push({
      startYear: FIRST_YEAR + start,
      depletedAge: outcome.depletedYear === null ? null : params.current_age + yearsToRetire + outcome.depletedYear,
      requiredAsset,
      succeeds: outcome.depletedYear === null && outcome.endingAsset >= params.bequest,
    })
  }

  const requiredAssets = samples.map((sample) => sample.requiredAsset).sort((left, right) => left - right)
  const depletedAges = samples
    .flatMap((sample) => sample.depletedAge === null ? [] : [sample.depletedAge])
    .sort((left, right) => left - right)
  const worst = samples.reduce((currentWorst, sample) => sample.requiredAsset > currentWorst.requiredAsset ? sample : currentWorst)
  const percentileIndex = Math.ceil(requiredAssets.length * 0.9) - 1

  return {
    sampleCount: samples.length,
    successRate: samples.filter((sample) => sample.succeeds).length / samples.length,
    medianDepletedAge: depletedAges.length === 0 ? null : depletedAges[Math.floor(depletedAges.length / 2)],
    percentileRequiredAsset: requiredAssets[percentileIndex],
    worstStartYear: worst.startYear,
    worstRequiredAsset: worst.requiredAsset,
  }
}
