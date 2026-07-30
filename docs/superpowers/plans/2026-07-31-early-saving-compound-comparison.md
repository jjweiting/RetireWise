# Early Saving Compound Comparison Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an educational `早存複利比較` card that compares the current retirement plan against saving extra during the first few pre-retirement years.

**Architecture:** Keep the existing retirement engine as the source of truth. Add a small optional asset-projection seam to `calculateRetirementFI`, then implement `lib/earlySaving.ts` as a focused comparison helper and render it with a new UI component near sensitivity analysis.

**Tech Stack:** Next.js static app, React 19, TypeScript, Node `tsx --test`, existing CSS in `app/globals.css`.

---

## File Structure

- Modify `lib/retirement.ts`: export `futureValue`, add `RetirementCalculationOptions`, and let `calculateRetirementFI` use an optional `projectAsset(years)` function for pre-retirement asset projection.
- Create `lib/earlySaving.ts`: calculate baseline vs accelerated-saving comparison, format comparison labels, and expose UI-ready result data.
- Create `lib/earlySaving.test.ts`: focused tests for contribution totals, improved assets, FI timing, and safe unavailable metrics.
- Create `components/retirement/RetirementEarlySavingComparison.tsx`: render controls, explanation text, and metric rows.
- Modify `app/page.tsx`: own acceleration UI state and render the new component after sensitivity analysis.
- Modify `app/globals.css`: add compact comparison-card styles that reuse the existing card visual language.

---

### Task 1: Add Optional Asset Projection To Retirement Engine

**Files:**
- Modify: `lib/retirement.ts`
- Test: `lib/retirement.test.ts`

- [ ] **Step 1: Write the failing regression tests**

Append these tests to `lib/retirement.test.ts`:

```ts
test('futureValue handles zero and positive annual returns', () => {
  assert.equal(futureValue(100_000, 10_000, 0, 2), 340_000)
  assert.ok(futureValue(100_000, 10_000, 0.05, 2) > 340_000)
})

test('calculateRetirementFI can use a custom asset projection', () => {
  const baseline = calculateRetirementFI(DEFAULT_PARAMS)
  const boosted = calculateRetirementFI(DEFAULT_PARAMS, {
    projectAsset: (years) => futureValue(DEFAULT_PARAMS.current_base, DEFAULT_PARAMS.monthly_saving, DEFAULT_PARAMS.pre_return / 100, years) + 10_000_000,
  })

  assert.ok(boosted.fi4.years_to_retire !== null)
  assert.ok(baseline.fi4.years_to_retire !== null)
  assert.ok(boosted.fi4.years_to_retire <= baseline.fi4.years_to_retire)
})
```

Update the import at the top of `lib/retirement.test.ts`:

```ts
import { calculateRetirementFI, DEFAULT_PARAMS, futureValue } from './retirement'
```

- [ ] **Step 2: Run the focused test to verify it fails**

Run: `npx tsx --test lib/retirement.test.ts`

Expected: FAIL because `futureValue` is not exported and `calculateRetirementFI` does not accept a second options argument.

- [ ] **Step 3: Add the projection seam**

In `lib/retirement.ts`, replace the first import and top constants with this block:

```ts
import type { RetirementModeResult, RetirementParams, RetirementResult, RetirementYearRow } from './types'

const CURRENT_YEAR = new Date().getFullYear()
const MAX_SEARCH_YEARS = 60
const BINARY_SEARCH_MAX_ASSET = 2_000_000_000

export interface RetirementCalculationOptions {
  projectAsset?: (years: number) => number
}
```

Change the `calculateRetirementFI` signature and its pre-retirement projection setup to this:

