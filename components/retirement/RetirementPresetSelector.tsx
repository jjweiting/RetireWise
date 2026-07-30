import { RETIREMENT_PRESETS, type RetirementPreset } from '@/lib/presets'

interface Props {
  selectedPresetId: RetirementPreset['id'] | null
  onApply: (preset: RetirementPreset) => void
}

export default function RetirementPresetSelector({ selectedPresetId, onApply }: Props) {
  return (
    <section className="card preset-card">
      <h2>快速套用情境</h2>
      <div className="preset-grid">
        {RETIREMENT_PRESETS.map((preset) => {
          const isSelected = selectedPresetId === preset.id

          return (
            <button
              aria-pressed={isSelected}
              className={`preset-button${isSelected ? ' preset-button-selected' : ''}`}
              key={preset.id}
              onClick={() => onApply(preset)}
            >
              <span className="preset-title">
                {preset.name}
                {isSelected && <span className="preset-selected-label">已選</span>}
              </span>
              <small>{preset.description}</small>
            </button>
          )
        })}
      </div>
    </section>
  )
}
