import { calculateHistoricalMarketStress } from '@/lib/marketStress'
import type { RetirementParams, RetirementResult } from '@/lib/types'

interface Props {
  params: RetirementParams
  result: RetirementResult
  decision: 'preserve' | 'lifespan'
}

export default function RetirementMobileStatus({ params, result, decision }: Props) {
  const mode = decision === 'preserve' ? result.fi4 : result.filt
  const yearsToRetire = mode.years_to_retire
  const stress = yearsToRetire === null ? null : calculateHistoricalMarketStress(params, mode.required, yearsToRetire)

  return (
    <aside className="mobile-live-status" aria-label="即時退休結果">
      <div>
        <span>FI 年份</span>
        <strong>{mode.retire_year ?? '未達成'}</strong>
      </div>
      <div>
        <span>退休年齡</span>
        <strong>{mode.retire_age === null ? '-' : `${mode.retire_age} 歲`}</strong>
      </div>
      <div>
        <span>歷史存活率</span>
        <strong>{stress ? `${Math.round(stress.successRate * 100)}%` : '-'}</strong>
      </div>
    </aside>
  )
}
