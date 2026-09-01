import { calculateHistoricalMarketStress } from '@/lib/marketStress'
import type { RetirementParams, RetirementResult } from '@/lib/types'

interface Props {
  params: RetirementParams
  result: RetirementResult
  decision: 'preserve' | 'lifespan'
}

function money(value: number): string {
  return `NT$ ${Math.round(value).toLocaleString()}`
}

export default function RetirementMarketStress({ params, result, decision }: Props) {
  const mode = decision === 'preserve' ? result.fi4 : result.filt
  if (mode.years_to_retire === null) return null

  const stress = calculateHistoricalMarketStress(params, mode.required, mode.years_to_retire)
  if (!stress) return null

  const percentileExtraAsset = Math.max(stress.percentileRequiredAsset - mode.required, 0)

  return (
    <section className="card market-stress-card">
      <h2>歷史市場壓力測試</h2>
      <p className="hint">以 1926-2025 年美國大型股年總報酬的每個連續期間測試退休後報酬順序。保留你設定的平均報酬率，只套用歷史漲跌節奏；上方 FI 結果已依所選安全等級計算。</p>
      <div className="market-stress-grid">
        <div className="metric">
          <div className="metric-label">歷史存活率</div>
          <p className="metric-value">{Math.round(stress.successRate * 100)}%</p>
          <p className="metric-subtext">{stress.sampleCount} 段歷史報酬序列中，資產未耗盡的比例</p>
        </div>
        <div className="metric">
          <div className="metric-label">典型失敗年齡</div>
          <p className="metric-value">{stress.medianDepletedAge === null ? '無' : `${stress.medianDepletedAge} 歲`}</p>
          <p className="metric-subtext">僅統計會耗盡的序列之中位數</p>
        </div>
        <div className="metric">
          <div className="metric-label">90% 情境所需資產</div>
          <p className="metric-value">{money(stress.percentileRequiredAsset)}</p>
          <p className="metric-subtext">較基本試算多 {money(percentileExtraAsset)}</p>
        </div>
        <div className="metric">
          <div className="metric-label">最極端歷史情境</div>
          <p className="metric-value">{stress.worstStartYear}</p>
          <p className="metric-subtext">需 {money(stress.worstRequiredAsset)} 才能維持至壽命終點</p>
        </div>
      </div>
      <p className="hint market-stress-note">90% 情境比單一最差年份更適合用來設定準備金；最極端情境僅作尾端風險參考。此為 100 年美股資料，並非預測。</p>
    </section>
  )
}
