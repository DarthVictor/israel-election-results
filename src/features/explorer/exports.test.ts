import { describe, expect, it } from "vitest";
import type { AnalysisState, ElectionMetadata, LocalityResult } from "../../domain/contracts";
import { createStaticI18n } from "../../i18n/create-i18n";
import { analysisCsv, analysisSvg } from "./exports";
import { tableRows } from "./analysis";

const i18n = createStaticI18n("en");
const text = { fold: i18n.fold };

const election: ElectionMetadata = {
  id: 25,
  date: "2022-11-01",
  label: "25th Knesset",
  sourceUrl: "https://source.test",
  sourceCsvUrl: "https://source.test/localities.csv",
  dataUrl: "/data.json",
  parties: [{ id: "LIKUD", nameHe: "הליכוד", nameEn: "Likud", nameRu: null }],
  nationalTotals: { eligible: 10, voters: 9, valid: 8, invalid: 1 },
};
const locality: LocalityResult = {
  localityId: 1,
  nameHe: "מקום",
  nameEn: "Place",
  eligible: 100,
  voters: 80,
  valid: 75,
  invalid: 5,
  partyVotes: { LIKUD: 30 },
  partyRanks: { LIKUD: 1 },
  geography: "mappable",
  hasGeometry: true,
};
const state: AnalysisState = { mode: "table", election: 25, party: "LIKUD", turnoutMin: 60 };

describe("analysis exports", () => {
  it("creates UTF-8 BOM CSV with context and table values", () => {
    const csv = analysisCsv(
      tableRows([locality], "LIKUD", {}, text),
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

  it("creates a branded 1600 by 900 local vector SVG", () => {
    const svg = analysisSvg({
      i18n,
      features: [
        {
          type: "Feature",
          properties: { localityId: 1, nameHe: "מקום", nameEn: "Place" },
          geometry: {
            type: "Polygon",
            coordinates: [
              [
                [34, 31],
                [35, 31],
                [35, 32],
                [34, 31],
              ],
            ],
          },
        },
      ],
      rows: [locality],
      partyId: "LIKUD",
      title: "Likud",
      context: "25th Knesset",
      insight: "Strongest locality",
      source: "Official source",
    });
    expect(svg).toContain('width="1600" height="900"');
    expect(svg).toContain("ISRAEL ELECTION RESULTS EXPLORER");
    expect(svg).toContain("<path");
    expect(svg).toContain('fill-rule="evenodd"');
    expect(svg).not.toContain("tile");
  });

  it("mirrors the poster for Hebrew and keeps every label inside the canvas", () => {
    const poster = (locale: "he" | "en") =>
      analysisSvg({
        i18n: createStaticI18n(locale),
        features: [
          {
            type: "Feature",
            properties: { localityId: 1, nameHe: "מקום", nameEn: "Place" },
            geometry: {
              type: "Polygon",
              coordinates: [
                [
                  [34, 31],
                  [35, 31],
                  [35, 32],
                  [34, 31],
                ],
              ],
            },
          },
        ],
        rows: [locality],
        partyId: "LIKUD",
        title: "כותרת",
        context: "הקשר",
        insight: "תובנה",
        source: "מקור",
      });

    const hebrew = poster("he");
    const english = poster("en");
    expect(hebrew).toContain('direction="rtl"');
    expect(english).toContain('direction="ltr"');

    // text-anchor resolves against the inline direction, so naming one flipped the Hebrew
    // text off the right edge of the 1600-wide canvas. The default "start" is correct in both.
    expect(hebrew).not.toContain("text-anchor");
    expect(english).not.toContain("text-anchor");

    // Hebrew anchors its text column at the right and puts the map on the left; English is
    // the mirror image. Every anchor stays within the canvas either way.
    const anchors = (svg: string) =>
      [...svg.matchAll(/<text x="(\d+)"/g)].map((match) => Number(match[1]));
    expect(new Set(anchors(hebrew))).toEqual(new Set([1530]));
    expect(new Set(anchors(english))).toEqual(new Set([70]));
    for (const x of [...anchors(hebrew), ...anchors(english)]) {
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThanOrEqual(1600);
    }
  });

  it("rejects PNG SVG exports without active geometry and rows", () => {
    expect(() =>
      analysisSvg({
        i18n,
        features: [],
        rows: [],
        partyId: "LIKUD",
        title: "x",
        context: "x",
        insight: "x",
        source: "x",
      }),
    ).toThrow(/geometry and active election data/i);
  });

  it("includes B context and escaped comparison deltas only for active comparisons", () => {
    const b = { ...election, id: 24, label: 'Election "B"', parties: election.parties };
    const csv = analysisCsv(
      tableRows([locality], "LIKUD", {}, text, { rows: [locality], partyId: "LIKUD" }),
      { ...state, mode: "compare", compareElection: 24, compareParty: "LIKUD" },
      election,
      election.parties[0],
      { election: b, party: b.parties[0] },
    );
    expect(csv).toContain('"Election B","Election ""B"""');
    expect(csv).toContain('"Delta (pp)"');
  });
});
