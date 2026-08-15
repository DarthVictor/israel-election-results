import { describe, expect, it } from "vitest";
import {
  chooseAnalysisElection,
  chooseAnalysisLocality,
  chooseAnalysisMode,
  chooseAnalysisParty,
  chooseComparisonElection,
  chooseComparisonParty,
} from "./selection";
import { MANIFEST_SCHEMA_VERSION, type AnalysisState, type ElectionManifest } from "../contracts";

const manifest: ElectionManifest = {
  schemaVersion: MANIFEST_SCHEMA_VERSION,
  geometryUrl: "/data/localities.topo.json",
  elections: [
    {
      id: 24,
      date: "2021-03-23",
      label: "24th Knesset",
      sourceUrl: "https://example.test/24",
      sourceCsvUrl: "https://example.test/24.csv",
      dataUrl: "/data/elections/24.json",
      parties: [
        { id: "YESH-ATID", nameHe: "יש עתיד", nameEn: "Yesh Atid", nameRu: null },
        { id: "LIKUD", nameHe: "מחל", nameEn: "Likud", nameRu: null },
      ],
      nationalTotals: { eligible: 1, voters: 1, valid: 1, invalid: 0 },
    },
    {
      id: 25,
      date: "2022-11-01",
      label: "25th Knesset",
      sourceUrl: "https://example.test/25",
      sourceCsvUrl: "https://example.test/25.csv",
      dataUrl: "/data/elections/25.json",
      parties: [
        { id: "LIKUD", nameHe: "מחל", nameEn: "Likud", nameRu: null },
        { id: "LABOR", nameHe: "אמת", nameEn: "Labor", nameRu: null },
      ],
      nationalTotals: { eligible: 1, voters: 1, valid: 1, invalid: 0 },
    },
  ],
};

const exploreWithoutParty: AnalysisState = { mode: "explore", election: 25, party: "" };

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
