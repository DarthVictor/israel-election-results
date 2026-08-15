import { createRoot, createSignal } from "solid-js";
import { describe, expect, it } from "vitest";
import type { AnalysisState, LocalityResult } from "../../../domain/contracts";
import { createTableView } from "./create-table-view";
import { createStaticI18n } from "../../../i18n/create-i18n";

const i18n = createStaticI18n("en");

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

describe("Table view", () => {
  it("owns local search and sort while applying selection filters", () => {
    let view!: ReturnType<typeof createTableView>;
    createRoot(() => {
      const [state] = createSignal<AnalysisState>({
        mode: "table",
        election: 25,
        party: "LIKUD",
        shareMin: 30,
      });
      const [rows] = createSignal([
        locality(1, "Alpha", 30),
        locality(2, "Beta", 60),
        locality(3, "Gamma", 20),
      ]);
      view = createTableView({
        i18n,
        state,
        compareParty: () => undefined,
        rows,
        comparisonRows: () => [],
      });

      expect(view.filteredTable().map((row) => row.locality.localityId)).toEqual([2, 1]);

      view.setTableSearch("alpha");
      expect(view.tableSearch()).toBe("alpha");
      expect(view.filteredTable().map((row) => row.locality.localityId)).toEqual([1]);

      view.setTableSearch("");
      view.setTableSort({ key: "name", direction: "asc" });
      expect(view.tableSort()).toEqual({ key: "name", direction: "asc" });
      expect(view.filteredTable().map((row) => row.locality.localityId)).toEqual([1, 2]);
    });
  });
});
