'use client'

import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { RetirementResult } from '@/lib/types'

interface Props {
  result: RetirementResult
}

interface ChartPoint {
  year: number
  fi4?: number
  filt?: number
}

function compactMoney(value: number): string {
  if (Math.abs(value) >= 100_000_000) return `${(value / 100_000_000).toFixed(1)}億`
  if (Math.abs(value) >= 10_000) return `${Math.round(value / 10_000).toLocaleString()}萬`
  return Math.round(value).toLocaleString()
}

export default function RetirementCurveChart({ result }: Props) {
  const byYear = new Map<number, ChartPoint>()

  for (const row of result.fi4.table) {
    byYear.set(row.year, { ...byYear.get(row.year), year: row.year, fi4: row.end_asset })
  }

  for (const row of result.filt.table) {
    byYear.set(row.year, { ...byYear.get(row.year), year: row.year, filt: row.end_asset })
  }

  const data = Array.from(byYear.values()).sort((a, b) => a.year - b.year)

  return (
    <section className="card">
      <h2>退休後資產曲線</h2>
      <div className="chart-wrap">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5dccb" />
            <XAxis dataKey="year" tickLine={false} axisLine={false} />
            <YAxis tickFormatter={compactMoney} tickLine={false} axisLine={false} width={72} />
            <Tooltip formatter={(value) => `NT$ ${Number(value).toLocaleString()}`} />
            <Legend />
            <Line name="指定月花費" type="monotone" dataKey="fi4" stroke="#0f766e" strokeWidth={3} dot={false} />
            <Line name="壽命規劃" type="monotone" dataKey="filt" stroke="#b45309" strokeWidth={3} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  )
}
