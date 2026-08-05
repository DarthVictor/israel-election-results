type Position = [number, number];
type Arc = Position[];

type TopologyGeometry = {
  type: "Polygon" | "MultiPolygon";
  arcs: number[][] | number[][][];
  properties: Record<string, unknown>;
};

type Topology = {
  type: "Topology";
  arcs: Arc[];
  objects: { localities: { type: "GeometryCollection"; geometries: TopologyGeometry[] } };
};

export type ExplorerFeature = {
  type: "Feature";
  properties: { localityId: number; nameHe: string; nameEn: string | null };
  geometry: { type: "Polygon" | "MultiPolygon"; coordinates: Position[][] | Position[][][] };
};

const arcFor = (arcs: Arc[], index: number): Arc => {
  const arc = arcs[index < 0 ? ~index : index] ?? [];
  const coordinates = index < 0 ? [...arc].reverse() : arc;
  return coordinates.map((position) => [position[0], position[1]]);
};

const ringFor = (arcs: Arc[], indices: number[]): Position[] =>
  indices.flatMap((index, arcIndex) => {
    const arc = arcFor(arcs, index);
    return arcIndex === 0 ? arc : arc.slice(1);
  });

export function topologyToFeatures(rawTopology: unknown): ExplorerFeature[] {
  const topology = rawTopology as Topology;
  if (
    topology?.type !== "Topology" ||
    !Array.isArray(topology.arcs) ||
    !topology.objects?.localities
  ) {
    throw new Error("The locality boundary file is not a supported TopoJSON topology.");
  }

  const features: ExplorerFeature[] = [];
  for (const geometry of topology.objects.localities.geometries) {
    const localityId = Number(geometry.properties?.localityId);
    if (!Number.isSafeInteger(localityId)) continue;
    const properties = {
      localityId,
      nameHe: String(geometry.properties.nameHe ?? ""),
      nameEn: typeof geometry.properties.nameEn === "string" ? geometry.properties.nameEn : null,
    };
    if (geometry.type === "Polygon") {
      features.push({
        type: "Feature",
        properties,
        geometry: {
          type: "Polygon",
          coordinates: (geometry.arcs as number[][]).map((ring) => ringFor(topology.arcs, ring)),
        },
      });
      continue;
    }
    if (geometry.type === "MultiPolygon") {
      features.push({
        type: "Feature",
        properties,
        geometry: {
          type: "MultiPolygon",
          coordinates: (geometry.arcs as number[][][]).map((polygon) =>
            polygon.map((ring) => ringFor(topology.arcs, ring)),
          ),
        },
      });
    }
  }
  return features;
}
