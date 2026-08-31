import {
  type AnalysisState,
  type ElectionManifest,
  MANIFEST_SCHEMA_VERSION,
} from "../../contracts";

export const manifest: ElectionManifest = {
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

export const exploreWithoutParty: AnalysisState = { mode: "explore", election: 25, party: "" };