```ts
export function calculateRetirementFI(params: RetirementParams, options: RetirementCalculationOptions = {}): RetirementResult {
  const errors = validateRetirementParams(params)
  if (errors.length > 0) {
    throw new Error(errors[0])
  }

  const preReturn = params.pre_return / 100
  const postReturn = params.post_return / 100
  const inflation = params.inflation / 100
  const projectAsset = options.projectAsset ?? ((years: number) => futureValue(params.current_base, params.monthly_saving, preReturn, years))
  const fixedExpenseMode = calculateFixedExpenseMode(params, preReturn, postReturn, inflation, projectAsset)
  const yearsToRetire = fixedExpenseMode.years_to_retire ?? 30
  const retireYear = CURRENT_YEAR + yearsToRetire
  const retireAge = params.current_age + yearsToRetire
  const yearsAfterRetirement = Math.max(params.death_age - retireAge, 1)
  const retirementAsset = projectAsset(yearsToRetire)
  const maxMonthly = calculateMaxMonthly(retirementAsset, postReturn, inflation, yearsAfterRetirement, params.bequest)
  const lifespanTable = simulateRetirement(
    retirementAsset,
    maxMonthly,
    inflation,
    postReturn,
    retireYear,
    yearsAfterRetirement,
    retireAge,
  )

  return {
    fi4: fixedExpenseMode,
    filt: {
      years_to_retire: yearsToRetire,
      retire_year: retireYear,
      retire_age: retireAge,
      required: retirementAsset,
      gap: 0,
      progress: 100,
      monthly_at_retire: maxMonthly,
      table: lifespanTable,
    },
    filt_max_monthly: Math.round(maxMonthly),
    filt_retire_year_input: retireYear,
  }
}
```

Change the `calculateFixedExpenseMode` signature and projected-asset calls to this:

```ts
function calculateFixedExpenseMode(
  params: RetirementParams,
  preReturn: number,
  postReturn: number,
  inflation: number,
  projectAsset: (years: number) => number,
): RetirementModeResult {
  let yearsToRetire: number | null = null
  let requiredAtRetirement = 0
  let projectedAtRetirement = 0
  const maxRetirementYears = Math.min(MAX_SEARCH_YEARS, Math.max(params.death_age - params.current_age - 1, 0))

  for (let years = 1; years <= maxRetirementYears; years += 1) {
    const projected = projectAsset(years)
    const retireAge = params.current_age + years
    const yearsAfter = Math.max(params.death_age - retireAge, 1)
    const required = findRequiredPrincipal(params.monthly_expense, postReturn, inflation, years, yearsAfter)

    if (projected >= required) {
      yearsToRetire = years
      requiredAtRetirement = required
      projectedAtRetirement = projected
      break
    }

    requiredAtRetirement = required
    projectedAtRetirement = projected
  }

  const displayYears = yearsToRetire ?? Math.max(maxRetirementYears, 1)
  const retireYear = CURRENT_YEAR + displayYears
  const retireAge = params.current_age + displayYears
  const yearsAfter = Math.max(params.death_age - retireAge, 1)
  const required = yearsToRetire === null
    ? findRequiredPrincipal(params.monthly_expense, postReturn, inflation, displayYears, yearsAfter)
    : requiredAtRetirement
  const projected = yearsToRetire === null
    ? projectAsset(displayYears)
    : projectedAtRetirement
  const monthlyAtRetire = params.monthly_expense * (1 + inflation) ** displayYears
  const gap = Math.max(required - projected, 0)
  const progress = required > 0 ? Math.min((projected / required) * 100, 100) : 100
  const projectionTable: RetirementYearRow[] = [{
    year: retireYear,
    age: `${retireAge} 歲`,
    monthly_expense: Math.round(monthlyAtRetire),
    annual_expense: Math.round(monthlyAtRetire * 12),
    investment_return: 0,
    end_asset: Math.round(projected),
    depleted: false,
  }]

  return {
    years_to_retire: yearsToRetire,
    retire_year: yearsToRetire === null ? null : retireYear,
    retire_age: yearsToRetire === null ? null : retireAge,
    required,
    gap,
    progress,
    monthly_at_retire: monthlyAtRetire,
    table: yearsToRetire === null
      ? projectionTable
      : simulateRetirement(required, monthlyAtRetire, inflation, postReturn, retireYear, yearsAfter, retireAge),
  }
}
```

