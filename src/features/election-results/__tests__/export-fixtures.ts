import type { AnalysisState, ElectionMetadata, LocalityResult } from "../../../domain/contracts";
import { createStaticI18n } from "../../../i18n/create-i18n";

export const i18n = createStaticI18n("en");
export const text = { fold: i18n.fold };
export const election: ElectionMetadata = {
  id: 25,
  date: "2022-11-01",
  label: "25th Knesset",
  sourceUrl: "https://source.test",
  sourceCsvUrl: "https://source.test/localities.csv",
  dataUrl: "/data.json",
  parties: [{ id: "LIKUD", nameHe: "הליכוד", nameEn: "Likud", nameRu: null }],
  nationalTotals: { eligible: 10, voters: 9, valid: 8, invalid: 1 },
};
export const locality: LocalityResult = {
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
export const state: AnalysisState = {
  mode: "table",
  election: 25,
  party: "LIKUD",
  turnoutMin: 60,
};

export const boundary = {
  type: "Feature" as const,
  properties: { localityId: 1, nameHe: "מקום", nameEn: "Place" },
  geometry: {
    type: "Polygon" as const,
    coordinates: [
      [
        [34, 31],
        [35, 31],
        [35, 32],
        [34, 31],
      ],
    ] as [number, number][][],
  },
};
