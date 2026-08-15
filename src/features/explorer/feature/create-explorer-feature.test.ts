import { createRoot } from "solid-js";
import { describe, expect, it } from "vitest";
import type { ElectionManifest, ElectionResultsFile } from "../../../domain/contracts";
import type { ExplorerFeature as GeometryFeature } from "../topology";
import { createExplorerFeature } from "./create-explorer-feature";
import type { ExplorerFeature, ExplorerFeatureDependencies } from "./explorer-feature.types";
import { createStaticI18n } from "../../../i18n/create-i18n";

const i18n = createStaticI18n("en");

const manifest: ElectionManifest = {
  schemaVersion: 2,
  geometryUrl: "/data/localities.topo.json",
  elections: [
    {
      id: 24,
      date: "2021-03-23",
      label: "24th Knesset",
      sourceUrl: "https://example.test/24",
      sourceCsvUrl: "https://example.test/24.csv",
      dataUrl: "/data/elections/24.json",
      parties: [{ id: "YESH-ATID", nameHe: "×™×© ×¢×ª×™×“", nameEn: "Yesh Atid", nameRu: null }],
      nationalTotals: { eligible: 1, voters: 1, valid: 1, invalid: 0 },
    },
    {
      id: 25,
      date: "2022-11-01",
      label: "25th Knesset",
      sourceUrl: "https://example.test/25",
      sourceCsvUrl: "https://example.test/25.csv",
      dataUrl: "/data/elections/25.json",
      parties: [{ id: "LIKUD", nameHe: "×ž×—×œ", nameEn: "Likud", nameRu: null }],
      nationalTotals: { eligible: 1, voters: 1, valid: 1, invalid: 0 },
    },
  ],
};
const resultFor = (electionId: number): ElectionResultsFile => ({
  schemaVersion: 2,
  electionId,
  localities: [
    {
      localityId: 3000,
      nameHe: "×™×¨×•×©×œ×œ×™×",
      nameEn: "Jerusalem",
      eligible: 10,
      voters: 8,
      valid: 7,
      invalid: 1,
      partyVotes: electionId === 25 ? { LIKUD: 5 } : { "YESH-ATID": 5 },
      partyRanks: electionId === 25 ? { LIKUD: 1 } : { "YESH-ATID": 1 },
      geography: "mappable",
      hasGeometry: true,
    },
  ],
  unmatchedLocalityIds: [],
  nonGeographicLocalityIds: [],
});
const history = () => {
  const pushes: string[] = [];
  return {
    pushes,
    readSearch: () => "?mode=explore&election=25",
    pathname: () => "/",
    href: () => "https://example.test/?mode=explore&election=25",
    push: (_state: unknown, url: string) => pushes.push(url),
    replace: () => undefined,
    subscribe: () => () => undefined,
  };
};
const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

function harness(dependencies: Omit<ExplorerFeatureDependencies, "i18n">): {
  feature: ExplorerFeature;
  dispose(): void;
} {
  let feature!: ExplorerFeature;
  let dispose!: () => void;
  createRoot((nextDispose) => {
    dispose = nextDispose;
    feature = createExplorerFeature({ ...dependencies, i18n });
  });
  return { feature, dispose };
}

describe("Explorer feature", () => {
  it("exposes grouped selection, loading, explore, table, map, and action seams", async () => {
    const browser = history();
    const { feature, dispose } = harness({
      data: {
        loadManifest: async () => manifest,
        loadGeometry: async () => ({}),
        loadElection: async () => resultFor(25),
        topologyToFeatures: () => [] as GeometryFeature[],
      },
      history: browser,
    });

    expect(Object.keys(feature)).toEqual([
      "selection",
      "loading",
      "explore",
      "table",
      "map",
      "actions",
    ]);
    await feature.loading.reloadManifest();
    await settle();

    expect(feature.selection.state()).toEqual({ mode: "explore", election: 25, party: "" });
    expect(feature.explore.rows()).toEqual(resultFor(25).localities);
    expect(feature.map.ready()).toBe(false);
    feature.selection.chooseMode("table");
    expect(browser.pushes).toEqual(["/?mode=table&election=25&party=LIKUD"]);
    dispose();
  });
});
