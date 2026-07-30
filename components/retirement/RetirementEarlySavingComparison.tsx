import { calculateEarlySavingComparison } from '@/lib/earlySaving'
import type { RetirementParams } from '@/lib/types'

interface Props {
  params: RetirementParams
  accelerationYears: number
  extraMonthlySaving: number
  onAccelerationYearsChange: (value: number) => void
  onExtraMonthlySavingChange: (value: number) => void
}

function money(value: number): string {
  const sign = value > 0 ? '+' : value < 0 ? '-' : ''
  return `${sign}NT$ ${Math.abs(Math.round(value)).toLocaleString()}`
}

function plainMoney(value: number): string {
  return `NT$ ${Math.round(value).toLocaleString()}`
}

export default function RetirementEarlySavingComparison({
  params,
  accelerationYears,
  extraMonthlySaving,
  onAccelerationYearsChange,
  onExtraMonthlySavingChange,
}: Props) {
  const comparison = calculateEarlySavingComparison(params, accelerationYears, extraMonthlySaving)

  return (
    <section className="card early-saving-card">
      <h2>早存複利比較</h2>
      <p className="hint">看看前期多存一點，經過複利後可能換來多少退休安全感。</p>

      <div className="early-saving-controls">
        <label className="field">
          <span className="field-row">
            <span>前期加速年數</span>
            <span>{accelerationYears} 年</span>
          </span>
          <input
            type="range"
            min={1}
            max={10}
            step={1}
            value={accelerationYears}
            onChange={(event) => onAccelerationYearsChange(Number(event.target.value))}
          />
        </label>

        <label className="field">
          <span className="field-row">
            <span>每月多存金額</span>
            <span>{plainMoney(extraMonthlySaving)}</span>
          </span>
          <input
            type="range"
            min={1000}
            max={50000}
            step={1000}
            value={extraMonthlySaving}
            onChange={(event) => onExtraMonthlySavingChange(Number(event.target.value))}
          />
        </label>
      </div>

      <p className="early-saving-headline">{comparison.headline}</p>

      <div className="early-saving-metrics">
        <div className="metric">
          <div className="metric-label">總追加投入</div>
          <p className="metric-value">{plainMoney(comparison.totalExtraContribution)}</p>
          <p className="metric-subtext">實際加速 {comparison.applicableAccelerationYears} 年</p>
        </div>
        <div className="metric">
          <div className="metric-label">FI 年變化</div>
          <p className="metric-value">{comparison.fiLabel}</p>
          <p className="metric-subtext">以指定月花費模式比較</p>
        </div>
        <div className="metric">
          <div className="metric-label">耗盡年變化</div>
          <p className="metric-value">{comparison.depletionLabel}</p>
          <p className="metric-subtext">若表格出現耗盡年份才比較</p>
        </div>
        <div className="metric">
          <div className="metric-label">壽命終點資產差額</div>
          <p className="metric-value">{money(comparison.assetDifferenceAtLifespan)}</p>
          <p className="metric-subtext">加速方案 - 原方案</p>
        </div>
      </div>
    </section>
  )
}
