'use client'

import type { RetirementParams as RetirementParamsType } from '@/lib/types'

interface Props {
  params: RetirementParamsType
  errors: string[]
  onChange: (updates: Partial<RetirementParamsType>) => void
}

interface NumberFieldProps {
  label: string
  value: number
  min: number
  max: number
  step: number
  unit: string
  onChange: (value: number) => void
}

function NumberField({ label, value, min, max, step, unit, onChange }: NumberFieldProps) {
  return (
    <label className="field">
      <span className="field-row">
        <span>{label}</span>
        <span>{value.toLocaleString()} {unit}</span>
      </span>
      <input
        type="number"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  )
}

function RangeField({ label, value, min, max, step, unit, onChange }: NumberFieldProps) {
  return (
    <label className="field">
      <span className="field-row">
        <span>{label}</span>
        <span>{value.toLocaleString()} {unit}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  )
}

function TenThousandRangeField({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  const tenThousands = value / 10_000

  return (
    <label className="field">
      <span className="field-row">
        <span>退休前每月投入</span>
        <span>{tenThousands.toLocaleString()} 萬</span>
      </span>
      <input
        type="range"
        min={0}
        max={15}
        step={1}
        value={tenThousands}
        onChange={(event) => onChange(Number(event.target.value) * 10_000)}
      />
    </label>
  )
}

export default function RetirementParams({ params, errors, onChange }: Props) {
  return (
    <section className="card">
      <h2>輸入你的退休假設</h2>

      {errors.length > 0 && (
        <div className="form-section">
          {errors.map((error) => (
            <p className="error" key={error}>{error}</p>
          ))}
        </div>
      )}

      <div className="form-section">
        <p className="form-section-title">資產起點</p>
        <RangeField label="目前可投資資產" value={params.current_base} min={0} max={50_000_000} step={100_000} unit="元" onChange={(current_base) => onChange({ current_base })} />
        <div className="asset-shortcuts" aria-label="資產起點快捷選項">
          {[0, 1_000_000, 3_000_000, 5_000_000, 10_000_000, 20_000_000].map((amount) => (
            <button
              className={`asset-shortcut${params.current_base === amount ? ' asset-shortcut-selected' : ''}`}
              key={amount}
              type="button"
              onClick={() => onChange({ current_base: amount })}
            >
              {amount === 0 ? '0' : `${amount / 10_000} 萬`}
            </button>
          ))}
        </div>
        <TenThousandRangeField value={params.monthly_saving} onChange={(monthly_saving) => onChange({ monthly_saving })} />
      </div>

      <div className="form-section">
        <p className="form-section-title">生活費與時間</p>
        <RangeField label="每月目標生活費" value={params.monthly_expense} min={10_000} max={300_000} step={5_000} unit="元" onChange={(monthly_expense) => onChange({ monthly_expense })} />
        <RangeField label="目前年齡" value={params.current_age} min={18} max={90} step={1} unit="歲" onChange={(current_age) => onChange({ current_age })} />
        <RangeField label="預期壽命" value={params.death_age} min={50} max={120} step={1} unit="歲" onChange={(death_age) => onChange({ death_age })} />
      </div>

      <details className="advanced-settings">
        <summary>進階假設：報酬、壓測與遺產目標</summary>
        <div className="form-section">
          <p className="form-section-title">報酬與通膨</p>
            <RangeField label="退休前年化報酬率" value={params.pre_return} min={0} max={30} step={0.5} unit="%" onChange={(pre_return) => onChange({ pre_return })} />
            <RangeField label="退休後年化報酬率" value={params.post_return} min={0} max={15} step={0.5} unit="%" onChange={(post_return) => onChange({ post_return })} />
            <RangeField label="每年生活費通膨率" value={params.inflation} min={0} max={8} step={0.5} unit="%" onChange={(inflation) => onChange({ inflation })} />
      </div>

      <div className="form-section">
            <p className="form-section-title">模式專屬參數</p>
            <label className="field">
              <span className="field-row">
                <span>退休安全等級</span>
                <span>{safetyLevelLabel(params.market_stress_level)}</span>
              </span>
              <select value={params.market_stress_level} onChange={(event) => onChange({ market_stress_level: event.target.value as RetirementParamsType['market_stress_level'] })}>
                <option value="baseline">基本：固定報酬率</option>
                <option value="historical75">穩健：75% 歷史情境</option>
                <option value="historical90">保守：90% 歷史情境</option>
                <option value="historicalWorst">極端：最差歷史情境</option>
              </select>
            </label>
            <NumberField label="死亡時目標剩餘" value={params.bequest} min={0} max={100_000_000} step={500_000} unit="元" onChange={(bequest) => onChange({ bequest })} />
            <p className="hint">安全等級會直接影響 FI 年份與所需資產。75% / 90% 指能通過該比例的歷史報酬序列。</p>
      </div>
      </details>
    </section>
  )
}

function safetyLevelLabel(level: RetirementParamsType['market_stress_level']): string {
  return { baseline: '基本', historical75: '穩健', historical90: '保守', historicalWorst: '極端' }[level]
}
