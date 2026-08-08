import { readFile } from "node:fs/promises";
import { topology } from "topojson-server";
import { presimplify, simplify } from "topojson-simplify";

/** Absolute ceiling for the generated TopoJSON; catches simplification regressions. */
const BYTE_BUDGET = 1_500_000;

type SourceFeature = { properties?: Record<string, unknown>; geometry?: unknown };

const check = (ok: unknown, message: string) => {
  if (!ok) throw new Error(message);
};

/**
 * The boundary source is CBS statistical-areas GeoJSON carrying the original
 * property names. Only the three fields the map needs are kept, and features are
 * sorted by locality ID so the output is byte-identical on every run.
 */
export const readLocalities = async (path: string) => {
  const source = JSON.parse(await readFile(path, "utf8")) as { features?: SourceFeature[] };
  check(Array.isArray(source.features), "Boundary source has no FeatureCollection.features array");

  const features = source
    .features!.map(({ properties = {}, geometry = null }) => {
      const localityId = Number(properties.SEMEL_YISHUV);
      const nameEn = properties.SHEM_YISHUV_ENGLISH;
      if (!Number.isSafeInteger(localityId)) return null;
      return {
        type: "Feature" as const,
        properties: {
          localityId,
          nameHe: String(properties.SHEM_YISHUV ?? ""),
          nameEn: typeof nameEn === "string" && nameEn !== "" ? nameEn : null,
        },
        geometry,
      };
    })
    .filter((feature) => feature !== null)
    .sort((left, right) => left.properties.localityId - right.properties.localityId);

  const duplicate = features.find(
    (feature, index) =>
      index > 0 && features[index - 1].properties.localityId === feature.properties.localityId,
  );
  check(
    !duplicate,
    `Boundary source has duplicate locality ID ${duplicate?.properties.localityId}`,
  );

  return { type: "FeatureCollection" as const, features };
};

/** Quantises and simplifies the boundaries into the compact TopoJSON the client loads. */
export const toTopology = (localities: Awaited<ReturnType<typeof readLocalities>>) => {
  const quantized = topology({ localities }, 100_000);
  // A low Visvalingam threshold drops repeated boundary detail but keeps locality
  // shape at map inspection zoom levels.
  const simplified = simplify(presimplify(quantized), 0.000_001);
  const bytes = Buffer.byteLength(JSON.stringify(simplified));
  check(bytes <= BYTE_BUDGET, `Geometry exceeds its budget (${bytes} > ${BYTE_BUDGET} bytes)`);
  return simplified;
};

/** English locality names, used to label election rows that have a boundary. */
export const englishNamesFrom = (localities: Awaited<ReturnType<typeof readLocalities>>) =>
  new Map(localities.features.map(({ properties }) => [properties.localityId, properties.nameEn]));
