import { createRoot, createSignal } from "solid-js";
import { describe, expect, it } from "vitest";
import type { ElectionMetadata, ElectionResultsFile } from "../../../domain/contracts";
import { createElectionResultsLoader } from "./election-results-loader";

const election: ElectionMetadata = {
  id: 25,
  date: "2022-11-01",
  label: "25th",
  sourceUrl: "https://example.test",
  sourceCsvUrl: "https://example.test/csv",
  dataUrl: "/25",
  parties: [],
  nationalTotals: { eligible: 0, voters: 0, valid: 0, invalid: 0 },
};
const result: ElectionResultsFile = {
  schemaVersion: 1,
  electionId: 25,
  localities: [],
  unmatchedLocalityIds: [],
  nonGeographicLocalityIds: [],
};
const previousElection: ElectionMetadata = {
  ...election,
  id: 24,
  dataUrl: "/24",
};
const previousResult: ElectionResultsFile = {
  ...result,
  electionId: 24,
};
const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

describe("Election results loader", () => {
  it("recovers from an error through its explicit reload action", async () => {
    let attempts = 0;
    let loader!: ReturnType<typeof createElectionResultsLoader>;
    createRoot(() => {
      const [selected] = createSignal<ElectionMetadata | undefined>(election);
      loader = createElectionResultsLoader({
        selected,
        loadElection: async () => {
          attempts += 1;
          if (attempts === 1) throw new Error("temporary");
          return result;
        },
        mismatchMessage: "mismatch",
      });
    });
    await settle();
    expect(loader.error()).toBeInstanceOf(Error);
    loader.reload();
    await settle();
    expect(loader.results()).toEqual(result);
    expect(attempts).toBe(2);
  });

  it("ignores a stale result after the selected election changes", async () => {
    let resolveFirst!: (value: ElectionResultsFile) => void;
    let resolveSecond!: (value: ElectionResultsFile) => void;
    let setSelected!: (value: ElectionMetadata | undefined) => void;
    let loader!: ReturnType<typeof createElectionResultsLoader>;
    createRoot(() => {
      const [selected, updateSelected] = createSignal<ElectionMetadata | undefined>(election);
      setSelected = updateSelected;
      loader = createElectionResultsLoader({
        selected,
        loadElection: (url) =>
          new Promise((resolve) => {
            if (url === election.dataUrl) resolveFirst = resolve;
            else resolveSecond = resolve;
          }),
        mismatchMessage: "mismatch",
      });
    });
    await settle();
    setSelected(previousElection);
    await settle();
    resolveFirst(result);
    await settle();
    expect(loader.results()).toBeUndefined();
    resolveSecond(previousResult);
    await settle();
    expect(loader.results()).toEqual(previousResult);
  });

  it("ignores completion after owner disposal when the repository ignores abort", async () => {
    let resolveRequest!: (value: ElectionResultsFile) => void;
    let dispose!: () => void;
    let loader!: ReturnType<typeof createElectionResultsLoader>;
    createRoot((nextDispose) => {
      dispose = nextDispose;
      const [selected] = createSignal<ElectionMetadata | undefined>(election);
      loader = createElectionResultsLoader({
        selected,
        loadElection: () =>
          new Promise((resolve) => {
            resolveRequest = resolve;
          }),
        mismatchMessage: "mismatch",
      });
    });

    await settle();
    dispose();
    resolveRequest(result);
    await settle();

    expect(loader.results()).toBeUndefined();
    expect(loader.loading()).toBe(true);
  });
});
