import { SITE_HOST } from "../../site";
import type {
  AnalysisState,
  ElectionMetadata,
  LocalityResult,
  PartyList,
} from "../../domain/contracts";
import {
  colorForComparison,
  colorForShare,
  createThresholdScale,
  partyShare,
  type TableRow,
} from "./analysis";
import type { I18n } from "../../i18n/create-i18n";
import type { ExplorerFeature } from "./topology";

const csvCell = (value: string | number | null | undefined) =>
  `"${String(value ?? "").replaceAll('"', '""')}"`;

/**
 * Deliberately not translated. The CSV is a machine-readable export whose column names and
 * decimal formatting are part of its contract with whatever reads it next; a spreadsheet that
 * changes shape with the reader's interface language is not a stable format.
 */
export function analysisCsv(
  rows: readonly TableRow[],
  state: AnalysisState,
  election: ElectionMetadata | undefined,
  party: PartyList | undefined,
  comparison?: { election?: ElectionMetadata; party?: PartyList },
): string {
  const hasComparison = state.mode === "compare" && !!comparison?.election && !!comparison.party;
  const context = [
    ["Analysis mode", state.mode],
    ["Election A", election?.label],
    ["List A", party?.nameEn ?? party?.nameHe],
    ...(hasComparison
      ? [
          ["Election B", comparison?.election?.label],
          ["List B", comparison?.party?.nameEn ?? comparison?.party?.nameHe],
        ]
      : []),
    ["Minimum turnout", state.turnoutMin],
    ["Minimum share", state.shareMin],
    ["Minimum valid ballots", state.minValidVotes],
    [],
  ];
  const header = [
    "Locality ID",
    "Locality (Hebrew)",
    "Locality (English)",
    "Votes",
    "Share (%)",
    "Turnout (%)",
    "Valid ballots",
    "Rank",
    ...(hasComparison ? ["Delta (pp)"] : []),
  ];
  const data = rows.map((row) => [
    row.locality.localityId,
    row.locality.nameHe,
    row.locality.nameEn,
    row.votes,
    row.share.toFixed(2),
    row.turnout.toFixed(2),
    row.locality.valid,
    row.locality.partyRanks[state.party],
    ...(hasComparison ? [row.delta?.toFixed(2)] : []),
  ]);
  return (
    "\uFEFF" + [...context, header, ...data].map((row) => row.map(csvCell).join(",")).join("\r\n")
  );
}

type ExportMap = {
  i18n: I18n;
  features: readonly ExplorerFeature[];
  rows: readonly LocalityResult[];
  partyId: string;
  title: string;
  context: string;
  insight: string;
  source: string;
  comparison?: { rows: readonly LocalityResult[]; partyId: string };
};

function rings(feature: ExplorerFeature): [number, number][][] {
  if (feature.geometry.type === "Polygon") {
    return feature.geometry.coordinates as [number, number][][];
  }
  return (feature.geometry.coordinates as [number, number][][][]).flat();
}