Export the existing `futureValue` helper by changing its declaration to:

```ts
export function futureValue(currentBase: number, monthlySaving: number, annualReturn: number, years: number): number {
  const annualSaving = monthlySaving * 12
  if (annualReturn === 0) {
    return currentBase + annualSaving * years
  }

  return currentBase * (1 + annualReturn) ** years
    + annualSaving * (((1 + annualReturn) ** years - 1) / annualReturn)
}
```

- [ ] **Step 4: Run focused tests**

Run: `npx tsx --test lib/retirement.test.ts`

Expected: PASS for all tests in `lib/retirement.test.ts`.

- [ ] **Step 5: Commit**

```bash
git add lib/retirement.ts lib/retirement.test.ts
git commit -m "feat: support custom retirement asset projections"
```

---

### Task 2: Add Early Saving Comparison Helper

**Files:**
- Create: `lib/earlySaving.ts`
- Create: `lib/earlySaving.test.ts`

- [ ] **Step 1: Write the failing helper tests**

Create `lib/earlySaving.test.ts` with this content:

```ts
import test from 'node:test'
import assert from 'node:assert/strict'
import { calculateEarlySavingComparison } from './earlySaving'
import { DEFAULT_PARAMS } from './retirement'

test('extra early saving increases lifespan ending assets', () => {
  const comparison = calculateEarlySavingComparison(DEFAULT_PARAMS, 5, 5_000)

  assert.ok(comparison.assetDifferenceAtLifespan > 0)
  assert.ok(comparison.acceleratedEndingAssetAtLifespan > comparison.baselineEndingAssetAtLifespan)
})

test('total extra contribution uses acceleration years and monthly amount', () => {
  const comparison = calculateEarlySavingComparison(DEFAULT_PARAMS, 5, 5_000)

  assert.equal(comparison.totalExtraContribution, 300_000)
})

test('total extra contribution is capped by applicable pre-retirement years', () => {
  const comparison = calculateEarlySavingComparison({ ...DEFAULT_PARAMS, current_base: 100_000_000 }, 10, 5_000)

  assert.equal(comparison.totalExtraContribution, comparison.applicableAccelerationYears * 12 * 5_000)
  assert.ok(comparison.applicableAccelerationYears <= 10)
})

test('accelerated saving does not make FI later when both plans reach FI', () => {
  const comparison = calculateEarlySavingComparison(DEFAULT_PARAMS, 5, 20_000)

  assert.ok(comparison.baselineFiYear !== null)
  assert.ok(comparison.acceleratedFiYear !== null)
  assert.ok(comparison.fiYearDelta !== null)
  assert.ok(comparison.fiYearDelta >= 0)
})

test('unavailable depletion comparison is represented safely', () => {
  const comparison = calculateEarlySavingComparison({ ...DEFAULT_PARAMS, current_base: 100_000_000 }, 5, 5_000)

  assert.equal(comparison.depletionYearDelta, null)
  assert.match(comparison.depletionLabel, /尚無法比較|都能支撐/)
})
```

- [ ] **Step 2: Run the helper tests to verify they fail**

Run: `npx tsx --test lib/earlySaving.test.ts`

Expected: FAIL because `lib/earlySaving.ts` does not exist.

- [ ] **Step 3: Implement `lib/earlySaving.ts`**

Create `lib/earlySaving.ts` with this content:

