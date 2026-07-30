import { calculateSensitivity } from '@/lib/sensitivity'
import type { RetirementParams } from '@/lib/types'

interface Props {
  params: RetirementParams
}

function money(value: number): string {
  const prefix = value > 0 ? '+' : ''
  return `${prefix}NT$ ${Math.round(value).toLocaleString()}`
}

export default function RetirementSensitivity({ params }: Props) {
  const rows = calculateSensitivity(params)

  return (
    <section className="card">
      <h2>敏感度分析</h2>
      <p className="hint">每次只改一個條件，觀察 FI 年份與所需資產的變化。</p>
      <div className="sensitivity-list">
        {rows.map((row) => (
          <div className="sensitivity-row" key={row.id}>
            <div>
              <p className="scenario-title">{row.label}</p>
              <p className="scenario-meta">{row.description}</p>
            </div>
            <div className="sensitivity-result">
              <strong>{row.status}</strong>
              <span>{money(row.requiredDelta)}</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
