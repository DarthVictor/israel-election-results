import { createRoot, createSignal } from "solid-js";
import { describe, expect, it } from "vitest";
import type { ElectionManifest } from "../../../domain/contracts";
import { createAnalysisSelection, type AnalysisSelection } from "./create-analysis-selection";

const manifest: ElectionManifest = {
  schemaVersion: 2,
  geometryUrl: "/geometry",
  elections: [
    {
      id: 24,
      date: "2021-03-23",
      label: "24th Knesset",
      sourceUrl: "https://example.test/24",
      sourceCsvUrl: "https://example.test/24.csv",
      dataUrl: "/24",
      parties: [{ id: "YESH", nameHe: "יש", nameEn: "Yesh", nameRu: null }],
      nationalTotals: { eligible: 1, voters: 1, valid: 1, invalid: 0 },
    },
    {
      id: 25,
      date: "2022-11-01",
      label: "25th Knesset",
      sourceUrl: "https://example.test/25",
      sourceCsvUrl: "https://example.test/25.csv",
      dataUrl: "/25",
      parties: [{ id: "LIKUD", nameHe: "מחל", nameEn: "Likud", nameRu: null }],
      nationalTotals: { eligible: 1, voters: 1, valid: 1, invalid: 0 },
    },
  ],
};

function browser(search = "?mode=explore&election=25") {
  const pushes: string[] = [];
  let listener: (() => void) | undefined;
  return {
    pushes,
    readSearch: () => search,
    pathname: () => "/",
    push: (_state: unknown, url: string) => pushes.push(url),
    replace: () => undefined,
    subscribe: (next: () => void) => {
      listener = next;
      return () => {
        listener = undefined;
      };
    },
    restore: (next: string) => {
      search = next;
      listener?.();
    },
  };
}

function harness(search?: string) {
  const history = browser(search);
  let selection!: AnalysisSelection;
  let dispose!: () => void;
  createRoot((nextDispose) => {
    dispose = nextDispose;
    const [currentManifest] = createSignal(manifest);
    selection = createAnalysisSelection({ manifest: currentManifest, history });
  });
  return { selection, history, dispose };
}

describe("Analysis Selection", () => {
  it("restores a party-less Explore Analysis", () => {
    const { selection, dispose } = harness();
    selection.restore();
    expect(selection.state()).toEqual({ mode: "explore", election: 25, party: "" });
    dispose();
  });
  it("requires a Party List when mode changes to Table", () => {
    const { selection, dispose } = harness();
    selection.restore();
    selection.chooseMode("table");
    expect(selection.state()).toEqual({ mode: "table", election: 25, party: "LIKUD" });
    dispose();
  });
  it("writes a canonical URL for a locality selection", () => {
    const { selection, history, dispose } = harness();
    selection.restore();
    selection.chooseLocality(3000);
    expect(history.pushes).toEqual(["/?mode=explore&election=25&locality=3000"]);
    dispose();
  });
  it("restores browser history changes", () => {
    const { selection, history, dispose } = harness();
    selection.restore();
    history.restore("?mode=explore&election=24&party=YESH");
    expect(selection.state()).toEqual({ mode: "explore", election: 24, party: "YESH" });
    dispose();
  });
});
