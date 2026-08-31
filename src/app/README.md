# Application shell

`app/` owns top-level composition and browser-only adapters. `App.tsx` creates
the election-results store from `create-browser-dependencies.ts`; feature layout
and UI live under `features/election-results/`.