```ts
import { calculateRetirementFI, futureValue } from './retirement'
import type { RetirementParams, RetirementResult, RetirementYearRow } from './types'

export interface EarlySavingComparison {
  accelerationYears: number
  extraMonthlySaving: number
  applicableAccelerationYears: number
  totalExtraContribution: number
  baseline: RetirementResult
  accelerated: RetirementResult
  baselineFiYear: number | null
  acceleratedFiYear: number | null
  fiYearDelta: number | null
  baselineDepletionYear: number | null
  acceleratedDepletionYear: number | null
  depletionYearDelta: number | null
  baselineEndingAssetAtLifespan: number
  acceleratedEndingAssetAtLifespan: number
  assetDifferenceAtLifespan: number
  headline: string
  fiLabel: string
  depletionLabel: string
}

export function calculateEarlySavingComparison(
  params: RetirementParams,
  accelerationYears: number,
  extraMonthlySaving: number,
): EarlySavingComparison {
  const safeAccelerationYears = Math.max(Math.floor(accelerationYears), 0)
  const safeExtraMonthlySaving = Math.max(extraMonthlySaving, 0)
  const preReturn = params.pre_return / 100
  const baseline = calculateRetirementFI(params)
  const accelerated = calculateRetirementFI(params, {
    projectAsset: (years) => projectAssetWithEarlyExtraSaving(params, preReturn, safeAccelerationYears, safeExtraMonthlySaving, years),
  })
  const baselineFiYear = baseline.fi4.gap <= 0 ? baseline.fi4.retire_year : null
  const acceleratedFiYear = accelerated.fi4.gap <= 0 ? accelerated.fi4.retire_year : null
  const fiYearDelta = baselineFiYear !== null && acceleratedFiYear !== null ? baselineFiYear - acceleratedFiYear : null
  const baselineDepletionYear = findDepletionYear(baseline.fi4.table)
  const acceleratedDepletionYear = findDepletionYear(accelerated.fi4.table)
  const depletionYearDelta = baselineDepletionYear !== null && acceleratedDepletionYear !== null
    ? acceleratedDepletionYear - baselineDepletionYear
    : null
  const applicableAccelerationYears = Math.min(safeAccelerationYears, accelerated.fi4.years_to_retire ?? safeAccelerationYears)
  const totalExtraContribution = applicableAccelerationYears * 12 * safeExtraMonthlySaving
  const baselineEndingAssetAtLifespan = getEndingAssetAtLifespan(baseline.fi4.table)
  const acceleratedEndingAssetAtLifespan = getEndingAssetAtLifespan(accelerated.fi4.table)
  const assetDifferenceAtLifespan = acceleratedEndingAssetAtLifespan - baselineEndingAssetAtLifespan

  return {
    accelerationYears: safeAccelerationYears,
    extraMonthlySaving: safeExtraMonthlySaving,
    applicableAccelerationYears,
    totalExtraContribution,
    baseline,
    accelerated,
    baselineFiYear,
    acceleratedFiYear,
    fiYearDelta,
    baselineDepletionYear,
    acceleratedDepletionYear,
    depletionYearDelta,
    baselineEndingAssetAtLifespan,
    acceleratedEndingAssetAtLifespan,
    assetDifferenceAtLifespan,
    headline: formatHeadline(safeAccelerationYears, safeExtraMonthlySaving, totalExtraContribution, fiYearDelta, depletionYearDelta, baselineFiYear, acceleratedFiYear),
    fiLabel: formatFiLabel(baselineFiYear, acceleratedFiYear, fiYearDelta),
    depletionLabel: formatDepletionLabel(baselineDepletionYear, acceleratedDepletionYear, depletionYearDelta),
  }
}

function projectAssetWithEarlyExtraSaving(
  params: RetirementParams,
  preReturn: number,
  accelerationYears: number,
  extraMonthlySaving: number,
  years: number,
): number {
  const firstPhaseYears = Math.min(years, accelerationYears)
  const secondPhaseYears = Math.max(years - firstPhaseYears, 0)
  const firstPhaseAsset = futureValue(
    params.current_base,
    params.monthly_saving + extraMonthlySaving,
    preReturn,
    firstPhaseYears,
  )

  return futureValue(firstPhaseAsset, params.monthly_saving, preReturn, secondPhaseYears)
}

function findDepletionYear(rows: RetirementYearRow[]): number | null {
  return rows.find((row) => row.depleted)?.year ?? null
}

function getEndingAssetAtLifespan(rows: RetirementYearRow[]): number {
  return rows.at(-1)?.end_asset ?? 0
}

function money(value: number): string {
  return `NT$${Math.round(value).toLocaleString()}`
}

function formatHeadline(
  accelerationYears: number,
  extraMonthlySaving: number,
  totalExtraContribution: number,
  fiYearDelta: number | null,
  depletionYearDelta: number | null,
  baselineFiYear: number | null,
  acceleratedFiYear: number | null,
): string {
  const prefix = `如果你在前 ${accelerationYears} 年每月多存 ${money(extraMonthlySaving)}，總共多投入 ${money(totalExtraContribution)}。`
  if (baselineFiYear === null && acceleratedFiYear !== null) {
    return `${prefix} 在目前假設下，這筆前期投入可能讓原本尚未達成的 FI 目標變成 ${acceleratedFiYear} 年達成。`
  }
  if (fiYearDelta !== null && fiYearDelta > 0 && depletionYearDelta !== null && depletionYearDelta > 0) {
    return `${prefix} 在目前假設下，這筆前期投入可能讓 FI 年提前 ${fiYearDelta} 年，並讓退休後資產多支撐約 ${depletionYearDelta} 年。`
  }
  if (fiYearDelta !== null && fiYearDelta > 0) {
    return `${prefix} 在目前假設下，這筆前期投入可能讓 FI 年提前 ${fiYearDelta} 年。`
  }
  if (depletionYearDelta !== null && depletionYearDelta > 0) {
    return `${prefix} 在目前假設下，這筆前期投入可能讓退休後資產多支撐約 ${depletionYearDelta} 年。`
  }
  return `${prefix} 在目前假設下，這筆前期投入主要反映在預期壽命時的剩餘資產差額。`
}

function formatFiLabel(baselineFiYear: number | null, acceleratedFiYear: number | null, fiYearDelta: number | null): string {
  if (baselineFiYear === null && acceleratedFiYear === null) return '兩者皆尚未達成 FI'
  if (baselineFiYear === null && acceleratedFiYear !== null) return `加速後 ${acceleratedFiYear} 年達成 FI`
  if (baselineFiYear !== null && acceleratedFiYear === null) return '加速後仍尚無 FI 年份'
  if (fiYearDelta === null) return '尚無法比較'
  if (fiYearDelta > 0) return `提早 ${fiYearDelta} 年`
  if (fiYearDelta < 0) return `延後 ${Math.abs(fiYearDelta)} 年`
  return '無變化'
}

function formatDepletionLabel(
  baselineDepletionYear: number | null,
  acceleratedDepletionYear: number | null,
  depletionYearDelta: number | null,
): string {
  if (baselineDepletionYear === null && acceleratedDepletionYear === null) return '兩者都能支撐到預期壽命'
  if (baselineDepletionYear !== null && acceleratedDepletionYear === null) return '加速後可支撐到預期壽命'
  if (baselineDepletionYear === null && acceleratedDepletionYear !== null) return '加速後仍需檢查耗盡風險'
  if (depletionYearDelta === null) return '尚無法比較'
  if (depletionYearDelta > 0) return `多支撐 ${depletionYearDelta} 年`
  if (depletionYearDelta < 0) return `少支撐 ${Math.abs(depletionYearDelta)} 年`
  return '無變化'
}
```

