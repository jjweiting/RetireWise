# Early Saving Compound Comparison Design

## Goal

Add an educational interactive comparison that helps users understand why saving more earlier can have an outsized retirement impact. The feature should answer: "If I save a little more during the next few years, how much longer can my retirement assets last?"

The emphasis is education through the user's own numbers, not investment advice or a full cash-flow planning system.

## Current Context

RetireWise is a static Next.js retirement calculator. It already supports manual assumptions, retirement result summaries, sensitivity analysis, asset curves, yearly tables, local browser scenarios, and shareable URLs.

The existing yearly tables reveal an important concept: early additional savings can compound for many years. A small monthly increase near the beginning of the accumulation period can improve FI timing, reduce retirement shortfall risk, or extend the year when assets run out.

This feature should make that lesson explicit and actionable without importing private accounting data or adding backend storage.

## Feature Design

### Early Saving Compound Comparison Card

Add a new results card named `早存複利比較` near the existing sensitivity analysis. It compares the current plan against an accelerated-saving variant.

Inputs:

- `前期加速年數`: default `5`, range `1..10` years.
- `每月多存金額`: default `5000`, range `1000..50000`, step `1000`.

The card should use the current retirement assumptions as the baseline. The accelerated plan keeps every assumption the same except monthly saving:

- During the first N pre-retirement years, monthly saving is `monthly_saving + extra_monthly_saving`.
- After those N years, monthly saving returns to the original `monthly_saving`.

If FI happens before the selected acceleration period ends, only the applicable pre-retirement years should receive the extra saving.

### Educational Output

The primary output should be a short explanation in plain Chinese, for example:

> 如果你在前 5 年每月多存 NT$5,000，總共多投入 NT$300,000。  
> 在目前假設下，這筆前期投入可能讓 FI 年提前 1 年，並讓退休後資產多支撐約 3 年。

Supporting metrics:

- Total extra contribution.
- FI year difference, if baseline and accelerated plans reach FI.
- Depletion year difference, if either plan has a depletion year in the retirement table.
- Asset difference at expected lifespan.
- Whether the accelerated plan changes an unreached-FI case into a reached-FI case.

Use neutral wording such as `可能`, `在目前假設下`, and `試算結果` to avoid implying guaranteed outcomes.

### Calculation Model

Create a focused helper that calculates the accelerated plan without changing global defaults or persisted scenario data.

The helper should:

1. Accept `RetirementParams`, acceleration years, and extra monthly saving.
2. Build a baseline result from existing `calculateRetirementFI`.
3. Build an accelerated result using a retirement-before accumulation path that supports two saving phases.
4. Compare baseline and accelerated results into a compact view model for the UI.

The existing retirement engine assumes a constant monthly saving. The implementation can either add an internal accumulation helper that supports scheduled monthly saving changes or create a small dedicated calculation path for this feature. Prefer the smallest implementation that avoids duplicating the full retirement algorithm.

### Data Flow

`app/page.tsx` should own the acceleration controls as UI-only state. This keeps the feature educational and avoids changing saved scenarios or share URLs in the first version.

Data flow:

1. User changes normal retirement assumptions.
2. Existing result calculation runs as today.
3. The comparison card receives current params and computes baseline vs accelerated comparison.
4. The UI renders the educational explanation and supporting metrics.

Acceleration controls should not clear selected presets because they do not change the user's core market, expense, age, or savings assumptions. They are a temporary educational what-if layer.

## UI Behavior

Place the card near `RetirementSensitivity`, because both features explain how changes affect outcomes. The difference should be clear:

- Sensitivity analysis explains parameter risk.
- Early saving comparison explains an action strategy.

Recommended layout:

- Card title: `早存複利比較`.
- Short intro: `看看前期多存一點，經過複利後可能換來多少退休安全感。`
- Two compact controls for years and monthly amount.
- One prominent explanation paragraph.
- Four small metric chips or rows for total extra contribution, FI change, depletion change, and lifespan-end asset difference.

If the result cannot be calculated because the main form has validation errors, the card should not render. If a specific comparison metric is unavailable, show `尚無法比較` for that metric instead of failing the whole card.

## Edge Cases

- If baseline does not reach FI but accelerated does, say the accelerated plan changes the result from `尚未達成` to a concrete FI year.
- If neither plan reaches FI, focus on the asset difference at the final checked year and avoid claiming retirement is solved.
- If neither plan depletes before expected lifespan, say both plans support the selected lifespan and show the additional ending assets.
- If both plans deplete, compare depletion years.
- If extra monthly saving is `0`, the comparison should show no difference, but the UI default should avoid this case.

## Privacy And Scope

The feature remains browser-only and does not import data from any private accounting project.

Out of scope for the first version:

- Accounting import or automated income/expense analysis.
- Cloud sync.
- Multiple saving schedules.
- Optimizing the best extra saving amount.
- Monte Carlo simulation.
- PDF or CSV export for the comparison.

## Testing

Add focused tests for the comparison helper:

- Extra early saving increases projected assets versus baseline.
- Total extra contribution equals acceleration years times 12 times extra monthly saving, capped by the applicable pre-retirement years if needed.
- Accelerated plan can improve FI timing when the baseline reaches FI later.
- Asset difference at expected lifespan is positive when extra saving is positive and assumptions are valid.
- Invalid or unavailable comparison metrics are represented safely instead of throwing in UI code.

Verification commands should include:

- `npm test`
- `npm run build`
