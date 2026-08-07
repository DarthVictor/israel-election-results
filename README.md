# Israel Election Results Explorer

[![CI](https://github.com/DarthVictor/israel-polls/actions/workflows/ci.yml/badge.svg)](https://github.com/DarthVictor/israel-polls/actions/workflows/ci.yml)

An accessible, client-side explorer for final locality-level results from Israeli Knesset elections 21–25 (2019–2022). It turns official Central Elections Committee returns into an interactive map, locality profile, sortable table, independent A/B comparison, and shareable/exportable analysis.

## Portfolio summary

This project demonstrates a complete small data-product workflow: preserve official source data, validate and normalize it at build time, ship compact static assets, and make the resulting analysis clear on desktop and mobile. The map is not the product by itself—the selected locality, historical comparison, filters, source links, and exports make the data inspectable.

## Features

- Explore a party/list's vote share by locality for elections 21–25.
- Search in Hebrew or English, select a locality from the map, and retain that selection in the URL.
- Compare two independent historical election/list selections as percentage-point change; the UI explicitly does not claim party continuity.
- Filter and sort locality results, then export the current analysis as UTF-8 CSV or a branded PNG.
- Load geometry once and fetch election data only for the active selection.
- Provide keyboard-friendly controls, visible focus states, reduced-motion support, no-data treatment, and a map legend that does not rely on colour alone.

## Data and methodology

The data represents final official returns from the [Central Elections Committee](https://bechirot.gov.il/). Election-specific source pages are included in the generated manifest and linked from the application. The [methodology](docs/METHODOLOGY.md) explains calculations, boundary matching, limitations, and Leaflet/OpenStreetMap attribution.

Raw files are preserved under `data/` and `data/raw/`; generated browser assets live under `public/data/generated/`. Do not manually edit generated assets—run the pipeline instead.

## Local development

Prerequisites: Node.js 24 and pnpm 11.10.0.

```powershell
pnpm install --frozen-lockfile
pnpm data:validate
pnpm dev
```

Useful commands:

| Command                                                    | Purpose                                                              |
| ---------------------------------------------------------- | -------------------------------------------------------------------- |
| `pnpm data:build`                                      | Rebuild normalized static data after an approved source update.      |
| `pnpm data:validate`                                   | Validate preserved data without writing generated files.             |
| `pnpm format` / `pnpm lint` / `pnpm typecheck` | Check formatting, linting, and types.                                |
| `pnpm test`                                            | Run unit and data-pipeline tests.                                    |
| `pnpm build`                                           | Create the production `dist/` bundle.                                |
| `pnpm bundle:report`                                   | Enforce the production asset-size budgets.                           |
| `pnpm release:check`                                   | Verify release metadata and required static artifacts after a build. |
| `pnpm test:e2e:install`                                | Install the Chromium browser used by the CI smoke suite.             |
| `pnpm test:e2e:chromium`                               | Run the required browser smoke suite.                                |

For Firefox and WebKit release verification, see [e2e/README.md](e2e/README.md).

## Deployment

The application is a static Vite build for Vercel.

1. Create or link a Vercel project, choose this repository, and set the build command to `pnpm build`; publish `dist`.
2. Set `VITE_SITE_URL` to the verified canonical production HTTPS origin, without a trailing slash (for example, `https://your-project.vercel.app`). Production builds reject missing or non-origin values; development and preview builds may use safe relative metadata when it is omitted.
3. Confirm the Vercel preview passes `pnpm release:check`, Chromium E2E, and the manual Firefox/WebKit checks before promoting it.
4. Only after production is verified, use the non-active [GitHub Pages redirect template](docs/github-pages-redirect/README.md). It preserves paths, query strings, and hashes, and it deliberately has no URL hard-coded.

`vercel.json` gives only content-addressed generated JSON long-lived immutable caching and refreshes the manifest every five minutes. The SPA rewrite serves the explorer for a shareable analysis URL on Vercel.

## Verification and contribution

GitHub Actions checks formatting, linting, types, unit/data tests, data validation, a production build, asset-size budgets, release artifacts, and Chromium E2E. Run the same checks before submitting a change:

```powershell
pnpm format
pnpm lint
pnpm typecheck
pnpm test
pnpm data:validate
pnpm build
pnpm bundle:report
pnpm release:check
pnpm test:e2e:chromium
```

This project is a neutral visualization of official election results, not a poll, forecast, or endorsement.
