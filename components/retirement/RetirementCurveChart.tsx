'use client'

import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { buildRetirementChartData } from '@/lib/chart'
import type { RetirementResult } from '@/lib/types'

interface Props {
  result: RetirementResult
}

function compactMoney(value: number): string {
  if (Math.abs(value) >= 100_000_000) return `${(value / 100_000_000).toFixed(1)}億`
  if (Math.abs(value) >= 10_000) return `${Math.round(value / 10_000).toLocaleString()}萬`
  return Math.round(value).toLocaleString()
}

export default function RetirementCurveChart({ result }: Props) {
  const { data, showFi4Dot, showFiltDot } = buildRetirementChartData(result)

  return (
    <section className="card">
      <h2>退休後資產曲線</h2>
      {showFi4Dot && (
        <p className="hint">指定月花費模式尚未達成 FI，因此只顯示最後檢查年份的投影點。</p>
      )}
      <div className="chart-wrap">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5dccb" />
            <XAxis dataKey="year" tickLine={false} axisLine={false} />
            <YAxis tickFormatter={compactMoney} tickLine={false} axisLine={false} width={72} />
            <Tooltip formatter={(value) => `NT$ ${Number(value).toLocaleString()}`} />
            <Legend />
            <Line name="指定月花費" type="monotone" dataKey="fi4" stroke="#0f766e" strokeWidth={3} dot={showFi4Dot} />
            <Line name="壽命規劃" type="monotone" dataKey="filt" stroke="#b45309" strokeWidth={3} dot={showFiltDot} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  )
}
