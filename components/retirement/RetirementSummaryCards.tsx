import { calculateCurrentMaxMonthly } from '@/lib/retirement'
import type { RetirementParams, RetirementResult } from '@/lib/types'

interface Props {
  result: RetirementResult
  params: RetirementParams
  decision: 'retire' | 'spend'
}

function money(value: number): string {
  return `NT$ ${Math.round(value).toLocaleString()}`
}

function yearLabel(year: number | null): string {
  return year === null ? '尚未達成' : String(year)
}

export default function RetirementSummaryCards({ result, params, decision }: Props) {
  const reached = result.fi4.gap <= 0
  const currentMaxMonthly = calculateCurrentMaxMonthly(params)

  if (decision === 'spend') {
    return (
      <section className="card">
        <h2>現在退休能花多少？</h2>
        <p className="result-lead">以目前可投資資產規劃到 {params.death_age} 歲，且壽命終點保留 {money(params.bequest)}。</p>
        <div className="summary-grid decision-summary-grid">
          <div className="metric decision-primary-metric">
            <div className="metric-label">可持續月花費</div>
            <p className="metric-value">{money(currentMaxMonthly)}</p>
            <p className="metric-subtext">從現在起提領，隨通膨調整</p>
          </div>
          <div className="metric">
            <div className="metric-label">目前可投資資產</div>
            <p className="metric-value">{money(params.current_base)}</p>
            <p className="metric-subtext">尚未計入未來每月投入</p>
          </div>
          <div className="metric">
            <div className="metric-label">目標生活費差額</div>
            <p className="metric-value">{money(currentMaxMonthly - params.monthly_expense)}</p>
            <p className="metric-subtext">相對今日輸入的月生活費</p>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="card">
      <h2>試算結果</h2>
      <div className="summary-grid">
        <div className="metric">
          <div className="metric-label">FI 年份</div>
          <p className="metric-value">{reached ? yearLabel(result.fi4.retire_year) : '尚未達成'}</p>
          <p className="metric-subtext">估計退休年齡：{result.fi4.retire_age ?? '-'} 歲</p>
        </div>
        <div className="metric">
          <div className="metric-label">退休所需資產</div>
          <p className="metric-value">{money(result.fi4.required)}</p>
          <p className="metric-subtext">退休當年月花費 {money(result.fi4.monthly_at_retire)}</p>
        </div>
        <div className="metric">
          <div className="metric-label">目前進度</div>
          <p className="metric-value">{Math.round(result.fi4.progress)}%</p>
          <p className="metric-subtext">缺口 {money(result.fi4.gap)}</p>
        </div>
        <div className="metric">
          <div className="metric-label">壽命規劃月花費</div>
          <p className="metric-value">{money(result.filt_max_monthly)}</p>
          <p className="metric-subtext">以 {params.death_age} 歲、剩餘 {money(params.bequest)} 估算</p>
        </div>
        <div className="metric">
          <div className="metric-label">資產起點</div>
          <p className="metric-value">{money(params.current_base)}</p>
          <p className="metric-subtext">退休前每月投入 {money(params.monthly_saving)}</p>
        </div>
        <div className="metric">
          <div className="metric-label">假設條件</div>
          <p className="metric-value">{params.pre_return}% / {params.post_return}%</p>
          <p className="metric-subtext">退休前 / 退休後年化報酬率</p>
        </div>
      </div>
    </section>
  )
}
