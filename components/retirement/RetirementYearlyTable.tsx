import type { RetirementYearRow } from '@/lib/types'

interface Props {
  fi4Table: RetirementYearRow[]
  filtTable: RetirementYearRow[]
}

function money(value: number): string {
  return `NT$ ${Math.round(value).toLocaleString()}`
}

function ModeTable({ title, rows }: { title: string; rows: RetirementYearRow[] }) {
  return (
    <div className="table-wrap">
      <h3>{title}</h3>
      <table>
        <thead>
          <tr>
            <th>年份</th>
            <th>年齡</th>
            <th>月花費</th>
            <th>年花費</th>
            <th>投資報酬</th>
            <th>年末資產</th>
            <th>狀態</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={`${title}-${row.year}`}>
              <td>{row.year}</td>
              <td>{row.age}</td>
              <td>{money(row.monthly_expense)}</td>
              <td>{money(row.annual_expense)}</td>
              <td>{money(row.investment_return)}</td>
              <td>{money(row.end_asset)}</td>
              <td>{row.depleted ? '耗盡' : '延續'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function RetirementYearlyTable({ fi4Table, filtTable }: Props) {
  return (
    <section className="card stack">
      <h2>逐年明細</h2>
      <ModeTable title="指定月花費模式" rows={fi4Table} />
      <ModeTable title="壽命規劃模式" rows={filtTable} />
    </section>
  )
}