- [ ] **Step 4: Run helper tests**

Run: `npx tsx --test lib/earlySaving.test.ts`

Expected: PASS for all tests in `lib/earlySaving.test.ts`.

- [ ] **Step 5: Run all library tests**

Run: `npm test`

Expected: PASS for all test files under `lib/**/*.test.ts`.

- [ ] **Step 6: Commit**

```bash
git add lib/earlySaving.ts lib/earlySaving.test.ts
git commit -m "feat: add early saving comparison helper"
```

---

### Task 3: Create Early Saving Comparison Component

**Files:**
- Create: `components/retirement/RetirementEarlySavingComparison.tsx`

- [ ] **Step 1: Create the component**

Create `components/retirement/RetirementEarlySavingComparison.tsx` with this content:

```tsx
import { calculateEarlySavingComparison } from '@/lib/earlySaving'
import type { RetirementParams } from '@/lib/types'

interface Props {
  params: RetirementParams
  accelerationYears: number
  extraMonthlySaving: number
  onAccelerationYearsChange: (value: number) => void
  onExtraMonthlySavingChange: (value: number) => void
}

function money(value: number): string {
  const sign = value > 0 ? '+' : value < 0 ? '-' : ''
  return `${sign}NT$ ${Math.abs(Math.round(value)).toLocaleString()}`
}

function plainMoney(value: number): string {
  return `NT$ ${Math.round(value).toLocaleString()}`
}

export default function RetirementEarlySavingComparison({
  params,
  accelerationYears,
  extraMonthlySaving,
  onAccelerationYearsChange,
  onExtraMonthlySavingChange,
}: Props) {
  const comparison = calculateEarlySavingComparison(params, accelerationYears, extraMonthlySaving)

  return (
    <section className="card early-saving-card">
      <h2>早存複利比較</h2>
      <p className="hint">看看前期多存一點，經過複利後可能換來多少退休安全感。</p>

      <div className="early-saving-controls">
        <label className="field">
          <span className="field-row">
            <span>前期加速年數</span>
            <span>{accelerationYears} 年</span>
          </span>
          <input
            type="range"
            min={1}
            max={10}
            step={1}
            value={accelerationYears}
            onChange={(event) => onAccelerationYearsChange(Number(event.target.value))}
          />
        </label>

        <label className="field">
          <span className="field-row">
            <span>每月多存金額</span>
            <span>{plainMoney(extraMonthlySaving)}</span>
          </span>
          <input
            type="range"
            min={1000}
            max={50000}
            step={1000}
            value={extraMonthlySaving}
            onChange={(event) => onExtraMonthlySavingChange(Number(event.target.value))}
          />
        </label>
      </div>

      <p className="early-saving-headline">{comparison.headline}</p>

      <div className="early-saving-metrics">
        <div className="metric">
          <div className="metric-label">總追加投入</div>
          <p className="metric-value">{plainMoney(comparison.totalExtraContribution)}</p>
          <p className="metric-subtext">實際加速 {comparison.applicableAccelerationYears} 年</p>
        </div>
        <div className="metric">
          <div className="metric-label">FI 年變化</div>
          <p className="metric-value">{comparison.fiLabel}</p>
          <p className="metric-subtext">以指定月花費模式比較</p>
        </div>
        <div className="metric">
          <div className="metric-label">耗盡年變化</div>
          <p className="metric-value">{comparison.depletionLabel}</p>
          <p className="metric-subtext">若表格出現耗盡年份才比較</p>
        </div>
        <div className="metric">
          <div className="metric-label">壽命終點資產差額</div>
          <p className="metric-value">{money(comparison.assetDifferenceAtLifespan)}</p>
          <p className="metric-subtext">加速方案 - 原方案</p>
        </div>
      </div>
    </section>
  )
}
```

