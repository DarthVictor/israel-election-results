import { describe, expect, it } from "vitest";
import { createStaticI18n } from "../../../i18n/create-i18n";
import { electionMapSvg } from "../map-image-export";
import { boundary, i18n, locality } from "./export-fixtures";

const poster = (locale: "he" | "en") =>
  electionMapSvg({
    i18n: createStaticI18n(locale),
    boundaries: [boundary],
    localities: [locality],
    partyId: "LIKUD",
    title: "כותרת",
    context: "הקשר",
    insight: "תובנה",
    source: "מקור",
  });

describe("election map image", () => {
  it("creates a branded 1600 by 900 local vector SVG", () => {
    const svg = electionMapSvg({
      i18n,
      boundaries: [boundary],
      localities: [locality],
      partyId: "LIKUD",
      title: "Likud",
      context: "25th Knesset",
      insight: "Strongest locality",
      source: "Official source",
    });
    expect(svg).toContain('width="1600" height="900"');
    expect(svg).toContain("ISRAEL ELECTION RESULTS");
    expect(svg).toContain("<path");
    expect(svg).toContain('fill-rule="evenodd"');
    expect(svg).not.toContain("tile");
  });

  it("mirrors Hebrew and keeps every label inside the canvas", () => {
    const hebrew = poster("he");
    const english = poster("en");
    expect(hebrew).toContain('direction="rtl"');
    expect(english).toContain('direction="ltr"');
    expect(hebrew).not.toContain("text-anchor");
    expect(english).not.toContain("text-anchor");
    const anchors = (svg: string) =>
      [...svg.matchAll(/<text x="(\d+)"/g)].map((match) => Number(match[1]));
    expect(new Set(anchors(hebrew))).toEqual(new Set([1530]));
    expect(new Set(anchors(english))).toEqual(new Set([70]));
    for (const x of [...anchors(hebrew), ...anchors(english)]) {
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThanOrEqual(1600);
    }
  });

  it("rejects exports without active boundaries and results", () => {
    expect(() =>
      electionMapSvg({
        i18n,
        boundaries: [],
        localities: [],
        partyId: "LIKUD",
        title: "x",
        context: "x",
        insight: "x",
        source: "x",
      }),
    ).toThrow(/geometry and active election data/i);
  });
});
