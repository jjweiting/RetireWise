'use client'

import { useEffect, useState } from 'react'
import RetirementCurveChart from '@/components/retirement/RetirementCurveChart'
import RetirementEarlySavingComparison from '@/components/retirement/RetirementEarlySavingComparison'
import RetirementKeyYearSummary from '@/components/retirement/RetirementKeyYearSummary'
import RetirementMarketStress from '@/components/retirement/RetirementMarketStress'
import RetirementMobileStatus from '@/components/retirement/RetirementMobileStatus'
import RetirementParams from '@/components/retirement/RetirementParams'
import RetirementPresetSelector from '@/components/retirement/RetirementPresetSelector'
import RetirementScenarioManager from '@/components/retirement/RetirementScenarioManager'
import RetirementSensitivity from '@/components/retirement/RetirementSensitivity'
import RetirementSharePanel from '@/components/retirement/RetirementSharePanel'
import RetirementSummaryCards from '@/components/retirement/RetirementSummaryCards'
import RetirementYearlyTable from '@/components/retirement/RetirementYearlyTable'
import { touchesPresetControlledParams, type RetirementPreset } from '@/lib/presets'
import { calculateRetirementFI, DEFAULT_PARAMS, validateRetirementParams } from '@/lib/retirement'
import { buildShareUrl, parseSharedParams } from '@/lib/share'
import { deleteSavedScenario, loadSavedScenarios, saveSavedScenarios } from '@/lib/storage'
import type { RetirementParams as RetirementParamsType, RetirementResult, SavedScenario } from '@/lib/types'

function createId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function calculateSafely(params: RetirementParamsType): RetirementResult | null {
  try {
    return calculateRetirementFI(params)
  } catch {
    return null
  }
}

