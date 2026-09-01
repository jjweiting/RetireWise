import type { RetirementParams, RetirementResult } from '@/lib/types'

interface Props {
  result: RetirementResult
  params: RetirementParams
  decision: 'preserve' | 'lifespan'
}

function money(value: number): string {
  return `NT$ ${Math.round(value).toLocaleString()}`
}

function yearLabel(year: number | null): string {
  return year === null ? '尚未達成' : String(year)
}

export default function RetirementSummaryCards({ result, params, decision }: Props) {
  const mode = decision === 'preserve' ? result.fi4 : result.filt
  const reached = mode.gap <= 0
  const modeTitle = decision === 'preserve' ? '本金保全規劃' : '壽命規劃'
  const modeDescription = decision === 'preserve'
    ? '壽命終點仍保留退休時本金。'
    : `壽命終點保留 ${money(params.bequest)}。`

  return (
    <section className="card">
      <h2>{modeTitle}</h2>
      <p className="result-lead">以每月目標生活費 {money(params.monthly_expense)} 起算，{modeDescription}</p>
      <div className="summary-grid">
        <div className="metric">
          <div className="metric-label">最早退休年齡</div>
          <p className="metric-value">{reached ? `${mode.retire_age} 歲` : '尚未達成'}</p>
          <p className="metric-subtext">預計退休年份：{yearLabel(mode.retire_year)}</p>
        </div>
        <div className="metric">
          <div className="metric-label">退休所需資產</div>
          <p className="metric-value">{money(mode.required)}</p>
          <p className="metric-subtext">退休當年月花費 {money(mode.monthly_at_retire)}</p>
        </div>
        <div className="metric">
          <div className="metric-label">目前進度</div>
          <p className="metric-value">{Math.round(mode.progress)}%</p>
          <p className="metric-subtext">缺口 {money(mode.gap)}</p>
        </div>
      </div>
    </section>
  )
}
