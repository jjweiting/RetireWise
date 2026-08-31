import { calculateHistoricalMarketStress } from '@/lib/marketStress'
import type { RetirementParams, RetirementResult } from '@/lib/types'

interface Props {
  params: RetirementParams
  result: RetirementResult
}

function money(value: number): string {
  return `NT$ ${Math.round(value).toLocaleString()}`
}

export default function RetirementMarketStress({ params, result }: Props) {
  if (result.fi4.years_to_retire === null) return null

  const stress = calculateHistoricalMarketStress(params, result.fi4.required, result.fi4.years_to_retire)
  if (!stress) return null

  const extraAsset = Math.max(stress.requiredAsset - result.fi4.required, 0)
  const survives = stress.depletedAge === null

  return (
    <section className="card market-stress-card">
      <h2>歷史市場壓力測試</h2>
      <p className="hint">以 1926-2025 年美國大型股年總報酬的每個連續期間測試退休後報酬順序。保留你設定的平均報酬率，只套用歷史漲跌節奏。</p>
      <div className="market-stress-grid">
        <div className="metric">
          <div className="metric-label">最不利起始年</div>
          <p className="metric-value">{stress.startYear}</p>
          <p className="metric-subtext">退休期間最差的歷史報酬序列</p>
        </div>
        <div className="metric">
          <div className="metric-label">壓力測試結果</div>
          <p className="metric-value">{survives ? '可維持' : `${stress.depletedAge} 歲耗盡`}</p>
          <p className="metric-subtext">以目前 FI 所需資產 {money(result.fi4.required)} 試算</p>
        </div>
        <div className="metric">
          <div className="metric-label">避免耗盡所需資產</div>
          <p className="metric-value">{money(stress.requiredAsset)}</p>
          <p className="metric-subtext">較基本試算多 {money(extraAsset)}</p>
        </div>
      </div>
      <p className="hint market-stress-note">此為 100 年美股歷史資料的壓力測試，並非預測；債券、現金或全球分散配置的實際波動可能不同。</p>
    </section>
  )
}
