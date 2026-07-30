# Public RetireWise Phase 2 Optimizations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add shareable URLs, preset scenarios, mobile-friendly key-year summaries, and sensitivity analysis to the public RetireWise calculator.

**Architecture:** Keep the app static and browser-only. Put URL parsing/serialization, presets, and sensitivity calculations in focused `lib/` modules with tests, then compose small UI components from `app/page.tsx`.

**Tech Stack:** Next.js, React, TypeScript, Node test runner with `tsx`, GitHub Pages static export.

---

## File Structure

- Create `lib/share.ts`: parse and serialize readable query params.
- Create `lib/share.test.ts`: URL parsing/serialization tests.
- Create `lib/presets.ts`: conservative, baseline, aggressive preset definitions.
- Create `lib/sensitivity.ts`: deterministic one-variable comparisons.
- Create `lib/sensitivity.test.ts`: sensitivity behavior tests.
- Create `components/retirement/RetirementPresetSelector.tsx`: preset buttons.
- Create `components/retirement/RetirementSharePanel.tsx`: copy link and imported-name save callout.
- Create `components/retirement/RetirementSensitivity.tsx`: sensitivity panel.
- Create `components/retirement/RetirementKeyYearSummary.tsx`: compact key-year results.
- Modify `components/retirement/RetirementYearlyTable.tsx`: wrap full tables in collapsible sections.
- Modify `app/page.tsx`: initialize from URL and compose new components.
- Modify `app/globals.css`: styles for new panels, chips, key rows, and details.

## Task 1: URL Share Helpers

**Files:**
- Create: `lib/share.test.ts`
- Create: `lib/share.ts`

- [ ] **Step 1: Write failing tests**

Create `lib/share.test.ts` with tests for valid parsing, invalid-value fallback, and URL serialization with optional name.

- [ ] **Step 2: Run tests to verify failure**

Run: `npm test`

Expected: FAIL because `lib/share.ts` does not exist.

- [ ] **Step 3: Implement `lib/share.ts`**

Export `parseSharedParams(search, defaults)`, `serializeSharedParams(params, name)`, and `buildShareUrl(origin, pathname, params, name)`. Use the form bounds from the spec and ignore invalid values.

- [ ] **Step 4: Run tests to verify pass**

Run: `npm test`

Expected: all tests pass.

- [ ] **Step 5: Commit**

Run: `git add lib/share.ts lib/share.test.ts && git commit -m "feat: add shareable URL helpers"`

## Task 2: Presets And Sensitivity Logic

**Files:**
- Create: `lib/presets.ts`
- Create: `lib/sensitivity.test.ts`
- Create: `lib/sensitivity.ts`

- [ ] **Step 1: Add presets**

Create `lib/presets.ts` exporting `RETIREMENT_PRESETS` with `conservative`, `baseline`, and `aggressive` params.

- [ ] **Step 2: Write failing sensitivity tests**

Create `lib/sensitivity.test.ts` verifying four rows are returned and monthly saving `+5,000` does not make FI later when both rows are valid.

- [ ] **Step 3: Run tests to verify failure**

Run: `npm test`

Expected: FAIL because `lib/sensitivity.ts` does not exist.

- [ ] **Step 4: Implement sensitivity calculations**

Create `lib/sensitivity.ts` exporting `calculateSensitivity(params)`. Use `calculateRetirementFI`, compare baseline to four one-variable changes, and return display-ready rows with labels, year delta, required asset delta, and status text.

- [ ] **Step 5: Run tests to verify pass**

Run: `npm test`

Expected: all tests pass.

- [ ] **Step 6: Commit**

Run: `git add lib/presets.ts lib/sensitivity.ts lib/sensitivity.test.ts && git commit -m "feat: add presets and sensitivity analysis"`

## Task 3: Phase 2 UI Components

**Files:**
- Create: `components/retirement/RetirementPresetSelector.tsx`
- Create: `components/retirement/RetirementSharePanel.tsx`
- Create: `components/retirement/RetirementSensitivity.tsx`
- Create: `components/retirement/RetirementKeyYearSummary.tsx`
- Modify: `components/retirement/RetirementYearlyTable.tsx`

- [ ] **Step 1: Build preset selector**

Create a prop-driven component rendering preset buttons and calling `onApply(params)`.

- [ ] **Step 2: Build share panel**

Create a client component that copies the current share URL, shows copied/fallback status, and displays an imported-name save button when `sharedName` exists.

- [ ] **Step 3: Build sensitivity panel**

Render rows from `calculateSensitivity(params)` with practical delta text and required-asset differences.

- [ ] **Step 4: Build key-year summary**

Create key rows from first year, age 65, age 75, and final year, deduplicated per mode.

- [ ] **Step 5: Collapse full yearly tables**

Modify `RetirementYearlyTable.tsx` so each full table is inside a closed `<details>` block.

- [ ] **Step 6: Run tests**

Run: `npm test`

Expected: all tests pass.

- [ ] **Step 7: Commit**

Run: `git add components/retirement && git commit -m "feat: add phase 2 retirement UI panels"`

## Task 4: Compose Page And Styles

**Files:**
- Modify: `app/page.tsx`
- Modify: `app/globals.css`

- [ ] **Step 1: Initialize from shared URL**

In `app/page.tsx`, parse `window.location.search` on first mount, merge params, and store optional `sharedName`.

- [ ] **Step 2: Compose new panels**

Add preset selector near inputs, share panel near scenario management, sensitivity after summary cards, and key-year summary before full tables.

- [ ] **Step 3: Add styles**

Update `app/globals.css` for preset buttons, share panel status text, sensitivity rows, key-year cards, and `<details>` tables.

- [ ] **Step 4: Verify locally**

Run: `npm test`

Expected: all tests pass.

Run: `GITHUB_ACTIONS=true npm run build`

Expected: static export succeeds.

- [ ] **Step 5: Commit**

Run: `git add app/page.tsx app/globals.css && git commit -m "feat: compose phase 2 retirement optimizations"`

## Task 5: Final Verification And Deployment

**Files:**
- No new files expected.

- [ ] **Step 1: Fresh verification**

Run: `npm test`

Expected: all tests pass.

Run: `GITHUB_ACTIONS=true npm run build`

Expected: static export succeeds and generated HTML references `/RetireWise/_next`.

- [ ] **Step 2: Inspect git status**

Run: `git status --short`

Expected: clean working tree.

- [ ] **Step 3: Merge/push flow**

Use the finishing branch workflow after implementation to merge to `main`, push, and verify GitHub Pages deployment.

## Self-Review Notes

- Spec coverage: share links, optional name import, presets, key-year/mobile table behavior, sensitivity rows, and deployment verification are covered.
- Scope check: no backend, no short URLs, no analytics, and no new calculators are included.
- Type consistency: share helpers return parsed params/name; presets use `RetirementParams`; sensitivity rows are independent display data.
