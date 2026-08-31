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

export function createTileLayer(theme: "light" | "dark") {
  const style = theme === "dark" ? "stamen_toner_dark" : "stamen_toner_lite";
  return L.tileLayer(`https://tiles.stadiamaps.com/tiles/${style}/{z}/{x}/{y}{r}.png`, {
    maxZoom: 20,
    attribution:
      '&copy; <a href="https://www.stadiamaps.com/">Stadia Maps</a> ' +
      '&copy; <a href="https://www.stamen.com/">Stamen Design</a> ' +
      '&copy; <a href="https://openmaptiles.org/">OpenMapTiles</a> ' +
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  });
}
