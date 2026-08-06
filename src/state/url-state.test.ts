import { describe, expect, it } from "vitest";
import { MANIFEST_SCHEMA_VERSION, type ElectionManifest } from "../domain/contracts";
import { parseAnalysisState, serializeAnalysisState } from "./url-state";

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
      parties: [{ id: "YESH-ATID", nameHe: "יש עתיד", nameEn: "Yesh Atid" }],
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
        { id: "LIKUD", nameHe: "הליכוד", nameEn: "Likud" },
        { id: "LABOR", nameHe: "העבודה", nameEn: "Labor" },
      ],
      nationalTotals: { eligible: 1, voters: 1, valid: 1, invalid: 0 },
    },
  ],
};

describe("analysis URL state", () => {
  it.each(["", "?mode=explore", "?mode=table&election=25&party=LABOR"])(
    "leaves comparison choices undefined when they are absent (%s)",
    (search) => {
      const state = parseAnalysisState(search, manifest);

      expect(state.compareElection).toBeUndefined();
      expect(state.compareParty).toBeUndefined();
    },
  );

  it("restores valid independent explore and comparison choices", () => {
    expect(
      parseAnalysisState(
        "?mode=compare&election=25&party=LABOR&compareElection=24&compareParty=YESH-ATID&locality=3000&turnoutMin=60&shareMin=5&minValidVotes=100",
        manifest,
      ),
    ).toEqual({
      mode: "compare",
      election: 25,
      party: "LABOR",
      compareElection: 24,
      compareParty: "YESH-ATID",
      locality: 3000,
      turnoutMin: 60,
      shareMin: 5,
      minValidVotes: 100,
    });
  });

  it("normalizes a compare URL without B choices to an explicit valid B selection", () => {
    expect(parseAnalysisState("?mode=compare&election=25&party=LABOR", manifest)).toMatchObject({
      mode: "compare",
      compareElection: 24,
      compareParty: "YESH-ATID",
    });
  });

  it("falls back when election, party, mode, and numeric values are invalid", () => {
    expect(
      parseAnalysisState(
        "?mode=invalid&election=23&party=unknown&compareElection=25&compareParty=unknown&locality=-1&turnoutMin=101&shareMin=nope&minValidVotes=-1",
        manifest,
      ),
    ).toEqual({
      mode: "explore",
      election: 25,
      party: "LIKUD",
      compareElection: 25,
      compareParty: "LIKUD",
    });
  });

  it("starts Explore without a party until one is explicitly chosen", () => {
    expect(parseAnalysisState("?mode=explore&election=25", manifest).party).toBe("");
    expect(serializeAnalysisState({ mode: "explore", election: 25, party: "" })).toBe(
      "mode=explore&election=25",
    );
  });

  it("serializes all explicit state values into a shareable query string", () => {
    expect(
      serializeAnalysisState({
        mode: "table",
        election: 25,
        party: "LIKUD",
        locality: 3000,
        turnoutMin: 50,
      }),
    ).toBe("mode=table&election=25&party=LIKUD&locality=3000&turnoutMin=50");
  });
});
