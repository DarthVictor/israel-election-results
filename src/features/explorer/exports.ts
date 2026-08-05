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
import type { ExplorerFeature } from "./topology";

const csvCell = (value: string | number | null | undefined) =>
  `"${String(value ?? "").replaceAll('"', '""')}"`;

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

export function downloadText(filename: string, contents: string, type = "text/csv;charset=utf-8") {
  downloadBlob(filename, new Blob([contents], { type }));
}

export function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

type ExportMap = {
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
  const width = 1600;
  const height = 900;
  const mapLeft = 470;
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
  const legend = map.comparison
    ? `<rect x="70" y="530" width="80" height="12" fill="#b54a4a"/><rect x="150" y="530" width="80" height="12" fill="#eef5fb"/><rect x="230" y="530" width="80" height="12" fill="#0b5ea8"/><text x="70" y="565" class="small">A stronger ← percentage-point change → B stronger</text>`
    : thresholds.colors
        .map(
          (color, index) =>
            `<rect x="${70 + index * 50}" y="530" width="48" height="12" fill="${color}"/>`,
        )
        .join("") +
      `<text x="70" y="565" class="small">Lower share ← locality vote share → higher share</text>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><style>.title{font:500 48px Georgia,serif;fill:#102a43}.body{font:400 22px Arial,sans-serif;fill:#314e68}.small{font:400 16px Arial,sans-serif;fill:#5f7182}.label{font:700 14px Arial,sans-serif;letter-spacing:2px;fill:#41627e}</style><rect width="100%" height="100%" fill="#f4f8fc"/><text x="70" y="100" class="label">ISRAEL ELECTION RESULTS EXPLORER</text><text x="70" y="165" class="title">${escapeXml(map.title)}</text><text x="70" y="210" class="body">${escapeXml(map.context)}</text><line x1="70" x2="390" y1="250" y2="250" stroke="#c8d9e8"/><text x="70" y="300" class="label">KEY INSIGHT</text><text x="70" y="345" class="body">${escapeXml(map.insight)}</text><text x="70" y="505" class="label">MAP LEGEND</text>${legend}<rect x="${mapLeft - 12}" y="${mapTop - 12}" width="${mapWidth + 24}" height="${mapHeight + 24}" fill="#e9f3fb" stroke="#c8d9e8"/>${paths}<text x="70" y="820" class="small">${escapeXml(map.source)}</text><text x="70" y="855" class="small">israel-election-results.vercel.app</text></svg>`;
}

export async function pngFromSvg(svg: string): Promise<Blob> {
  const image = new Image();
  const source = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml;charset=utf-8" }));
  try {
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error("Could not render the local vector export."));
      image.src = source;
    });
    const canvas = document.createElement("canvas");
    canvas.width = 1600;
    canvas.height = 900;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Your browser cannot create image exports.");
    context.drawImage(image, 0, 0);
    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error("Could not create the PNG export."))),
        "image/png",
      ),
    );
  } finally {
    URL.revokeObjectURL(source);
  }
}

function escapeXml(value: string): string {
  return value.replace(
    /[<>&'"]/g,
    (character) =>
      ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" })[character] ??
      character,
  );
}
