import { createRoot, createSignal } from "solid-js";
import { describe, expect, it } from "vitest";
import type {
  AnalysisState,
  ElectionResultsFile,
  LocalityResult,
  PartyList,
} from "../../../domain/contracts";
import type { ExplorerFeature } from "../topology";
import { createMapView } from "./create-map-view";
import { createStaticI18n } from "../../../i18n/create-i18n";

const i18n = createStaticI18n("en");

const party: PartyList = { id: "LIKUD", nameHe: "×ž×—×œ", nameEn: "Likud", nameRu: null };
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
const result: ElectionResultsFile = {
  schemaVersion: 2,
  electionId: 25,
  localities: [locality],
  unmatchedLocalityIds: [],
  nonGeographicLocalityIds: [],
};
const feature: ExplorerFeature = {
  type: "Feature",
  properties: { localityId: 1, nameHe: "×™×™×©×•×‘", nameEn: "Place" },
  geometry: { type: "Polygon", coordinates: [] },
};

describe("Map view", () => {
  it("prepares readiness, unavailable feedback, selection, and retry inputs", async () => {
    let map!: ReturnType<typeof createMapView>;
    let retryCount = 0;
    let selected: number | undefined;
    createRoot(() => {
      const [state, setState] = createSignal<AnalysisState>({
        mode: "explore",
        election: 25,
        party: "LIKUD",
      });
      const [geometry, setGeometry] = createSignal<ExplorerFeature[]>([]);
      const [geometryError, setGeometryError] = createSignal<unknown>();
      const [currentResults, setCurrentResults] = createSignal<ElectionResultsFile>();
      const [comparisonReady] = createSignal(false);
      const [comparisonError, setComparisonError] = createSignal<unknown>();
      map = createMapView({
        t: i18n.t,
        state,
        geometry,
        geometryError,
        currentResults,
        rows: () => [locality],
        comparisonRows: () => [],
        comparisonReady,
        comparisonError,
        loadingComparison: () => false,
        compareParty: () => party,
        resultsError: () => undefined,
        chooseLocality: (localityId) => {
          selected = localityId;
        },
        reloadGeometry: async () => {
          retryCount += 1;
        },
      });

      expect(map.ready()).toBe(false);
      expect(map.unavailableMessage()).toBe("Loading map boundaries…");
      setGeometry([feature]);
      setCurrentResults(result);
      expect(map.ready()).toBe(true);
      map.onSelect(1);
      expect(selected).toBe(1);

      const failedGeometry = new Error("geometry");
      setGeometryError(failedGeometry);
      expect(map.ready()).toBe(false);
      expect(map.geometryError()).toBe(failedGeometry);
      void map.onRetryLoad();
      expect(retryCount).toBe(1);

      setGeometryError(undefined);
      setState({ mode: "compare", election: 25, party: "LIKUD", compareElection: 24 });
      setComparisonError(new Error("comparison"));
      expect(map.unavailableMessage()).toContain("Comparison results are unavailable");
    });
  });
});
