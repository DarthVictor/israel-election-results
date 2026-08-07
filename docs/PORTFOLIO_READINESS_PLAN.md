# Portfolio readiness plan

## Goal

Make this repository safe to link from `darthvictor.xyz` as the portfolio's only
public, runnable, source-readable case study. The application already works; this
plan closes the gaps a reviewer would find between the deployed product, the
repository, and the claims made about both.

## Delivery discipline

Each stage is completed and verified independently, smallest behaviour-preserving
change first. Every stage lists its own checks. The full gate before any stage is
considered done:

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

Stages 1–3 are required before the portfolio links here. Stages 4–7 are quality
work that can follow the link going live.

## Decisions required before implementation

These change the work in stages 1 and 2 and are not decided here.

### Decision A — canonical production URL

The repository disagrees with itself about its own address.

| Location                       | Value                                          |
| ------------------------------ | ---------------------------------------------- |
| Live deployment (verified 200) | `israel-polls.vercel.app`                      |
| Production canonical / OG tags | `israel-polls.vercel.app`                      |
| PNG export footer (hard-coded) | `israel-election-results.vercel.app` — **404** |
| `.github/workflows/ci.yml` env | `israel-election-results.vercel.app` — **404** |
| `PLAN.md` deployment section   | `israel-election-results`                      |
| `package.json` name            | `israel-election-results-explorer`             |

Beyond the broken links, "polls" contradicts the product: the README states this
is "not a poll, forecast, or endorsement", and `CONTEXT.md` deliberately avoids
the word. The repository and URL say otherwise.

- **Option A1 — rename to `israel-election-results`.** Rename the GitHub repo and
  the Vercel project, keep `israel-polls.vercel.app` as a Vercel alias so existing
  links survive, and make every reference above agree on the new origin. GitHub
  redirects the old repository path automatically. Highest naming accuracy, most
  moving parts.
- **Option A2 — standardise on `israel-polls`.** Keep the deployed origin and fix
  the export footer, CI env, `PLAN.md`, and `package.json` to match it. Cheapest
  and lowest risk, but the product keeps a name that contradicts its own
  methodology statement.

Both options resolve the 404. Nothing else in this plan depends on which is
chosen, only on choosing one.

### Decision B — GitHub Pages redirect

`docs/github-pages-redirect/` is described in the README as non-active. Either
activate it so the old Pages URL forwards to the canonical origin, or delete the
template and its README reference. Leaving a documented-but-inactive redirect is
the state a reviewer will ask about.

---

## 1. Canonical URL identity

**Purpose:** stop shipping links that 404, and make one origin authoritative.

Depends on Decision A.

- Replace the hard-coded origin in `src/features/explorer/exports.ts` with the
  build-time `VITE_SITE_URL` value already validated in `vite.config.ts`, so the
  PNG footer can never drift from the deployment again.
- Align `.github/workflows/ci.yml`, `PLAN.md`, `package.json`, and the README CI
  badge with the chosen origin.
- If renaming: update the exact-match source-link assertion in
  `e2e/explore.spec.ts` (currently pinned to
  `https://github.com/DarthVictor/israel-polls`), and confirm the Vercel alias
  keeps the old origin resolving.

**Checks:** full gate; export a PNG from a preview build and confirm the footer
URL resolves to the live application; confirm the canonical `<link>`, OG `url`,
and export footer all name the same origin.

## 2. Licensing and data attribution

**Purpose:** a public repository carrying government-derived data currently has no
licence at all.

- Add a `LICENSE` file. MIT matches the portfolio repository.
- Add a short licensing section to the README separating **code** (the chosen
  licence) from **data** (final official returns from the Central Elections
  Committee, retrieved 2026-08-05, redistributed unmodified under `data/raw/`)
  and from **map dependencies** (Leaflet, and OpenStreetMap tiles under ODbL when
  the optional basemap is enabled).
- Localities comes from CBS https://www.cbs.gov.il/en/cbsNewBrand/Pages/default.aspx 

**Checks:** `pnpm format`; `LICENSE` renders on the GitHub repository page; every
third-party asset named in the README has a licence attached.


## 3. Repository hygiene

**Purpose:** remove the small signals that read as unfinished.

- Add a `.github/dependabot.yml` for `pnpm` and `github-actions`.
- Add repository description, topics, and homepage URL on GitHub — all currently
  contribute to how the repository reads before anything is clicked.
- Resolve Decision B.
- Mark `PLAN.md` and `docs/REFACTORING_PLAN.md` as completed historical records so
  they are not mistaken for outstanding work.

**Checks:** `pnpm format`; Dependabot opens its first run without error.

## 4. Theme parity

**Purpose:** the explorer is light-only (`color-scheme: light`, a single `:root`
block in `src/styles/base.css`) while the portfolio is dark-first. Linked from a
dark page, it reads as grafted on.

- Add a `prefers-color-scheme: dark` block deriving dark surfaces from the existing
  token set, leaving the sequential and diverging map palettes intact unless
  contrast testing requires otherwise.
- Re-verify WCAG AA contrast in both themes, including the map legend and the
  no-data treatment.
- The PNG export stays light-only by design; it is a printable artifact, not a UI
  surface. State that in the methodology.

**Checks:** full gate; contrast verified in both themes; `prefers-reduced-motion`
behaviour unchanged.

## 5. Geometry payload reduction

**Purpose:** the ~433 KB gzip geometry is the dominant first-load cost, well under
the 1.5 MB budget but the one number a performance-minded reviewer will probe.

Investigate only if stages 1–6 are done: further TopoJSON quantisation and
simplification in the build pipeline, measured against zoomed-in boundary fidelity.
Reject the change if visible boundary quality degrades — the honest documentation
from stage 3 is a sufficient answer on its own.

**Checks:** full gate; before/after gzip sizes recorded; visual comparison of at
least three dense-boundary localities at maximum zoom.

---

## Out of scope

- Adding elections beyond 21–25, or any non-final or projected data.
- Any feature that would make this a poll, forecast, or editorial product.
- Redesign of the existing editorial visual system.
- Changes to the domain/feature architecture established in ADR 0001.

## Acceptance

The repository is portfolio-ready when stages 1–3 are complete: no shipped link
returns 404, code and data licensing is explicit and verifiable, the first-load
cost is stated rather than discovered, and a tagged release fixes the reviewed
state. Stages 4–6 raise the quality of what a reviewer finds after that point.
