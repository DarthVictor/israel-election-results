import { describe, expect, it } from "vitest";
import type { AnalysisState } from "../../contracts";
import { chooseAnalysisElection, chooseAnalysisMode } from "../selection";
import { exploreWithoutParty, manifest } from "./selection-fixtures";

describe("analysis selection transitions", () => {
  it("chooses the first valid Party List when party-less Explore changes to Table", () => {
    expect(chooseAnalysisMode(exploreWithoutParty, "table", manifest)).toEqual({
      mode: "table",
      election: 25,
      party: "LIKUD",
    });
  });

  it("initializes an independent B Election and Party List when Explore changes to Compare", () => {
    expect(chooseAnalysisMode(exploreWithoutParty, "compare", manifest)).toEqual({
      mode: "compare",
      election: 25,
      party: "LIKUD",
      compareElection: 24,
      compareParty: "YESH-ATID",
    });
  });

  it("keeps an explicit valid comparison choice when changing to Compare", () => {
    const state: AnalysisState = {
      mode: "explore",
      election: 25,
      party: "LIKUD",
      compareElection: 24,
      compareParty: "LIKUD",
    };

    expect(chooseAnalysisMode(state, "compare", manifest)).toEqual({ ...state, mode: "compare" });
  });

  it("keeps a compatible Party List and clears locality when changing Election", () => {
    const state: AnalysisState = {
      mode: "explore",
      election: 25,
      party: "LIKUD",
      locality: 3000,
      turnoutMin: 60,
    };

    expect(chooseAnalysisElection(state, 24, manifest)).toEqual({
      mode: "explore",
      election: 24,
      party: "LIKUD",
      turnoutMin: 60,
    });
  });

  it("clears an incompatible Party List and locality when changing Election", () => {
    const state: AnalysisState = {
      mode: "explore",
      election: 25,
      party: "LABOR",
      locality: 3000,
    };

    expect(chooseAnalysisElection(state, 24, manifest)).toEqual({
      mode: "explore",
      election: 24,
      party: "",
    });
  });

  it.each(["table", "compare"] as const)(
    "chooses the first valid Party List when changing Election in %s",
    (mode) => {
      const state: AnalysisState = {
        mode,
        election: 25,
        party: "LABOR",
        locality: 3000,
      };

      expect(chooseAnalysisElection(state, 24, manifest)).toEqual({
        mode,
        election: 24,
        party: "YESH-ATID",
      });
    },
  );

  it("leaves the selection unchanged when the requested Election is absent", () => {
    expect(chooseAnalysisElection(exploreWithoutParty, 99, manifest)).toEqual(exploreWithoutParty);
  });
});