- [ ] **Step 2: Run TypeScript check to catch component errors**

Run: `npx tsc --noEmit`

Expected: PASS with no TypeScript errors.

- [ ] **Step 3: Commit**

```bash
git add components/retirement/RetirementEarlySavingComparison.tsx
git commit -m "feat: add early saving comparison component"
```

---

### Task 4: Integrate Component And Styles

**Files:**
- Modify: `app/page.tsx`
- Modify: `app/globals.css`

- [ ] **Step 1: Import and render the component**

In `app/page.tsx`, add this import after `RetirementCurveChart`:

```ts
import RetirementEarlySavingComparison from '@/components/retirement/RetirementEarlySavingComparison'
```

Add these state values after `selectedPresetId`:

```ts
  const [accelerationYears, setAccelerationYears] = useState(5)
  const [extraMonthlySaving, setExtraMonthlySaving] = useState(5_000)
```

Render the component immediately after `RetirementSensitivity params={params}`:

```tsx
              <RetirementSensitivity params={params} />
              <RetirementEarlySavingComparison
                params={params}
                accelerationYears={accelerationYears}
                extraMonthlySaving={extraMonthlySaving}
                onAccelerationYearsChange={setAccelerationYears}
                onExtraMonthlySavingChange={setExtraMonthlySaving}
              />
```

