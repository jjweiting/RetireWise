# Public RetireWise Phase 2 Optimizations Design

## Purpose

Improve the public RetireWise calculator so users can share assumptions, start from useful presets, understand key trade-offs, and use the result comfortably on mobile. Phase 2 keeps the same privacy model: no login, no backend, and no uploaded data.

## Scope

Included:

- Shareable URLs that encode the current calculator inputs and optionally a scenario name.
- Preset scenarios for conservative, baseline, and aggressive assumptions.
- Mobile-friendly results by showing key-year summaries before long yearly tables and making the full tables collapsible.
- Sensitivity analysis that compares the current result against a few useful one-variable changes.

Excluded:

- Short URLs, backend storage, analytics, account login, or cloud sync.
- Sharing full precomputed result tables in the URL.
- Changing the core retirement math model except for small helper exports needed to compare results.
- New calculators such as asset allocation or reverse monthly-saving calculations.

## Shareable URLs

Use readable query parameters instead of encoded blobs. This keeps the URL inspectable, debuggable, and GitHub Pages friendly.

Parameter mapping:

- `asset` -> `current_base`
- `saving` -> `monthly_saving`
- `expense` -> `monthly_expense`
- `age` -> `current_age`
- `life` -> `death_age`
- `pre` -> `pre_return`
- `post` -> `post_return`
- `inflation` -> `inflation`
- `withdrawal` -> `withdrawal_rate`
- `bequest` -> `bequest`
- `name` -> optional scenario/display name

Behavior:

1. On first client render, parse `window.location.search`.
2. Merge valid query values into `DEFAULT_PARAMS`.
3. Ignore invalid, missing, or out-of-range values and keep defaults for those fields. Use the same practical bounds as the existing form: asset `0..500,000,000`, saving `0..1,000,000`, expense `10,000..300,000`, age `18..90`, lifespan `50..120`, pre-retirement return `0..30`, post-retirement return `0..15`, inflation `0..8`, withdrawal `2..6`, and bequest `0..100,000,000`.
4. Preserve `name` separately as an imported shared scenario name.
5. Recalculate results from params instead of trusting any result data in the URL.
6. Provide a "copy share link" action that writes the current URL-formatted params to the clipboard. The generated URL must preserve the current origin and pathname, so it works both on local dev `/` and GitHub Pages `/RetireWise/`.
7. If a shared `name` exists, show a small callout allowing the user to save the imported assumptions as a local scenario.

The URL should be updated only when the user clicks the share action, not on every slider move. This avoids noisy browser history and keeps interaction lightweight.

## Preset Scenarios

Add three built-in presets:

- Conservative: lower returns, higher inflation, moderate spending.
- Baseline: current default assumptions.
- Aggressive: higher savings and pre-retirement return, while keeping post-retirement assumptions realistic.

Each preset is a named `RetirementParams` object in a small helper module. Applying a preset replaces the current params and clears any imported shared scenario name. Presets should not automatically save to localStorage; users can save them manually after adjustment.

## Mobile-Friendly Results

The current yearly tables are useful but long. Add a compact key-year summary above the full tables.

Key-year rows:

- First retirement year.
- Age 65 if present in the table.
- Age 75 if present in the table.
- Final simulated year.

For each mode, show year, age, monthly expense, end asset, and status.

Full yearly tables should be inside collapsible `<details>` sections. Default behavior:

- On desktop, key-year summary is visible and the full table can remain closed by default.
- On mobile, key-year summary is the primary display and full table is available on demand.

This keeps the page readable without removing detailed data.

## Sensitivity Analysis

Add a deterministic sensitivity panel that runs a few one-variable comparisons from the current params.

Scenarios:

- Monthly saving `+5,000`.
- Monthly expense `-10,000`, clamped to the minimum valid expense.
- Pre-retirement return `+1%`, clamped to the existing input max.
- Inflation `+1%`, clamped to the existing input max.

For each comparison, calculate:

- Baseline FI year.
- Scenario FI year.
- Delta in years, where earlier FI is positive improvement and later FI is negative.
- Required retirement assets difference.

Display language should be practical:

- `提早 2 年`
- `延後 1 年`
- `無變化`
- `尚未達成` when either side cannot be represented clearly.

Sensitivity analysis must use the same `calculateRetirementFI` function as the main result. It should not introduce a second math model.

## Architecture

New or changed units:

- `lib/share.ts`: parse params from URL, serialize params to URL, and validate numeric query values.
- `lib/presets.ts`: define preset options.
- `lib/sensitivity.ts`: calculate sensitivity rows from params.
- `components/retirement/RetirementSharePanel.tsx`: copy share link and save imported shared scenario.
- `components/retirement/RetirementPresetSelector.tsx`: apply preset buttons.
- `components/retirement/RetirementSensitivity.tsx`: render sensitivity analysis.
- `components/retirement/RetirementKeyYearSummary.tsx`: render compact key-year summaries.
- `components/retirement/RetirementYearlyTable.tsx`: wrap full tables in collapsible details sections.
- `app/page.tsx`: initialize params from URL, hold optional shared name, compose the new components.

Keep each unit focused. URL parsing should not know about UI state. Sensitivity analysis should not touch localStorage or the clipboard. UI components should receive data and callbacks through props.

## Error Handling

- Query parsing should never throw; invalid values are ignored.
- Clipboard failures should show a short fallback message telling the user to copy from the address bar.
- Sensitivity rows should tolerate invalid comparison params by omitting that comparison or returning `尚未達成`.
- Preset application should always produce valid params.

## Testing

Add tests for:

- URL parsing maps valid query values into params.
- URL parsing ignores invalid values and preserves defaults.
- URL serialization includes all numeric params and optional name.
- Sensitivity analysis returns rows for the four defined comparisons.
- Increasing monthly saving does not make FI later than baseline when both are valid.

Existing calculation and storage tests should remain unchanged and passing.

## Deployment

No deployment architecture change is needed. The existing GitHub Pages workflow should build and publish the optimized static app.
