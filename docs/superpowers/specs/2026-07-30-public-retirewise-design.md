# Public RetireWise Phase 1 Design

## Purpose

Build a public version of RetireWise that lets visitors enter their own retirement assumptions, calculate FI and retirement outcomes, and save comparison scenarios in their own browser. The first release should be useful, privacy-safe, and easy to publish to free static hosting.

## Product Scope

Phase 1 focuses only on retirement/FI planning.

Included:

- Manual inputs for current assets, monthly saving, monthly retirement expense, current age, expected lifespan, pre-retirement return, post-retirement return, inflation, withdrawal rate, and desired remaining assets at death.
- Two calculation modes:
  - Fixed monthly expense: estimate FI timing, required retirement assets, gap, progress, and retirement-year monthly expense after inflation.
  - Lifespan planning: estimate the maximum monthly spending supported until the expected lifespan while preserving the requested remaining assets.
- Summary cards, retirement asset curve chart, and yearly detail table.
- Browser-only scenario storage with save, apply, and delete actions.
- Clear privacy and disclaimer copy: no login, no upload, data stays in the browser, and results are not investment advice.

Excluded from Phase 1:

- User accounts, cloud sync, Firebase Auth, Firestore, or any backend API.
- Importing private accounting data.
- PDF generation.
- AI recommendations.
- Asset allocation, cashflow, and insurance tools.

## Technical Direction

Use a Next.js frontend configured for static export. This gives a production-quality public site while staying compatible with GitHub Pages, Firebase Hosting, and other static hosts.

The existing `app.py` remains as legacy reference during the migration. The calculation behavior should be ported into TypeScript as pure functions instead of calling Python or a backend. The public app should not depend on `retirement_plans.csv` or any private accounting repository data.

## Architecture

Proposed structure:

```text
app/
  globals.css
  layout.tsx
  page.tsx
components/
  retirement/
    RetirementParams.tsx
    RetirementSummaryCards.tsx
    RetirementCurveChart.tsx
    RetirementYearlyTable.tsx
    RetirementScenarioManager.tsx
lib/
  retirement.ts
  storage.ts
  types.ts
```

Responsibilities:

- `app/page.tsx`: owns page state, runs calculations, connects inputs, results, and saved scenarios.
- `lib/retirement.ts`: contains all retirement math as deterministic pure functions.
- `lib/storage.ts`: wraps `localStorage` read/write/delete with SSR-safe guards and schema validation.
- Retirement components: render UI only and receive data through props.

## Data Flow

1. The page initializes with default assumptions.
2. The user edits parameters in the form.
3. The page calls `calculateRetirementFI(params)` in the browser.
4. Results render immediately in summary cards, chart, and yearly table.
5. When the user saves a scenario, the current params and a small result summary are persisted to `localStorage` for list display.
6. Applying a scenario restores its params and recalculates from the current code.

The saved scenario payload should contain params, a generated id, a display name, timestamps, and a compact result summary such as FI year and required assets. Full results should be recalculated when a scenario is applied. It should not store anything outside the user's browser.

## Calculations

Port the existing RetireWise logic from Python to TypeScript with equivalent behavior:

- Accumulate current assets and monthly savings before retirement using annual compounding.
- Use binary search to find the minimum retirement principal for the fixed monthly expense mode.
- Simulate post-retirement assets year by year with inflation-adjusted spending.
- Calculate lifespan-mode maximum monthly spending using the present value denominator approach from the current implementation.

Edge handling:

- Clamp negative assets to zero in display rows.
- Treat invalid horizons, such as expected lifespan less than or equal to current age, as validation errors in the UI.
- Avoid division by zero when return assumptions are zero.
- Limit search horizons and input ranges to practical values to keep results understandable.

## UI

Use a single-page responsive layout:

- Hero area: title, short explanation, privacy badges, and disclaimer.
- Input panel: grouped assumptions with number inputs and range controls where useful.
- Result panel: summary cards for FI year, retirement age, required assets, gap/progress, and lifespan-mode monthly spending.
- Chart section: compare the two retirement asset curves.
- Table section: yearly detail rows.
- Scenario section: save current scenario, list saved scenarios, apply, and delete.

The UI should be mobile-first and avoid private-accounting navigation/sidebar patterns. The public product should feel like a standalone calculator, not a stripped private dashboard.

## Persistence

Use one localStorage key, for example `retirewise.scenarios.v1`.

Rules:

- Read and parse safely; if parsing fails, return an empty list.
- Write the full scenario list after save/delete.
- Keep saved scenarios local to the browser.
- Do not add backward-compatible migration logic until there is a shipped persisted schema to migrate from.

## Deployment

Primary target: GitHub Pages.

Configure Next.js for static export and add an npm build command that produces static assets. Keep the implementation compatible with Firebase Hosting so the hosting target can change later without app rewrites.

Phase 1 does not require Firebase services.

## Testing And Verification

Add focused tests for `lib/retirement.ts` covering:

- Default params produce non-empty FI and lifespan results.
- Zero pre-retirement return with monthly saving does not divide by zero.
- Higher monthly expense increases required assets.
- Lifespan-mode bequest reduces maximum monthly spending.

Verification commands should include:

- Dependency installation if needed.
- Unit tests.
- Static build.

## Future Phases

Phase 2:

- Shareable URLs with encoded params.
- Preset scenarios: conservative, baseline, aggressive.
- Export CSV for yearly tables.
- Better mobile table/chart ergonomics.

Phase 3:

- Asset allocation calculator.
- Target principal and monthly investment reverse calculators.
- Educational explanation pages for FI, withdrawal rate, and inflation.

Phase 4:

- Optional Firebase Auth and Firestore only if cloud sync becomes necessary.
