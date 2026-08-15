import { describe, expect, it } from "vitest";
import type { LocalityResult } from "../../domain/contracts";
import {
  comparisonDelta,
  comparisonLocalities,
  colorForShare,
  createThresholdScale,
  partyShare,
  sortTableRows,
  strongestLocality,
  tableRows,
  turnout,
} from "./analysis";
import { createStaticI18n } from "../../i18n/create-i18n";

const i18n = createStaticI18n("en");
const text = { fold: i18n.fold, compare: i18n.compare, localityName: i18n.localityName };

const row = (localityId: number, votes: number, valid = 100): LocalityResult => ({
  localityId,
  nameHe: "מקום",
  nameEn: "Place",
  eligible: 200,
  voters: valid,
  valid,
  invalid: 0,
  partyVotes: { LIKUD: votes },
  partyRanks: {},
  geography: "mappable",
  hasGeometry: true,
});

describe("explorer analysis", () => {
  it("calculates party share and turnout safely", () => {
    expect(partyShare(row(1, 35), "LIKUD")).toBe(35);
    expect(turnout({ eligible: 0, voters: 0, valid: 0, invalid: 0 })).toBe(0);
  });

  it("builds a data-driven choropleth scale", () => {
    const scale = createThresholdScale(
      [row(1, 0), row(2, 20), row(3, 50), row(4, 80), row(5, 100)],
      "LIKUD",
    );
    expect(scale.thresholds).toEqual([0, 20, 50, 80]);
    expect(colorForShare(100, scale)).toBe(scale.colors[4]);
    expect(colorForShare(undefined, scale)).toBe("#d9e7f3");
  });

  it("finds the strongest mappable locality", () => {
    expect(strongestLocality([row(1, 30), row(2, 70)], "LIKUD")?.localityId).toBe(2);
  });

  it("calculates comparison change as B minus A percentage points", () => {
    expect(comparisonDelta(row(1, 20), "LIKUD", row(1, 45), "LIKUD")).toBe(25);
    expect(comparisonDelta(row(1, 20), "LIKUD", undefined, "LIKUD")).toBeUndefined();
  });

  it("filters mapped locality rows and sorts them by the selected list rank", () => {
    const first = row(1, 40);
    first.nameEn = "Alpha";
    first.partyRanks = { LIKUD: 2 };
    const second = row(2, 25);
    second.nameEn = "Beta";
    second.partyRanks = { LIKUD: 1 };
    const hidden = row(3, 90);
    hidden.geography = "unmatchedBoundary";

    const filtered = tableRows([first, second, hidden], "LIKUD", { shareMin: 30 }, text);
    expect(filtered.map((item) => item.locality.localityId)).toEqual([1]);
    expect(
      sortTableRows(tableRows([first, second], "LIKUD", {}, text), "rank", "asc", text).map(
        (item) => item.locality.localityId,
      ),
    ).toEqual([2, 1]);
  });

  it("unions A-only and B-only localities for comparison search and table rows", () => {
    const first = row(1, 20);
    first.nameEn = "A only";
    const second = row(2, 40);
    second.nameEn = "B only";
    const all = comparisonLocalities([first], [second]);
    const rows = tableRows([first], "LIKUD", {}, text, { rows: [second], partyId: "LIKUD" });
    expect(all.map((item) => item.localityId)).toEqual([1, 2]);
    expect(rows.map((item) => item.locality.nameEn)).toEqual(["A only", "B only"]);
    expect(rows[1].first).toBeUndefined();
    expect(rows[1].second?.localityId).toBe(2);
    expect(rows[1].delta).toBeUndefined();
  });
});