/** Produces a self-contained SVG with only local vector geometry and analysis values. */
export function analysisSvg(map: ExportMap): string {
  if (map.features.length === 0 || map.rows.length === 0) {
    throw new Error("Map geometry and active election data are required for PNG export.");
  }
  const { t } = map.i18n;
  const width = 1600;
  const height = 900;
  // Hebrew mirrors the whole poster: the text column moves to the right edge and the map to
  // the left, so the reader's eye still meets the title before the map.
  const rtl = map.i18n.direction() === "rtl";
  // text-anchor is resolved against the inline direction, so the default "start" already
  // means the left edge in English and the right edge in Hebrew. Naming an anchor explicitly
  // is what pushed the Hebrew text off the right of the canvas.
  const textX = rtl ? 1530 : 70;
  const ruleEndX = rtl ? 1210 : 390;
  const legendX = (index: number) => (rtl ? 1530 - 48 - index * 50 : 70 + index * 50);
  const mapLeft = rtl ? 70 : 470;
  const mapTop = 80;
  const mapWidth = 1060;
  const mapHeight = 700;
  const positions = map.features.flatMap((feature) => rings(feature).flat());
  const xs = positions.map((point) => point[0]);
  const ys = positions.map((point) => point[1]);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const scale = Math.min(mapWidth / (maxX - minX || 1), mapHeight / (maxY - minY || 1));
  const rows = new Map(map.rows.map((row) => [row.localityId, row]));
  const comparisonRows = new Map(map.comparison?.rows.map((row) => [row.localityId, row]));
  const thresholds = createThresholdScale(map.rows, map.partyId);
  const pathFor = (ring: [number, number][]) =>
    ring
      .map(
        ([x, y], index) =>
          `${index ? "L" : "M"}${(mapLeft + (x - minX) * scale).toFixed(1)},${(mapTop + (maxY - y) * scale).toFixed(1)}`,
      )
      .join(" ") + " Z";
  const paths = map.features
    .map((feature) => {
      const row = rows.get(feature.properties.localityId);
      const fill = map.comparison
        ? colorForComparison(
            row
              ? (() => {
                  const next = comparisonRows.get(row.localityId);
                  return next
                    ? partyShare(next, map.comparison!.partyId) - partyShare(row, map.partyId)
                    : undefined;
                })()
              : undefined,
          )
        : colorForShare(row ? partyShare(row, map.partyId) : undefined, thresholds);
      return `<path d="${rings(feature).map(pathFor).join(" ")}" fill="${fill}" fill-rule="evenodd" stroke="#faf8f3" stroke-width="0.45"/>`;
    })
    .join("");
  const swatches = map.comparison
    ? ["#b54a4a", "#eef5fb", "#0b5ea8"]
        .map(
          (color, index) =>
            `<rect x="${rtl ? 1530 - 80 - index * 80 : 70 + index * 80}" y="530" width="80" height="12" fill="${color}"/>`,
        )
        .join("")
    : thresholds.colors
        .map(
          (color, index) =>
            `<rect x="${legendX(index)}" y="530" width="48" height="12" fill="${color}"/>`,
        )
        .join("");
  const axis = map.comparison ? t("poster.comparisonAxis") : t("poster.shareAxis");
  const legend = `${swatches}<text x="${textX}" y="565" class="small">${escapeXml(axis)}</text>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" direction="${rtl ? "rtl" : "ltr"}"><style>.title{font:500 48px Georgia,serif;fill:#102a43}.body{font:400 22px Arial,sans-serif;fill:#314e68}.small{font:400 16px Arial,sans-serif;fill:#5f7182}.label{font:700 14px Arial,sans-serif;letter-spacing:2px;fill:#41627e}</style><rect width="100%" height="100%" fill="#f4f8fc"/><text x="${textX}" y="100" class="label">${escapeXml(t("poster.brand"))}</text><text x="${textX}" y="165" class="title">${escapeXml(map.title)}</text><text x="${textX}" y="210" class="body">${escapeXml(map.context)}</text><line x1="${textX}" x2="${ruleEndX}" y1="250" y2="250" stroke="#c8d9e8"/><text x="${textX}" y="300" class="label">${escapeXml(t("poster.keyInsight"))}</text><text x="${textX}" y="345" class="body">${escapeXml(map.insight)}</text><text x="${textX}" y="505" class="label">${escapeXml(t("poster.mapLegend"))}</text>${legend}<rect x="${mapLeft - 12}" y="${mapTop - 12}" width="${mapWidth + 24}" height="${mapHeight + 24}" fill="#e9f3fb" stroke="#c8d9e8"/>${paths}<text x="${textX}" y="820" class="small">${escapeXml(map.source)}</text><text x="${textX}" y="855" class="small">${SITE_HOST}</text></svg>`;
}

function escapeXml(value: string): string {
  return value.replace(
    /[<>&'"]/g,
    (character) =>
      ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" })[character] ??
      character,
  );
}
