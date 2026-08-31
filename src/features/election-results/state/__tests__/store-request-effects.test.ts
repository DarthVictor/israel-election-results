import { describe, expect, it } from "vitest";
import type { ElectionResultsFile } from "../../../../domain/contracts";
import { dependencies, resultFor, settle, storeHarness } from "./store-fixtures";

describe("election result requests", () => {
  it("ignores a stale election response after selection changes", async () => {
    const setup = dependencies();
    const requests = new Map<number, (value: ElectionResultsFile) => void>();
    setup.value.repository.loadElection = (url) => {
      const electionId = url.includes("24") ? 24 : 25;
      return new Promise((resolve) => requests.set(electionId, resolve));
    };
    const { store, dispose } = storeHarness(setup.value);
    await store.actions.reloadManifest();
    await settle();
    store.actions.chooseElection(24);
    await settle();

    requests.get(24)?.(resultFor(24));
    await settle();
    requests.get(25)?.(resultFor(25));
    await settle();

    expect(store.state.results?.electionId).toBe(24);
    expect(store.selectors.localities()).toEqual(resultFor(24).localities);
    dispose();
  });

  it("exposes a mismatched result file as a request error", async () => {
    const setup = dependencies();
    setup.value.repository.loadElection = async () => resultFor(24);
    const { store, dispose } = storeHarness(setup.value);
    await store.actions.reloadManifest();
    await settle();

    expect(store.state.results).toBeUndefined();
    expect(store.state.requests.results.error).toBeInstanceOf(Error);
    dispose();
  });
});
