import { describe, expect, it } from "vitest";
import { electionResultsCsv } from "../csv-export";
import { buildLocalityStatistics } from "../locality-statistics";
import { election, locality, state, text } from "./export-fixtures";

describe("election results CSV", () => {
  it("creates UTF-8 BOM CSV with context and locality values", () => {
    const csv = electionResultsCsv(
      buildLocalityStatistics([locality], "LIKUD", {}, text),
      state,
      election,
      election.parties[0],
    );
    expect(csv.startsWith("\uFEFF")).toBe(true);
    expect(csv).toContain('"Analysis mode","table"');
    expect(csv).toContain('"Place"');
    expect(csv).toContain('"30"');
    expect(csv).not.toContain('"Election B"');
    expect(csv).not.toContain('"Delta (pp)"');
  });

  it("includes B context and escaped comparison deltas only for comparisons", () => {
    const comparison = { ...election, id: 24, label: 'Election "B"' };
    const statistics = buildLocalityStatistics([locality], "LIKUD", {}, text, {
      localities: [locality],
      partyId: "LIKUD",
    });
    const csv = electionResultsCsv(
      statistics,
      { ...state, mode: "compare", compareElection: 24, compareParty: "LIKUD" },
      election,
      election.parties[0],
      { election: comparison, party: comparison.parties[0] },
    );
    expect(csv).toContain('"Election B","Election ""B"""');
    expect(csv).toContain('"Delta (pp)"');
  });
});
