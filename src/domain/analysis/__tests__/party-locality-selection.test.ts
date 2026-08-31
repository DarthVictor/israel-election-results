import { describe, expect, it } from "vitest";
import type { AnalysisState } from "../../contracts";
import {
  chooseAnalysisLocality,
  chooseAnalysisParty,
  chooseComparisonElection,
  chooseComparisonParty,
} from "../selection";
import { exploreWithoutParty, manifest } from "./selection-fixtures";

describe("party and locality selection transitions", () => {
  it("selects a Party List and clears a previously selected locality", () => {
    expect(
      chooseAnalysisParty({ ...exploreWithoutParty, locality: 3000 }, "LABOR", manifest),
    ).toEqual({ mode: "explore", election: 25, party: "LABOR" });
  });

  it.each(["table", "compare"] as const)(
    "does not allow %s to clear its required Party List",
    (mode) => {
      const state: AnalysisState = { mode, election: 25, party: "LIKUD", locality: 3000 };

      expect(chooseAnalysisParty(state, "", manifest)).toEqual({
        mode,
        election: 25,
        party: "LIKUD",
      });
    },
  );

  it("selects a locality without changing the other analysis choices", () => {
    expect(
      chooseAnalysisLocality({ ...exploreWithoutParty, party: "LIKUD" }, 3000, manifest),
    ).toEqual({
      mode: "explore",
      election: 25,
      party: "LIKUD",
      locality: 3000,
    });
  });

  it("changes Election B and initializes its first valid Party List", () => {
    const state: AnalysisState = {
      mode: "compare",
      election: 25,
      party: "LIKUD",
      compareElection: 24,
      compareParty: "YESH-ATID",
      locality: 3000,
    };

    expect(chooseComparisonElection(state, 25, manifest)).toEqual({
      mode: "compare",
      election: 25,
      party: "LIKUD",
      compareElection: 25,
      compareParty: "LIKUD",
      locality: 3000,
    });
  });

  it("changes Party List B within the active Election B", () => {
    const state: AnalysisState = {
      mode: "compare",
      election: 25,
      party: "LIKUD",
      compareElection: 24,
      compareParty: "YESH-ATID",
    };

    expect(chooseComparisonParty(state, "LIKUD", manifest)).toEqual({
      mode: "compare",
      election: 25,
      party: "LIKUD",
      compareElection: 24,
      compareParty: "LIKUD",
    });
  });
});
