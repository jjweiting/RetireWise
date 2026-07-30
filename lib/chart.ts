import type { RetirementResult } from './types'

export interface RetirementChartPoint {
  year: number
  fi4?: number
  filt?: number
}

export interface RetirementChartData {
  data: RetirementChartPoint[]
  showFi4Dot: boolean
  showFiltDot: boolean
}

export function buildRetirementChartData(result: RetirementResult): RetirementChartData {
  const byYear = new Map<number, RetirementChartPoint>()
  let fi4PointCount = 0
  let filtPointCount = 0

  for (const row of result.fi4.table) {
    fi4PointCount += 1
    byYear.set(row.year, { ...byYear.get(row.year), year: row.year, fi4: row.end_asset })
  }

  for (const row of result.filt.table) {
    filtPointCount += 1
    byYear.set(row.year, { ...byYear.get(row.year), year: row.year, filt: row.end_asset })
  }

  return {
    data: Array.from(byYear.values()).sort((a, b) => a.year - b.year),
    showFi4Dot: fi4PointCount === 1,
    showFiltDot: filtPointCount === 1,
  }
}
