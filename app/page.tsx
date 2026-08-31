'use client'

import { useEffect, useState } from 'react'
import RetirementCurveChart from '@/components/retirement/RetirementCurveChart'
import RetirementEarlySavingComparison from '@/components/retirement/RetirementEarlySavingComparison'
import RetirementKeyYearSummary from '@/components/retirement/RetirementKeyYearSummary'
import RetirementMarketStress from '@/components/retirement/RetirementMarketStress'
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

type ViewMode = 'dashboard' | 'studio' | 'guide'

const VIEW_MODES: { id: ViewMode; label: string; description: string }[] = [
  { id: 'dashboard', label: '退休儀表板', description: '一眼看懂退休時間與安全度' },
  { id: 'studio', label: '情境工作台', description: '調整假設並即時檢視曲線' },
  { id: 'guide', label: '規劃引導', description: '按步驟完成退休設定' },
]

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
  const [viewMode, setViewMode] = useState<ViewMode>('dashboard')
  const [guideStep, setGuideStep] = useState(1)
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

      <nav className="view-switcher" aria-label="檢視模式" role="tablist">
        {VIEW_MODES.map((mode) => (
          <button
            aria-selected={viewMode === mode.id}
            className={`view-button${viewMode === mode.id ? ' view-button-selected' : ''}`}
            key={mode.id}
            onClick={() => setViewMode(mode.id)}
            role="tab"
            type="button"
          >
            <strong>{mode.label}</strong>
            <span>{mode.description}</span>
          </button>
        ))}
      </nav>

      {viewMode === 'dashboard' && <div className="dashboard-layout">
        <aside className="dashboard-rail">
          <RetirementPresetSelector selectedPresetId={selectedPresetId} onApply={applyPreset} />
          <RetirementParams sections={['start', 'life']} params={params} errors={errors} onChange={updateParams} />
        </aside>
        <div className="dashboard-main">
          {result ? <>
            <RetirementSummaryCards compact variant="dashboard" result={result} params={params} />
            <RetirementMarketStress result={result} params={params} />
          </> : <InvalidInputCard />}
        </div>
      </div>}

      {viewMode === 'studio' && <div className="studio-layout">
        <aside className="studio-controls">
          <RetirementPresetSelector selectedPresetId={selectedPresetId} onApply={applyPreset} />
          <RetirementParams params={params} errors={errors} onChange={updateParams} />
        </aside>
        <div className="studio-canvas stack">
          {result ? <>
            <RetirementCurveChart result={result} />
            <RetirementSummaryCards result={result} params={params} />
            <RetirementMarketStress result={result} params={params} />
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
      </div>}

      {viewMode === 'guide' && <section className="guide-shell">
        <div className="guide-progress" aria-label={`規劃步驟 ${guideStep} / 3`}>
          {[['1', '建立起點'], ['2', '設定安全'], ['3', '查看計畫']].map(([step, label]) => (
            <div className={`guide-step${guideStep === Number(step) ? ' guide-step-current' : ''}${guideStep > Number(step) ? ' guide-step-complete' : ''}`} key={step}>
              <span>{step}</span>{label}
            </div>
          ))}
        </div>
        {guideStep === 1 && <div className="guide-content">
          <div className="guide-intro"><p className="eyebrow">Step 1</p><h2>先建立你的生活起點</h2><p>填入目前可投資資產、退休前投入與退休後想要的生活費。</p></div>
          <RetirementPresetSelector selectedPresetId={selectedPresetId} onApply={applyPreset} />
          <RetirementParams sections={['start', 'life']} params={params} errors={errors} onChange={updateParams} />
        </div>}
        {guideStep === 2 && <div className="guide-content">
          <div className="guide-intro"><p className="eyebrow">Step 2</p><h2>選擇你的安全邊際</h2><p>設定報酬與通膨假設，再選擇你想用哪個歷史安全標準判定退休。</p></div>
          <RetirementParams sections={['returns', 'settings']} params={params} errors={errors} onChange={updateParams} />
        </div>}
        {guideStep === 3 && <div className="guide-content guide-result">
          <div className="guide-intro"><p className="eyebrow">Step 3</p><h2>這是你的退休計畫</h2><p>結果會依前兩步的資產、生活費與安全標準即時更新。</p></div>
          {result ? <><RetirementSummaryCards compact result={result} params={params} /><RetirementMarketStress result={result} params={params} /></> : <InvalidInputCard />}
        </div>}
        <div className="guide-actions">
          <button className="button-secondary" disabled={guideStep === 1} onClick={() => setGuideStep((step) => step - 1)} type="button">上一步</button>
          {guideStep < 3 ? <button className="button-primary" onClick={() => setGuideStep((step) => step + 1)} type="button">下一步</button> : <button className="button-primary" onClick={() => setViewMode('studio')} type="button">到情境工作台細調</button>}
        </div>
      </section>}
    </main>
  )
}

function InvalidInputCard() {
  return <section className="card"><h2>等待有效輸入</h2><p className="error">請先修正參數，系統會自動重新試算。</p></section>
}