- [ ] **Step 2: Add CSS styles**

Append this block to `app/globals.css` before the `@media (max-width: 900px)` section:

```css
.early-saving-card {
  background: linear-gradient(135deg, rgba(255, 251, 235, 0.9), rgba(255, 255, 255, 0.88));
}

.early-saving-controls {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin: 16px 0;
}

.early-saving-headline {
  border: 1px solid rgba(180, 83, 9, 0.22);
  border-radius: 20px;
  background: rgba(255, 251, 235, 0.8);
  color: #854d0e;
  line-height: 1.75;
  margin: 0 0 14px;
  padding: 14px;
}

.early-saving-metrics {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.early-saving-metrics .metric-value {
  font-size: 1.05rem;
  letter-spacing: -0.02em;
}
```

Inside the existing `@media (max-width: 620px)` block, replace:

```css
  .key-year-grid,
  .sensitivity-row {
    grid-template-columns: 1fr;
  }
```

with:

```css
  .key-year-grid,
  .early-saving-controls,
  .early-saving-metrics,
  .sensitivity-row {
    grid-template-columns: 1fr;
  }
```

- [ ] **Step 3: Run tests and build**

Run: `npm test`

Expected: PASS.

Run: `npm run build`

Expected: PASS and static export completes successfully.

- [ ] **Step 4: Commit**

```bash
git add app/page.tsx app/globals.css
git commit -m "feat: show early saving compound comparison"
```

---

### Task 5: Final Verification And Documentation Check

**Files:**
- Modify: `README.md` if the implemented UI materially changes the documented feature list.

- [ ] **Step 1: Check whether README needs a feature bullet**

If the feature is implemented, add this bullet under `## Phase 1 功能` after the sensitivity/share-related items that are already present in the current README version:

```md
- 早存複利比較：設定前期加速年數與每月多存金額，比較原方案與加速方案的 FI 年、耗盡年與壽命終點資產差額。
```

If `README.md` still only lists Phase 1 basics and does not mention Phase 2 features, add the bullet after `情境儲存` so the public feature list remains current.

- [ ] **Step 2: Run final verification**

Run: `npm test`

Expected: PASS.

Run: `npm run build`

Expected: PASS.

Run: `git status --short`

Expected: only intended files are modified, or no output after the final commit.

- [ ] **Step 3: Commit documentation if changed**

If `README.md` changed, run:

```bash
git add README.md
git commit -m "docs: document early saving comparison"
```

If `README.md` did not change, do not create an empty commit.

---

## Self-Review Notes

- Spec coverage: The plan includes the educational card, two controls, baseline vs accelerated comparison, FI/depletion/lifespan-end metrics, browser-only UI state, no accounting import, no share or localStorage schema changes, and tests.
- Scope control: The plan does not add multiple saving schedules, optimization, Monte Carlo, exports, cloud sync, or accounting import.
- Type consistency: `EarlySavingComparison`, `calculateEarlySavingComparison`, `RetirementCalculationOptions`, `projectAsset`, and component prop names are consistent across tasks.
