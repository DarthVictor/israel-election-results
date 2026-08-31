import type { LocalityResult } from "../../domain/contracts";
import type { I18n } from "../../i18n/create-i18n";
import { SITE_HOST } from "../../site";
import type { LocalityBoundary } from "./locality-boundaries";
import { colorForComparison, colorForShare, createThresholdScale, partyShare } from "./metrics";

type ExportMap = {
  i18n: I18n;
  boundaries: readonly LocalityBoundary[];
  localities: readonly LocalityResult[];
  partyId: string;
  title: string;
  context: string;
  insight: string;
  source: string;
  comparison?: { localities: readonly LocalityResult[]; partyId: string };
};

function rings(feature: LocalityBoundary): [number, number][][] {
  if (feature.geometry.type === "Polygon") {
    return feature.geometry.coordinates as [number, number][][];
  }
  return (feature.geometry.coordinates as [number, number][][][]).flat();
}

export function electionMapSvg(map: ExportMap): string {
  if (map.boundaries.length === 0 || map.localities.length === 0) {
    throw new Error("Map geometry and active election data are required for PNG export.");
  }
  const { t } = map.i18n;
  const rtl = map.i18n.direction() === "rtl";
  const textX = rtl ? 1530 : 70;
  const ruleEndX = rtl ? 1210 : 390;
  const legendX = (index: number) => (rtl ? 1482 - index * 50 : 70 + index * 50);
  const mapLeft = rtl ? 70 : 470;
  const positions = map.boundaries.flatMap((boundary) => rings(boundary).flat());
  const xs = positions.map((point) => point[0]);
  const ys = positions.map((point) => point[1]);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const scale = Math.min(1060 / (maxX - minX || 1), 700 / (maxY - minY || 1));
  const localities = new Map(map.localities.map((locality) => [locality.localityId, locality]));
  const comparedLocalities = new Map(
    map.comparison?.localities.map((locality) => [locality.localityId, locality]),
  );
  const thresholds = createThresholdScale(map.localities, map.partyId);
  const pathFor = (ring: [number, number][]) =>
    `${ring
      .map(
        ([x, y], index) =>
          `${index ? "L" : "M"}${(mapLeft + (x - minX) * scale).toFixed(1)},${(80 + (maxY - y) * scale).toFixed(1)}`,
      )
      .join(" ")} Z`;
  const paths = map.boundaries
    .map((boundary) => {
      const locality = localities.get(boundary.properties.localityId);
      const next = locality ? comparedLocalities.get(locality.localityId) : undefined;
      const fill = map.comparison
        ? colorForComparison(
            next && locality
              ? partyShare(next, map.comparison.partyId) - partyShare(locality, map.partyId)
              : undefined,
          )
        : colorForShare(locality ? partyShare(locality, map.partyId) : undefined, thresholds);
      return `<path d="${rings(boundary).map(pathFor).join(" ")}" fill="${fill}" fill-rule="evenodd" stroke="#faf8f3" stroke-width="0.45"/>`;
    })
    .join("");
  const colors = map.comparison ? ["#b54a4a", "#eef5fb", "#0b5ea8"] : thresholds.colors;
  const width = map.comparison ? 80 : 48;
  const swatches = colors
    .map((color, index) => {
      const x = map.comparison ? (rtl ? 1450 - index * 80 : 70 + index * 80) : legendX(index);
      return `<rect x="${x}" y="530" width="${width}" height="12" fill="${color}"/>`;
    })
    .join("");
  const axis = map.comparison ? t("poster.comparisonAxis") : t("poster.shareAxis");
  const legend = `${swatches}<text x="${textX}" y="565" class="small">${escapeXml(axis)}</text>`;
  return svgDocument(map, { textX, ruleEndX, mapLeft, rtl, paths, legend });
}

function svgDocument(
  map: ExportMap,
  layout: {
    textX: number;
    ruleEndX: number;
    mapLeft: number;
    rtl: boolean;
    paths: string;
    legend: string;
  },
) {
  const { t } = map.i18n;
  const text = (value: string) => escapeXml(value);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="900" viewBox="0 0 1600 900" direction="${layout.rtl ? "rtl" : "ltr"}"><style>.title{font:500 48px Georgia,serif;fill:#102a43}.body{font:400 22px Arial,sans-serif;fill:#314e68}.small{font:400 16px Arial,sans-serif;fill:#5f7182}.label{font:700 14px Arial,sans-serif;letter-spacing:2px;fill:#41627e}</style><rect width="100%" height="100%" fill="#f4f8fc"/><text x="${layout.textX}" y="100" class="label">${text(t("poster.brand"))}</text><text x="${layout.textX}" y="165" class="title">${text(map.title)}</text><text x="${layout.textX}" y="210" class="body">${text(map.context)}</text><line x1="${layout.textX}" x2="${layout.ruleEndX}" y1="250" y2="250" stroke="#c8d9e8"/><text x="${layout.textX}" y="300" class="label">${text(t("poster.keyInsight"))}</text><text x="${layout.textX}" y="345" class="body">${text(map.insight)}</text><text x="${layout.textX}" y="505" class="label">${text(t("poster.mapLegend"))}</text>${layout.legend}<rect x="${layout.mapLeft - 12}" y="68" width="1084" height="724" fill="#e9f3fb" stroke="#c8d9e8"/>${layout.paths}<text x="${layout.textX}" y="820" class="small">${text(map.source)}</text><text x="${layout.textX}" y="855" class="small">${SITE_HOST}</text></svg>`;
}

function escapeXml(value: string): string {
  return value.replace(
    /[<>&'"]/g,
    (character) =>
      ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" })[character] ??
      character,
  );
}
