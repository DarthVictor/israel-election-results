# Explorer refactoring plan

## Goal

Preserve the current election-exploration experience while separating election rules, reactive orchestration, UI, and browser integrations. The end state makes domain behavior testable without rendering the app and reduces `src/app/App.tsx` to a composition root.

## Delivery discipline

Each numbered stage is completed independently. For every stage, an implementation agent makes the smallest behavior-preserving change, a review agent reviews the resulting diff, and a fixing agent resolves confirmed review findings before the next stage starts. Every stage must pass its listed checks; visual redesigns and feature changes are out of scope.

## Target shape

```text
src/
  app/
    App.tsx                         # composition root only
  domain/
    contracts.ts
    explorer/                        # pure rules and types; no Solid or browser APIs
      selection.ts
      selectors.ts
      search.ts
      table.ts
      analysis.ts
  features/explorer/
    controller/
      create-explorer-controller.ts
      explorer-dependencies.ts
    components/
      ExplorerControls.tsx
      ExploreInsights.tsx
      LocalitySearch.tsx
      LocalityDetails.tsx
      ComparisonDetails.tsx
      LocalityTable.tsx
      MapLegend.tsx
      StatusPanels.tsx
    adapters/
      static-election-repository.ts
      browser-history.ts
      browser-clipboard.ts
      browser-downloads.ts
      leaflet-map.tsx
```

## 1. Safety baseline and characterization tests

**Purpose:** document current behavior before code moves.

- Run the existing formatter, data validation/build, lint, typecheck, unit, and Chromium end-to-end suites.
- Add behavior-level tests for the orchestration currently owned by `App.tsx`: party-less Explore, switching to Table or Compare selecting a valid list, locality selection reflected in a shareable URL, restored URLs, and failed-load retry behavior.
- Keep the E2E suite as the cross-browser user-journey contract. Prefer unit tests for pure state rules added later.

**Exit criteria:** all baseline gates pass and the new tests describe behavior, not implementation details.

## 2. Domain glossary and controller decision

**Purpose:** establish durable vocabulary before naming modules and types.

- Maintain root `CONTEXT.md` as the source of truth for Election, Party List, Analysis Selection, Explore Analysis, Comparison Analysis, Locality Result, and Mappable Locality.
- Keep the controller-boundary decision in `docs/adr/0001-explorer-controller-boundary.md`.
- Use the glossary names in new public types, test descriptions, and UI-facing labels where appropriate.

**Exit criteria:** terminology is precise, historical Party Lists remain election-scoped, and comparison claims do not imply political identity across elections.

## 3. Typed pure-domain extraction

**Purpose:** move deterministic election rules out of the UI.

- Introduce explicit types for party-less Explore and party-required Table/Comparison selections; avoid using an empty string as an undocumented state model.
- Extract selection normalization and transitions, election/party/locality lookups, locality searching, table filtering/sorting, shares, ranks, thresholds, and comparison deltas into `src/domain/explorer/`.
- Keep these modules free of Solid imports, `window`, network access, Leaflet, clipboard, and export code.
- Write colocated Vitest coverage for each exported rule, including invalid URLs and missing geometry/results.

**Exit criteria:** pure modules hold election rules with direct, focused tests; `App.tsx` no longer contains pure domain calculations.

## 4. Testable Solid Explorer controller

**Purpose:** isolate reactive orchestration from markup.

- Build `create-explorer-controller` around Solid signals and memos.
- Inject a repository, history gateway, clipboard/download gateway, and export service through a narrow dependencies interface.
- Move manifest/election/geometry loading, stale-request protection, retry/error state, selection actions, URL synchronization, copy-link, and export coordination into the controller.
- Use effects only for external side effects; use memos only for derived values; keep teardown for subscriptions/listeners explicit.
- Test controller behavior with fakes rather than Leaflet or browser globals.

**Exit criteria:** state transitions and async recovery are testable without rendering a component; components only consume controller state and invoke actions.

## 5. Presentation component extraction

**Purpose:** make each view readable and independently testable.

- Extract controls, insights, locality search, locality details, comparison details, table, legend, and loading/error status panels into feature components.
- Give components reactive props and callbacks only. They must not fetch files, write URLs, create downloads, or duplicate analysis rules.
- Preserve accessibility labels, test IDs, mobile sheet behavior, and all existing visible behavior.

**Exit criteria:** `App.tsx` contains layout and composition only; extracted components have focused rendering/interaction tests where behavior warrants it.

## 6. Infrastructure adapters

**Purpose:** confine browser and library integration to replaceable boundaries.

- Extract static generated-data loading, browser history, clipboard, downloads, and Leaflet ownership into adapters.
- Feed Leaflet prepared rows, scale information, selection, and callbacks rather than the complete application state.
- Keep adapter tests focused on contracts; retain Chromium E2E coverage for actual map, downloads, and URL behavior.

**Exit criteria:** no domain module or presentation component reaches directly into browser APIs or Leaflet.

## 7. Final composition, cleanup, and release gates

**Purpose:** finish with a small, maintainable application root.

- Simplify `App.tsx` to controller creation plus layout composition; target fewer than 150 lines unless a documented accessibility/layout need requires more.
- Remove dead glue only after all imports and behavior checks are green.
- Run formatter, data validation/build, lint, typecheck, unit tests, and Chromium E2E tests.
- Conduct a final architecture and UI/accessibility review, then resolve confirmed findings.

**Exit criteria:** production behavior is preserved, code boundaries match the target shape, and all automated gates pass.

## Skills used throughout

- **domain-modeling:** maintain the glossary and challenge ambiguous election terminology.
- **solidjs:** keep signals, memos, effects, props, and cleanup aligned with Solid's fine-grained reactivity.
- **tdd:** make each extraction a small red-green-refactor slice, centered on observable behavior.
- **code-review:** review each stage after implementation and before fixes are accepted.
