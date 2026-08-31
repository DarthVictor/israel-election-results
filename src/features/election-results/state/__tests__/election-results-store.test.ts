import { describe, expect, it } from "vitest";
import { dependencies, resultFor, settle, storeHarness } from "./store-fixtures";

describe("election results store", () => {
  it("loads shared election data and keeps selection in the URL", async () => {
    const setup = dependencies();
    const { store, dispose } = storeHarness(setup.value);
    await store.actions.reloadManifest();
    await settle();

    expect(store.state.analysis).toEqual({ mode: "explore", election: 25, party: "" });
    expect(store.selectors.localities()).toEqual(resultFor(25).localities);
    expect(store.selectors.mapReady()).toBe(false);

    store.actions.chooseMode("table");
    expect(setup.pushedUrls).toEqual(["/?mode=table&election=25&party=LIKUD"]);
    dispose();
  });

  it("loads comparison data only for the comparison view", async () => {
    const setup = dependencies();
    const { store, dispose } = storeHarness(setup.value);
    await store.actions.reloadManifest();
    await settle();
    expect(store.state.comparisonResults).toBeUndefined();

    store.actions.chooseMode("compare");
    await settle();
    expect(store.selectors.comparisonResults()?.electionId).toBe(24);
    expect(store.selectors.comparisonReady()).toBe(true);
    dispose();
  });
});
