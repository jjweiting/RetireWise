import { calculateHistoricalMarketStress } from '@/lib/marketStress'
import { calculateCurrentMaxMonthly } from '@/lib/retirement'
import type { RetirementParams, RetirementResult } from '@/lib/types'

interface Props {
  params: RetirementParams
  result: RetirementResult
  decision: 'retire' | 'spend'
}

export default function RetirementMobileStatus({ params, result, decision }: Props) {
  const yearsToRetire = result.fi4.years_to_retire
  const stress = yearsToRetire === null ? null : calculateHistoricalMarketStress(params, result.fi4.required, yearsToRetire)

  if (decision === 'spend') {
    return (
      <aside className="mobile-live-status" aria-label="即時退休結果">
        <div><span>現在可花</span><strong>NT$ {Math.round(calculateCurrentMaxMonthly(params)).toLocaleString()}</strong></div>
        <div><span>規劃終點</span><strong>{params.death_age} 歲</strong></div>
        <div><span>終點保留</span><strong>NT$ {Math.round(params.bequest).toLocaleString()}</strong></div>
      </aside>
    )
  }

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
