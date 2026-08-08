Israel Election Results Explorer — Rebuild Plan

> **Status: completed. Historical record — not outstanding work.**
> This plan describes the original rebuild and has been delivered in full. It is
> kept for provenance; it is not a to-do list, and it does not reflect later
> decisions. For the shipped data pipeline see src/data/.

Summary
Rebuild the project as a standalone SolidJS + TypeScript data product deployed on Vercel. The experience will cover Knesset elections 21–25, use an editorial data-journalism visual style, and retain official Hebrew names inside an English interface.
The application will remain fully static: election data is normalized during the build, then compact files are loaded in the browser as needed. Leaflet remains the interactive map engine.
Target Architecture and Implementation
Application foundation
Create a Vite application using SolidJS, TypeScript, pnpm, ESLint, and Prettier.
Organize the UI around four feature areas: application shell, map explorer, locality analytics, and comparison/table views.
Use Solid signals and resources for application state and data loading; no global state library or backend is needed.
Keep Leaflet for map navigation, GeoJSON interaction, keyboard-accessible locality selection, and responsive resize handling.
Use a single responsive route with query-string state rather than a multi-page router.
Data pipeline
Preserve the raw election files as source artifacts and add the official 24th-election locality results from the Central Elections Committee’s government data catalog.
Replace the hard-coded CSV converter with a typed build pipeline that:Handles UTF-8/BOM and election-specific Hebrew column names.
Normalizes elections, party lists, localities, turnout, valid/invalid votes, and party vote totals.
Validates unique locality IDs, non-negative counts, voters = valid + invalid, and party totals against valid votes.
Reports records without matching geometry instead of silently discarding them.
Generates national summaries, locality ranks, and election metadata.

Convert the 5.5 MB boundary file into simplified TopoJSON at build time. Preserve locality IDs and enough geometry detail for zoomed inspection.
Produce one manifest plus one independently cacheable results file per election. Load geometry once and fetch only the active election and comparison election.
Keep non-geographic records in national totals but label them as non-mappable and exclude them from the default locality map/table.
Public data contracts
Use versioned static contracts so future elections can be added without changing UI code:
Encode AnalysisState in URL parameters so refreshes and copied links restore the same view.
Validate URL values against the manifest and fall back to election 25, Likud, and explore mode when invalid.
Comparisons use two explicitly independent election/list selections. The interface must not imply that differently named lists represent the same historical party.
Product experience
Name the product Israel Election Results Explorer with the subtitle “Locality-level results for Knesset elections 21–25, 2019–2022.”
Desktop layout:Editorial header with project context and data source.
Approximately 380 px analysis panel beside the map.
Explore, Compare, and Table tabs.
Persistent locality detail panel after map or search selection.

Mobile layout:Map-first canvas with compact election/party controls.
Expandable bottom sheet for locality details, filters, comparison, and table access.
No interaction that requires hover.

Explore mode:Election and party selectors.
Search by Hebrew or English locality name.
Sequential choropleth with data-derived thresholds and an explicit no-data style.
National share, turnout, strongest locality, and locality rank insights.
Selected-locality party breakdown with votes, share, turnout, and valid ballots.

Compare mode:Independent A and B election/list selectors.
Diverging map showing B share − A share in percentage points.
Locality panel showing both results and the delta.
Clear warnings where a locality exists in only one dataset.

Table mode:Searchable and sortable locality rows.
Filters for minimum turnout, minimum party share, and minimum valid ballots.
Columns for Hebrew/English name, votes, share, turnout, valid ballots, and rank or comparison delta.
Selecting a row focuses the locality on the map.

Use an editorial visual system: warm neutral surfaces, restrained typography, limited political color usage, a quiet basemap, clear hierarchy, and accessible sequential/diverging palettes.
Show official Hebrew names alongside English translations where available; missing translations fall back to the Hebrew name without breaking search or layout.
Include methodology, election dates, source links, GitHub link, data limitations, and attribution for Leaflet/OpenStreetMap.
Sharing and exports
Provide a “Copy analysis link” action using the canonical query-string state.
Export the filtered table as UTF-8 CSV with election/list context, locality identifiers and names, turnout, vote count, share, valid ballots, rank, and comparison values.
Export a branded 1600×900 PNG containing the analysis title, selection context, legend, vector choropleth, key insight, source, and project URL.
Generate the PNG from local vector geometry rather than map tiles, avoiding OpenStreetMap tile licensing and browser canvas/CORS failures.
Announce export success or failure accessibly and retain the current application state.
Failure and accessibility behavior
Display recoverable error panels with retry actions for manifest, geometry, or election-data failures.
Keep controls usable while secondary comparison data loads.
Support keyboard selection through search/table controls and provide visible focus states.
Never rely on color alone: tooltips, legends, values, labels, and no-data treatment must communicate map meaning.
Meet WCAG AA contrast and respect reduced-motion preferences.
Verification and Acceptance
Data tests:Parse all five election datasets.
Reject malformed counts, duplicate locality IDs, unknown list codes, and inconsistent totals.
Snapshot normalized metadata and unmatched-geometry reports.

Unit tests:Vote share, turnout, ranking, comparison deltas, thresholds, filters, URL parsing, and CSV generation.

Component tests:Election/list changes, locality search, persistent selection, filter updates, missing translations, loading, empty results, and errors.

End-to-end tests:Complete explore and compare journeys.
Shared URL restoration.
CSV and 1600×900 PNG downloads.
Keyboard-only operation.
Desktop at 1440×900 and mobile at 390×844.

Visual regression checks for the three primary views and the export image.
Accessibility testing with no critical automated violations.
Performance budgets:Initial application JavaScript below 250 KB gzip.
Geometry below 1.5 MB gzip.
Each election result file below 300 KB gzip.
Interactive map available within three seconds on a simulated fast-4G connection.

Production acceptance requires successful Vercel preview testing in Chromium, Firefox, and WebKit.
Deployment and Rollout
Deploy as a Vercel project named israel-election-results; build with pnpm build and publish dist.
Add canonical metadata, Open Graph preview, favicon, descriptive README, methodology, screenshots, and a concise portfolio case-study summary.
Configure immutable caching for hashed data/build assets and short caching for the manifest.
Validate the Vercel production release before changing the existing site.
Replace the GitHub Pages implementation with a lightweight redirect that preserves query strings and hashes and sends existing visitors to the canonical Vercel URL.
Keep the old implementation recoverable through Git history and a release tag created before the redirect.
Assumptions
The project is a neutral visualization of official results, not political forecasting or editorial endorsement.
V1 covers final official results for elections 21–25; the schema supports later elections, but incomplete/test election data is excluded.
English is the application language; official Hebrew locality and party names remain visible.
Comparisons are independent selections and make no automatic claim of party continuity.
The standalone Vercel application is linked from the portfolio rather than embedded inside it.