export default function Home() {
  const [params, setParams] = useState<RetirementParamsType>(DEFAULT_PARAMS)
  const [scenarios, setScenarios] = useState<SavedScenario[]>([])
  const [sharedName, setSharedName] = useState<string | null>(null)
  const [selectedPresetId, setSelectedPresetId] = useState<RetirementPreset['id'] | null>(null)
  const [accelerationYears, setAccelerationYears] = useState(5)
  const [extraMonthlySaving, setExtraMonthlySaving] = useState(5_000)
  const [shareUrl, setShareUrl] = useState('')
  const [mobilePanel, setMobilePanel] = useState<'inputs' | 'results'>('inputs')
  const [decision, setDecision] = useState<'retire' | 'spend'>('retire')
  const errors = validateRetirementParams(params)
  const result = errors.length === 0 ? calculateSafely(params) : null

  useEffect(() => {
    const shared = parseSharedParams(window.location.search, DEFAULT_PARAMS)
    setParams(shared.params)
    setSharedName(shared.name)
    setScenarios(loadSavedScenarios())
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    setShareUrl(buildShareUrl(window.location.origin, window.location.pathname, params, sharedName))
  }, [params, sharedName])

  const updateParams = (updates: Partial<RetirementParamsType>) => {
    setSharedName(null)
    if (touchesPresetControlledParams(updates)) setSelectedPresetId(null)
    setParams((current) => ({ ...current, ...updates }))
  }

  const applyPreset = (preset: RetirementPreset) => {
    setSharedName(null)
    setSelectedPresetId(preset.id)
    setParams((current) => ({
      ...preset.params,
      current_base: current.current_base,
      monthly_saving: current.monthly_saving,
      basis_label: current.basis_label,
      market_stress_level: current.market_stress_level,
    }))
  }

  const saveScenario = (name: string) => {
    if (!result) return

    const now = new Date().toISOString()
    const next: SavedScenario[] = [
      {
        id: createId(),
        name,
        params,
        summary: {
          fi_year: result.fi4.gap <= 0 ? result.fi4.retire_year : null,
          required_assets: result.fi4.required,
          max_monthly_spending: result.filt_max_monthly,
        },
        created_at: now,
        updated_at: now,
      },
      ...scenarios,
    ]

    saveSavedScenarios(next)
    setScenarios(next)
  }

  const saveSharedScenario = () => {
    if (!sharedName) return
    saveScenario(sharedName)
    setSharedName(null)
  }

  const applyScenario = (scenario: SavedScenario) => {
    setSelectedPresetId(null)
    setParams({
      ...DEFAULT_PARAMS,
      ...scenario.params,
      monthly_saving: Math.min(Math.round(scenario.params.monthly_saving / 10_000) * 10_000, 150_000),
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const removeScenario = (id: string) => {
    setScenarios(deleteSavedScenario(id))
  }

  return (
    <main className="page">
      <header className="hero">
        <div>
          <p className="eyebrow">RetireWise Public</p>
          <p className="lead">
            輸入自己的資產、儲蓄、生活費與報酬假設，快速比較「指定月花費」與「壽命規劃」兩種退休路徑。
          </p>
          <div className="badges">
            <span className="badge">不需登入</span>
            <span className="badge">不上傳資料</span>
            <span className="badge">情境存在你的瀏覽器</span>
          </div>
        </div>
        <aside className="disclaimer">
          本工具僅供退休規劃試算與情境比較，不構成投資、稅務或法律建議。實際退休計畫仍需考量市場波動、稅制、保險與個人現金流。
        </aside>
      </header>

      <nav className="mobile-workspace-tabs" aria-label="手機工作台區塊" role="tablist">
        <button
          aria-selected={mobilePanel === 'inputs'}
          className={mobilePanel === 'inputs' ? 'mobile-workspace-tab mobile-workspace-tab-selected' : 'mobile-workspace-tab'}
          onClick={() => setMobilePanel('inputs')}
          role="tab"
          type="button"
        >
          輸入設定
        </button>
        <button
          aria-selected={mobilePanel === 'results'}
          className={mobilePanel === 'results' ? 'mobile-workspace-tab mobile-workspace-tab-selected' : 'mobile-workspace-tab'}
          onClick={() => setMobilePanel('results')}
          role="tab"
          type="button"
        >
          結果報告
        </button>
      </nav>

      <div className={`studio-layout mobile-panel-${mobilePanel}`}>
        <aside className="studio-controls">
          <RetirementPresetSelector selectedPresetId={selectedPresetId} onApply={applyPreset} />
          <RetirementParams params={params} errors={errors} onChange={updateParams} />
        </aside>
        <div className="studio-canvas stack">
          <p className="eyebrow studio-label">情境工作台</p>
          {result ? <>
            <nav className="decision-tabs" aria-label="退休決策模式" role="tablist">
              <button aria-selected={decision === 'retire'} className={decision === 'retire' ? 'decision-tab decision-tab-selected' : 'decision-tab'} onClick={() => setDecision('retire')} role="tab" type="button">何時能退休</button>
              <button aria-selected={decision === 'spend'} className={decision === 'spend' ? 'decision-tab decision-tab-selected' : 'decision-tab'} onClick={() => setDecision('spend')} role="tab" type="button">現在能花多少</button>
            </nav>
            <div className="studio-live-results">
              <RetirementSummaryCards decision={decision} result={result} params={params} />
              {decision === 'retire' && <RetirementMarketStress result={result} params={params} />}
            </div>
            {decision === 'retire' ? <>
              <RetirementCurveChart result={result} />
              <RetirementSensitivity params={params} />
              <RetirementEarlySavingComparison
                params={params}
                accelerationYears={accelerationYears}
                extraMonthlySaving={extraMonthlySaving}
                onAccelerationYearsChange={setAccelerationYears}
                onExtraMonthlySavingChange={setExtraMonthlySaving}
              />
              <RetirementKeyYearSummary fi4Table={result.fi4.table} filtTable={result.filt.table} />
              <RetirementYearlyTable fi4Table={result.fi4.table} filtTable={result.filt.table} />
            </> : <section className="card">
              <h2>這個結果代表什麼？</h2>
              <p className="result-lead">此模式假設你今天停止工作，以目前資產支付生活費直到 {params.death_age} 歲。它不計入未來每月投入；若要判斷何時能達到你的目標生活費，請切換到「何時能退休」。</p>
            </section>}
          </> : <InvalidInputCard />}
          <RetirementSharePanel shareUrl={shareUrl} sharedName={sharedName} onSaveShared={saveSharedScenario} />
          <RetirementScenarioManager
            scenarios={scenarios}
            canSave={result !== null}
            onSave={saveScenario}
            onApply={applyScenario}
            onDelete={removeScenario}
          />
        </div>
      </div>
      {result && <RetirementMobileStatus decision={decision} result={result} params={params} />}
    </main>
  )
}

function InvalidInputCard() {
  return <section className="card"><h2>等待有效輸入</h2><p className="error">請先修正參數，系統會自動重新試算。</p></section>
}
