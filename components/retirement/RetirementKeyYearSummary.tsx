import type { RetirementYearRow } from '@/lib/types'

interface Props {
  fi4Table: RetirementYearRow[]
  filtTable: RetirementYearRow[]
}

function money(value: number): string {
  return `NT$ ${Math.round(value).toLocaleString()}`
}

function keyRows(rows: RetirementYearRow[]): RetirementYearRow[] {
  const selected = [
    rows[0],
    rows.find((row) => row.age.startsWith('65 ')),
    rows.find((row) => row.age.startsWith('75 ')),
    rows[rows.length - 1],
  ].filter((row): row is RetirementYearRow => Boolean(row))

  return Array.from(new Map(selected.map((row) => [row.year, row])).values())
}

function ModeSummary({ title, rows }: { title: string; rows: RetirementYearRow[] }) {
  return (
    <div>
      <h3>{title}</h3>
      <div className="key-year-grid">
        {keyRows(rows).map((row) => (
          <div className="key-year-card" key={`${title}-${row.year}`}>
            <p className="metric-label">{row.year} · {row.age}</p>
            <p className="metric-value">{money(row.end_asset)}</p>
            <p className="metric-subtext">月花費 {money(row.monthly_expense)} · {row.depleted ? '耗盡' : '延續'}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function RetirementKeyYearSummary({ fi4Table, filtTable }: Props) {
  return (
    <section className="card stack">
      <h2>關鍵年份摘要</h2>
      <ModeSummary title="指定月花費模式" rows={fi4Table} />
      <ModeSummary title="壽命規劃模式" rows={filtTable} />
    </section>
  )
}
