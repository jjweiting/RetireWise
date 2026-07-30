import { RETIREMENT_PRESETS } from '@/lib/presets'
import type { RetirementParams } from '@/lib/types'

interface Props {
  onApply: (params: RetirementParams) => void
}

export default function RetirementPresetSelector({ onApply }: Props) {
  return (
    <section className="card preset-card">
      <h2>快速套用情境</h2>
      <div className="preset-grid">
        {RETIREMENT_PRESETS.map((preset) => (
          <button className="preset-button" key={preset.id} onClick={() => onApply(preset.params)}>
            <span>{preset.name}</span>
            <small>{preset.description}</small>
          </button>
        ))}
      </div>
    </section>
  )
}
