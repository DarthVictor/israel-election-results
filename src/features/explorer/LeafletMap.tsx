import { createEffect, createSignal, onCleanup, onMount } from "solid-js";
import L from "leaflet";
import type { LocalityResult } from "../../domain/contracts";
import {
  colorForComparison,
  colorForShare,
  comparisonDelta,
  createThresholdScale,
  partyShare,
} from "./analysis";
import type { ExplorerFeature } from "./topology";

type LeafletMapProps = {
  features: ExplorerFeature[];
  rows: LocalityResult[];
  partyId: string;
  comparison?: { rows: LocalityResult[]; partyId: string };
  selectedLocalityId?: number;
  onSelect: (localityId: number) => void;
};

const selectedStyle: L.PathOptions = { color: "#0038b8", weight: 2.5, fillOpacity: 0.92 };

export function LeafletMap(props: LeafletMapProps) {
  let element: HTMLDivElement | undefined;
  let map: L.Map | undefined;
  let localitiesLayer: L.GeoJSON | undefined;
  let previousSelectedId: number | undefined;
  let appliedLayerRevision = 0;
  const layersById = new Map<number, L.Path>();
  const baseStylesById = new Map<number, L.PathOptions>();
  const [layerRevision, setLayerRevision] = createSignal(0);

  const applyBaseStyle = (localityId: number) => {
    const layer = layersById.get(localityId);
    const style = baseStylesById.get(localityId);
    if (layer && style) layer.setStyle(style);
  };

  onMount(() => {
    if (!element) return;
    map = L.map(element, { zoomControl: false, attributionControl: true, minZoom: 7, maxZoom: 13 });
    L.control.zoom({ position: "bottomright" }).addTo(map);
    L.tileLayer("https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png", {
      subdomains: "abcd",
      maxZoom: 19,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    }).addTo(map);
    map.setView([31.25, 34.85], 8);
    requestAnimationFrame(() => map?.invalidateSize());
  });

  // Geometry, result rows, and party determine the choropleth itself. Selection
  // is deliberately handled in the following effect so a map click only restyles
  // two paths instead of recreating every Leaflet layer.
  createEffect(() => {
    if (!map || props.features.length === 0) return;
    const partyId = props.partyId;
    const byId = new Map(props.rows.map((row) => [row.localityId, row]));
    const comparisonById = new Map(props.comparison?.rows.map((row) => [row.localityId, row]));
    const scale = partyId ? createThresholdScale(props.rows, partyId) : undefined;
    const onSelect = props.onSelect;

    localitiesLayer?.remove();
    layersById.clear();
    baseStylesById.clear();
    localitiesLayer = L.geoJSON(
      {
        type: "FeatureCollection",
        features: props.features,
      } as unknown as GeoJSON.FeatureCollection,
      {
        style(feature) {
          const localityId = Number(feature?.properties?.localityId);
          const row = byId.get(localityId);
          const style: L.PathOptions = {
            color: "#c6d9ea",
            weight: 0.55,
            fillColor: props.comparison
              ? colorForComparison(
                  comparisonDelta(
                    row,
                    partyId,
                    comparisonById.get(localityId),
                    props.comparison.partyId,
                  ),
                )
              : partyId && scale
                ? colorForShare(row ? partyShare(row, partyId) : undefined, scale)
                : "#d9e7f3",
            fillOpacity: 0.82,
          };
          baseStylesById.set(localityId, style);
          return style;
        },
        onEachFeature(feature, layer) {
          const localityId = Number(feature.properties.localityId);
          const path = layer as L.Path;
          layersById.set(localityId, path);
          layer.on("click", () => onSelect(localityId));
          layer.on("add", () => {
            const pathElement = path.getElement();
            pathElement?.setAttribute("data-testid", `map-locality-${localityId}`);
            pathElement?.setAttribute("data-locality-id", String(localityId));
          });
        },
      },
    ).addTo(map);
    setLayerRevision((revision) => revision + 1);
  });

  createEffect(() => {
    const revision = layerRevision();
    const selectedLocalityId = props.selectedLocalityId;
    if (!map || revision === 0) return;

    const layersWereRebuilt = appliedLayerRevision !== revision;
    if (!layersWereRebuilt && previousSelectedId === selectedLocalityId) return;

    if (!layersWereRebuilt && previousSelectedId !== undefined) {
      applyBaseStyle(previousSelectedId);
    }

    if (selectedLocalityId !== undefined) {
      const selectedLayer = layersById.get(selectedLocalityId);
      selectedLayer?.setStyle(selectedStyle);
      const bounds = (
        selectedLayer as (L.Path & { getBounds?: () => L.LatLngBounds }) | undefined
      )?.getBounds?.();
      if (bounds?.isValid()) map.fitBounds(bounds.pad(0.45), { maxZoom: 11, animate: true });
    }

    previousSelectedId = selectedLocalityId;
    appliedLayerRevision = revision;
  });

  onCleanup(() => map?.remove());

  return (
    <div
      class="leaflet-map"
      ref={(node) => {
        element = node;
      }}
      aria-label="Interactive locality result map"
      data-testid="leaflet-map"
    />
  );
}
