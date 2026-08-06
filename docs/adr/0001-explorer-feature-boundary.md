# Explorer feature boundary

## Status

Accepted

## Context

The Explorer is the application's only interactive feature, but its state
transitions coordinate static-data requests, query-string state, browser
capabilities, exports, and a map adapter. Leaving those concerns in page
components made the product difficult to test and evolve.

The Explorer uses a local Solid feature with injected data, browser, export,
and map-facing dependencies instead of a global store. Its grouped public API
keeps the six concerns explicit: selection, loading, Explore, Table, Map, and
actions. This preserves testable state transitions without making domain rules
depend on Solid or browser APIs.

## Considered options

- A global application store: rejected because the product has one Explorer
  surface and no shared-state requirement.
- UI components owning fetches, URL writes, and calculations: rejected because
  it mixes external effects, reactive state, and election rules in page markup.

## Consequences

`App.tsx` creates one feature instance for its lifecycle and renders the
Explorer page. Browser and export capabilities are injected behind narrow
interfaces, allowing feature tests to use deterministic fakes. Components
consume prepared view data and actions; they do not fetch data, write URLs, or
own election calculations.
