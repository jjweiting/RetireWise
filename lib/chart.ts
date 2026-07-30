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
  fi4Note: string | null
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
    fi4Note: fi4PointCount === 1
      ? '指定月花費模式尚未達成 FI，沒有退休後資產曲線；圖上單點是最後檢查年份的資產投影。'
      : null,
  }
}
