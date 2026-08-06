import { createRoot, createSignal } from "solid-js";
import { describe, expect, it } from "vitest";
import type {
  AnalysisState,
  ElectionManifest,
  LocalityResult,
  PartyList,
} from "../../../domain/contracts";
import type { ExplorerFeature } from "../topology";
import { createExplorerActions } from "./create-explorer-actions";

const party: PartyList = { id: "LIKUD", nameHe: "×ž×—×œ", nameEn: "Likud" };
const manifest: ElectionManifest = {
  schemaVersion: 1,
  geometryUrl: "/geometry",
  elections: [],
};
const state: AnalysisState = { mode: "table", election: 25, party: "LIKUD" };
const locality: LocalityResult = {
  localityId: 1,
  nameHe: "×™×™×©×•×‘",
  nameEn: "Place",
  eligible: 100,
  voters: 80,
  valid: 70,
  invalid: 0,
  partyVotes: { LIKUD: 20 },
  partyRanks: { LIKUD: 1 },
  geography: "mappable",
  hasGeometry: true,
};
const feature: ExplorerFeature = {
  type: "Feature",
  properties: { localityId: 1, nameHe: "×™×™×©×•×‘", nameEn: "Place" },
  geometry: {
    type: "Polygon",
    coordinates: [
      [
        [34, 31],
        [35, 31],
        [34, 32],
      ],
    ],
  },
};

function actionsHarness(browser?: Parameters<typeof createExplorerActions>[0]["browser"]) {
  let actions!: ReturnType<typeof createExplorerActions>;
  const writes: boolean[] = [];
  createRoot(() => {
    const [currentState] = createSignal(state);
    actions = createExplorerActions({
      manifest: () => manifest,
      state: currentState,
      writeState: (_next, replace) => writes.push(Boolean(replace)),
      currentUrl: () => "https://example.test/?mode=table",
      filteredTable: () => [
        {
          locality,
          partyId: "LIKUD",
          votes: 20,
          share: 28.57,
          turnout: 80,
        },
      ],
      election: () => ({
        id: 25,
        date: "2022-11-01",
        label: "25th",
        sourceUrl: "https://example.test",
        sourceCsvUrl: "https://example.test/csv",
        dataUrl: "/25",
        parties: [party],
        nationalTotals: { eligible: 100, voters: 80, valid: 70, invalid: 0 },
      }),
      party: () => party,
      compareElection: () => undefined,
      compareParty: () => undefined,
      comparisonRows: () => [],
      comparisonReady: () => false,
      geometry: () => [feature],
      localityRows: () => [locality],
      browser,
    });
  });
  return { actions, writes };
}

describe("Explorer actions", () => {
  it("reports copy success and accessible fallback feedback", async () => {
    let rejectCopy = false;
    const { actions, writes } = actionsHarness({
      clipboard: {
        writeText: async () => {
          if (rejectCopy) throw new Error("blocked");
        },
      },
    });

    await actions.copyLink();
    expect(actions.status()).toBe("Analysis link copied to your clipboard.");
    expect(writes).toEqual([true]);

    rejectCopy = true;
    await actions.copyLink();
    expect(actions.status()).toBe("Copy this analysis link from your browser address bar.");
  });

  it("reports CSV and PNG export success or failure through the status seam", async () => {
    let failCsv = false;
    let failPng = false;
    const downloads: string[] = [];
    const { actions } = actionsHarness({
      exports: {
        downloadText: (filename) => {
          if (failCsv) throw new Error("blocked");
          downloads.push(filename);
        },
        pngFromSvg: async () => {
          if (failPng) throw new Error("render blocked");
          return new Blob(["png"]);
        },
        downloadBlob: (filename) => downloads.push(filename),
      },
    });

    actions.downloadCsv();
    expect(actions.status()).toBe("CSV download started.");
    await actions.downloadPng();
    expect(actions.status()).toBe("PNG download started.");
    expect(downloads).toEqual(["israel-election-analysis.csv", "israel-election-analysis.png"]);

    failCsv = true;
    actions.downloadCsv();
    expect(actions.status()).toBe("CSV export failed.");
    failPng = true;
    await actions.downloadPng();
    expect(actions.status()).toBe("PNG export failed: render blocked");
  });
});
