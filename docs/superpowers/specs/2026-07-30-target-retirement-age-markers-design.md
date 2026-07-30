# Target Retirement Age And Chart Markers Design

## Goal

Add a target retirement age workflow that answers: "If I want to retire at this age, how much more do I need to invest each month?" Also mark the target retirement year, projected FI year, and any depletion year on the retirement asset chart.

## Current Context

RetireWise is a static Next.js app. All calculations run in the browser. Scenarios are stored in `localStorage`, and shared scenarios are encoded in the URL query string.

The current calculator already computes:

- A projected FI year for the fixed monthly expense mode.
- Retirement-after asset tables for fixed expense and lifespan planning modes.
- A chart from the yearly retirement tables.

The current app does not let the user set a desired retirement age or reverse-calculate the extra monthly investment required to hit that age.

## Feature Design

### Target Retirement Age Card

Add a new result card near the top of the right-side results stack, close to the existing summary cards.

The card contains a `目標退休年齡` slider.

- Default: `55`
- Minimum: `current_age + 1`
- Maximum: `death_age - 1`
- If the current age or death age changes and the selected target age falls outside the valid range, clamp it into the valid range.

The main message emphasizes monthly top-up:

- If the current plan is short: `要在 55 歲退休，每月需再多投入 NT$ X`
- If the current plan is already enough: `目前投入已達標`

Secondary details:

- Target retirement year.
- Required assets at target retirement.
- Projected assets at target retirement under the current monthly saving.
- Asset gap.

The one-time asset gap is secondary context only. The primary decision metric is the additional monthly investment needed.

### Reverse Calculation

Create a focused calculation helper in `lib/targetRetirement.ts` that accepts `RetirementParams` and `targetRetirementAge`.

It computes:

- `target_retirement_age`
- `target_retirement_year`
- `years_to_target`
- `required_assets`
- `projected_assets`
- `asset_gap`
- `additional_monthly_saving`
- `total_monthly_saving_needed`
- `is_on_track`

Rules:

- Use the same return and inflation assumptions as the existing FI calculation.
- Required assets use the same retirement principal logic as fixed monthly expense mode.
- Projected assets use current assets plus current monthly saving compounded to the target year.
- If projected assets already meet required assets, additional monthly saving is `0` and `is_on_track` is `true`.
- If the target age is invalid after clamping, the UI should still show a valid clamped target rather than an error state.

### Preset And Manual Edit Behavior

Target retirement age is personal goal state, not a market/expense preset.

- Applying `保守`, `基準`, or `積極` must not change target retirement age.
- Changing target retirement age must not clear the selected preset button.
- Changing current age or death age may clamp the target age, but should only clear preset selection if those existing fields already count as preset-controlled edits.

### Sharing And Saved Scenarios

The target retirement age should be part of shareable and saved state.

- Shared URLs include the target age query parameter.
- Loading a shared URL restores target retirement age.
- Saved scenarios store and restore target retirement age.
- Existing saved scenarios without target age use the default target age.

This is a concrete compatibility need because saved scenario data may already exist in users' browsers.

### Chart Markers

Enhance `RetirementCurveChart` with reference markers:

- `FI 年`: the fixed expense mode retire year when available.
- `目標退休年`: calculated from the selected target retirement age.
- `耗盡年`: shown only if either retirement table contains a row with `depleted: true`.

Markers should be visually distinct from the two asset lines. Use subtle dashed reference lines with labels rather than adding new data series.

If multiple markers share the same year, labels can overlap; this is acceptable for the first version. Avoid over-engineering label collision logic.

## Data Flow

`app/page.tsx` owns the target retirement age state.

- Initialize to `DEFAULT_TARGET_RETIREMENT_AGE = 55` from `lib/targetRetirement.ts`.
- Parse target age from URL on load.
- Pass target age and setter to the new target age card.
- Pass marker years into `RetirementCurveChart`.
- Include target age when saving scenarios.

`lib/share.ts` should parse and serialize target retirement age separately from `RetirementParams`, because target age is UI goal state rather than a core retirement assumption.

Saved scenario data should add an optional `target_retirement_age` field. When loading older saved scenarios without the field, use `DEFAULT_TARGET_RETIREMENT_AGE` clamped against the scenario's `current_age` and `death_age`.

Tests should cover the target retirement helper directly.

## Error Handling

Invalid target ages are clamped to the valid range instead of shown as form errors.

If `death_age <= current_age + 1`, use the nearest valid display range and avoid crashing. Existing validation already handles invalid death/current age combinations for the main calculation.

## Testing

Add tests for:

- Additional monthly saving is positive when target age is earlier than the current plan can support.
- Additional monthly saving is zero when current saving is already sufficient.
- Target age clamps within `current_age + 1` and `death_age - 1`.
- Shared URL parsing and serialization include target retirement age.
- Saved scenarios without target age can still load with the default target age.

## Out Of Scope

- Monte Carlo simulation.
- Tax modeling.
- Multiple target retirement ages.
- Complex chart label collision handling.
- Changing preset definitions.
