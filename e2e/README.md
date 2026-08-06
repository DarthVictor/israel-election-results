# End-to-end tests

Install the Chromium browser once on a development machine before running the
browser suite:

```powershell
pnpm.cmd test:e2e:install
```

Run the required local smoke suite with:

```powershell
pnpm.cmd test:e2e:chromium
```

`pnpm.cmd test:e2e` runs every configured browser and therefore also requires
the Firefox and WebKit Playwright browser bundles. CI installs Chromium and runs
the Chromium suite; the other browsers remain configured for explicit local or
cross-browser release verification. Before a release candidate, install and run
the full suite on a supported macOS, Linux, or Windows machine:

```powershell
pnpm.cmd test:e2e:install:all
pnpm.cmd test:e2e
```

Record any Firefox or WebKit issue in the release pull request. The production
gate is passing Chromium in CI plus a successful local full-browser run; WebKit
uses Playwright's bundled engine rather than the user's installed Safari.
