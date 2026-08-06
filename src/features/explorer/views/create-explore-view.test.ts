import { createRoot, createSignal } from "solid-js";
import { describe, expect, it } from "vitest";
import type {
  AnalysisState,
  ElectionMetadata,
  ElectionResultsFile,
  LocalityResult,
  PartyList,
} from "../../../domain/contracts";
import { createExploreView } from "./create-explore-view";

const party: PartyList = { id: "LIKUD", nameHe: "×ž×—×œ", nameEn: "Likud" };
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
const result = (electionId: number, localities: LocalityResult[]): ElectionResultsFile => ({
  schemaVersion: 1,
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
        state,
        election: () => election,
        compareElection: () => comparisonElection,
        compareParty: () => party,
        results,
        comparisonResults,
      });

      expect(view.comparisonReady()).toBe(true);
      expect(view.selectableRows().map((row) => row.localityId)).toEqual([1, 2, 3]);
      expect(view.selected()?.localityId).toBe(2);
      expect(view.selectedComparison()?.partyVotes.LIKUD).toBe(40);
      expect(view.nationalShare()).toBe(0.7);

      view.setSearch("bravo");
      expect(view.queryMatches().map((row) => row.localityId)).toEqual([3]);

      setState({ ...comparisonState, mode: "explore" });
      expect(view.comparisonReady()).toBe(false);
      expect(view.selectableRows().map((row) => row.localityId)).toEqual([1, 2]);
    });
  });
});
