# Explorer controller boundary

## Status

Accepted

## Context

The Explorer is the application's only interactive feature, but its state transitions coordinate static-data requests, query-string state, browser APIs, exports, and a map adapter. Leaving those concerns in page components has made the product difficult to test and evolve.

The Explorer will use a local Solid controller with injected data, browser, export, and map-facing dependencies instead of a global store. The application has one bounded interactive feature and benefits from explicit, testable state transitions without making its domain rules depend on Solid or browser APIs; a global store would add lifetime and coupling costs without a second consumer.

## Considered options

- A global application store: rejected because the current product has one Explorer surface and no shared state requirement.
- UI components owning fetches, URL writes, and calculations: rejected because it mixes external effects, reactive state, and election rules in `App.tsx`, making behavior difficult to test.

## Consequences

`App.tsx` owns one controller instance for its lifecycle. Browser and export capabilities are injected behind narrow interfaces, allowing controller tests to use deterministic fakes. Components receive controller state and actions as props; they do not fetch data, write URLs, or own election calculations.
