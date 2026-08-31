import { calculateHistoricalMarketStress } from '@/lib/marketStress'
import type { RetirementParams, RetirementResult } from '@/lib/types'

interface Props {
  params: RetirementParams
  result: RetirementResult
}

export default function RetirementMobileStatus({ params, result }: Props) {
  const yearsToRetire = result.fi4.years_to_retire
  const stress = yearsToRetire === null ? null : calculateHistoricalMarketStress(params, result.fi4.required, yearsToRetire)

  return (
    <aside className="mobile-live-status" aria-label="即時退休結果">
      <div>
        <span>FI 年份</span>
        <strong>{result.fi4.retire_year ?? '未達成'}</strong>
      </div>
      <div>
        <span>退休年齡</span>
        <strong>{result.fi4.retire_age === null ? '-' : `${result.fi4.retire_age} 歲`}</strong>
      </div>
      <div>
        <span>歷史存活率</span>
        <strong>{stress ? `${Math.round(stress.successRate * 100)}%` : '-'}</strong>
      </div>
    </aside>
  )
}
