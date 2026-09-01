import { maplibreGL } from "@maplibre/maplibre-gl-leaflet";
import L from "leaflet";
import type { LocalityResult } from "../../../domain/contracts";
import type { LocalityBoundary } from "../locality-boundaries";
import {
  colorForComparison,
  colorForShare,
  comparisonDelta,
  createThresholdScale,
  partyShare,
} from "../metrics";

export type LocalityLayerInput = {
  boundaries: LocalityBoundary[];
  localities: LocalityResult[];
  partyId: string;
  comparison?: { localities: LocalityResult[]; partyId: string };
  onSelect(localityId: number): void;
};

export function createLocalityLayer(input: LocalityLayerInput) {
  const layers = new Map<number, L.Path>();
  const styles = new Map<number, L.PathOptions>();
  const byId = new Map(input.localities.map((item) => [item.localityId, item]));
  const comparisonById = new Map(
    input.comparison?.localities.map((item) => [item.localityId, item]),
  );
  const scale = input.partyId ? createThresholdScale(input.localities, input.partyId) : undefined;
  const layer = L.geoJSON(
    {
      type: "FeatureCollection",
      features: input.boundaries,
    } as unknown as GeoJSON.FeatureCollection,
    {
      style(feature) {
        const localityId = Number(feature?.properties?.localityId);
        const locality = byId.get(localityId);
        const style: L.PathOptions = {
          color: "#c6d9ea",
          weight: 0.55,
          fillColor: fillColor(input, locality, comparisonById, scale),
          fillOpacity: 0.82,
        };
        styles.set(localityId, style);
        return style;
      },
      onEachFeature(feature, featureLayer) {
        const localityId = Number(feature.properties.localityId);
        const path = featureLayer as L.Path;
        layers.set(localityId, path);
        featureLayer.on("click", () => input.onSelect(localityId));
        featureLayer.on("add", () => {
          path.getElement()?.setAttribute("data-testid", `map-locality-${localityId}`);
          path.getElement()?.setAttribute("data-locality-id", String(localityId));
        });
      },
    },
  );
  return { layer, layers, styles };
}

function fillColor(
  input: LocalityLayerInput,
  locality: LocalityResult | undefined,
  comparisonById: Map<number, LocalityResult>,
  scale: ReturnType<typeof createThresholdScale> | undefined,
) {
  if (input.comparison) {
    return colorForComparison(
      comparisonDelta(
        locality,
        input.partyId,
        locality && comparisonById.get(locality.localityId),
        input.comparison.partyId,
      ),
    );
  }
  if (!input.partyId || !scale) return "#d9e7f3";
  return colorForShare(locality ? partyShare(locality, input.partyId) : undefined, scale);
}

const BASEMAP_STYLES = {
  light: "https://tiles.openfreemap.org/styles/positron",
  dark: "https://tiles.openfreemap.org/styles/dark",
} as const;
const BASEMAP_ATTRIBUTION =
  '<a href="https://openfreemap.org/">OpenFreeMap</a> &copy; ' +
  '<a href="https://openmaptiles.org/">OpenMapTiles</a> Data from ' +
  '<a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

export function createBasemapLayer(theme: "light" | "dark") {
  return maplibreGL({
    style: BASEMAP_STYLES[theme],
    attributionControl: { customAttribution: BASEMAP_ATTRIBUTION },
  });
}
