import { createRoot, createSignal } from "solid-js";
import { describe, expect, it } from "vitest";
import type {
  AnalysisState,
  ElectionMetadata,
  ElectionResultsFile,
  LocalityResult,
  PartyList,
} from "../../../domain/contracts";
import type { ExplorerFeature } from "../topology";
import { createExploreView } from "./create-explore-view";
import { createStaticI18n } from "../../../i18n/create-i18n";

const i18n = createStaticI18n("en");

const party: PartyList = { id: "LIKUD", nameHe: "×ž×—×œ", nameEn: "Likud", nameRu: null };
const election: ElectionMetadata = {
  id: 25,
  date: "2022-11-01",
  label: "25th Knesset",
  sourceUrl: "https://example.test/25",
  sourceCsvUrl: "https://example.test/25.csv",
  dataUrl: "/25",
  parties: [party],
  nationalTotals: { eligible: 100, voters: 100, valid: 100, invalid: 0 },
};
const comparisonElection: ElectionMetadata = { ...election, id: 24, dataUrl: "/24" };
const locality = (localityId: number, nameEn: string, votes: number): LocalityResult => ({
  localityId,
  nameHe: `×™×™×©×•×‘ ${localityId}`,
  nameEn,
  eligible: 100,
  voters: 90,
  valid: 100,
  invalid: 0,
  partyVotes: { LIKUD: votes },
  partyRanks: { LIKUD: 1 },
  geography: "mappable",
  hasGeometry: true,
});
const boundary = (localityId: number, nameEn: string): ExplorerFeature => ({
  type: "Feature",
  properties: { localityId, nameHe: `יישוב ${localityId}`, nameEn },
  geometry: { type: "Polygon", coordinates: [] },
});
const result = (electionId: number, localities: LocalityResult[]): ElectionResultsFile => ({
  schemaVersion: 2,
  electionId,
  localities,
  unmatchedLocalityIds: [],
  nonGeographicLocalityIds: [],
});

describe("Explore view", () => {
  it("derives comparison search and selected locality pairs from narrow accessors", () => {
    let view!: ReturnType<typeof createExploreView>;
    createRoot(() => {
      const comparisonState: AnalysisState = {
        mode: "compare",
        election: 25,
        party: "LIKUD",
        locality: 2,
        compareElection: 24,
        compareParty: "LIKUD",
      };
      const [state, setState] = createSignal<AnalysisState>(comparisonState);
      const [results] = createSignal(
        result(25, [locality(1, "Alpha", 20), locality(2, "Shared", 50)]),
      );
      const [comparisonResults] = createSignal(
        result(24, [locality(2, "Shared", 40), locality(3, "Bravo", 70)]),
      );
      view = createExploreView({
        i18n,
        state,
        election: () => election,
        compareElection: () => comparisonElection,
        compareParty: () => party,
        results,
        comparisonResults,
        geometry: () => [
          boundary(1, "Alpha"),
          boundary(2, "Shared"),
          boundary(3, "Bravo"),
          boundary(5519, "Hof HaSharon"),
        ],
      });

      expect(view.comparisonReady()).toBe(true);
      expect(view.selectableRows().map((row) => row.localityId)).toEqual([1, 2, 3]);
      // Both elections' localities stay on the map; the unreported boundary never does.
      expect(view.mappableGeometry().map((feature) => feature.properties.localityId)).toEqual([
        1, 2, 3,
      ]);
      expect(view.selected()?.localityId).toBe(2);
      expect(view.selectedComparison()?.partyVotes.LIKUD).toBe(40);
      expect(view.nationalShare()).toBe(0.7);

      view.setSearch("bravo");
      expect(view.queryMatches().map((row) => row.localityId)).toEqual([3]);

      setState({ ...comparisonState, mode: "explore" });
      expect(view.comparisonReady()).toBe(false);
      expect(view.selectableRows().map((row) => row.localityId)).toEqual([1, 2]);
      // Leaving comparison drops the boundary that only Election B reports.
      expect(view.mappableGeometry().map((feature) => feature.properties.localityId)).toEqual([
        1, 2,
      ]);
    });
  });

  it("names a selected map area the election reports no results for", () => {
    createRoot(() => {
      const [state, setState] = createSignal<AnalysisState>({
        mode: "explore",
        election: 25,
        party: "LIKUD",
        locality: 5519,
      });
      const view = createExploreView({
        i18n,
        state,
        election: () => election,
        compareElection: () => undefined,
        compareParty: () => undefined,
        results: () => result(25, [locality(1, "Alpha", 20)]),
        comparisonResults: () => undefined,
        geometry: () => [boundary(5519, "Hof HaSharon"), boundary(1, "Alpha")],
      });

      expect(view.selected()).toBeUndefined();
      expect(view.selectedWithoutResults()?.nameEn).toBe("Hof HaSharon");
      // The area is kept off the map, so it cannot be clicked in the first place.
      expect(view.mappableGeometry().map((feature) => feature.properties.localityId)).toEqual([1]);

      // A locality with results is described by its result row, not by the boundary.
      setState({ mode: "explore", election: 25, party: "LIKUD", locality: 1 });
      expect(view.selectedWithoutResults()).toBeUndefined();

      // Nothing selected leaves the panel on its empty state.
      setState({ mode: "explore", election: 25, party: "LIKUD" });
      expect(view.selectedWithoutResults()).toBeUndefined();
    });
  });
});
