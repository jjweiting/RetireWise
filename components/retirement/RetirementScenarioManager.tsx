'use client'

import { useState } from 'react'
import type { SavedScenario } from '@/lib/types'

interface Props {
  scenarios: SavedScenario[]
  canSave: boolean
  onSave: (name: string) => void
  onApply: (scenario: SavedScenario) => void
  onDelete: (id: string) => void
}

function money(value: number): string {
  return `NT$ ${Math.round(value).toLocaleString()}`
}

export default function RetirementScenarioManager({ scenarios, canSave, onSave, onApply, onDelete }: Props) {
  const [name, setName] = useState('')

  const save = () => {
    onSave(name.trim() || `退休情境 ${scenarios.length + 1}`)
    setName('')
  }

  return (
    <section className="card">
      <h2>情境儲存</h2>
      <p className="hint">情境只會存在這台裝置的瀏覽器，不會上傳到伺服器。</p>
      <div className="scenario-actions">
        <input value={name} onChange={(event) => setName(event.target.value)} placeholder="例如：保守退休、積極投資" />
        <button className="button-primary" disabled={!canSave} onClick={save}>儲存目前情境</button>
      </div>

      <div className="scenario-list">
        {scenarios.length === 0 && <p className="hint">尚未儲存情境。</p>}
        {scenarios.map((scenario) => (
          <div className="scenario-row" key={scenario.id}>
            <div>
              <p className="scenario-title">{scenario.name}</p>
              <p className="scenario-meta">
                FI {scenario.summary.fi_year ?? '未達成'} · 需求 {money(scenario.summary.required_assets)} · 壽命月花費 {money(scenario.summary.max_monthly_spending)}
              </p>
            </div>
            <div className="scenario-actions">
              <button className="button-secondary" onClick={() => onApply(scenario)}>套用</button>
              <button className="button-danger" onClick={() => onDelete(scenario.id)}>刪除</button>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
