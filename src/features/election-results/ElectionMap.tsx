import L from "leaflet";
import { createEffect, createSignal, onCleanup, onMount } from "solid-js";
import type { AppTheme } from "../../app/theme";
import { useI18n } from "../../i18n/context";
import { createBasemapLayer, createLocalityLayer } from "./map/leaflet-layers";
import { useElectionResults } from "./state/ElectionResultsContext";

const selectedStyle: L.PathOptions = { color: "#0038b8", weight: 2.5, fillOpacity: 0.92 };

export function ElectionMap(props: { theme: AppTheme }) {
  const { t } = useI18n();
  const { state, selectors, actions } = useElectionResults();
  let element: HTMLDivElement | undefined;
  let map: L.Map | undefined;
  let baseLayer: L.Layer | undefined;
  let localityLayer: L.GeoJSON | undefined;
  let layers = new Map<number, L.Path>();
  let styles = new Map<number, L.PathOptions>();
  let appliedTheme: AppTheme = "light";
  let previousSelection: number | undefined;
  let appliedRevision = 0;
  const [revision, setRevision] = createSignal(0);

  onMount(() => {
    if (!element) return;
    map = L.map(element, { zoomControl: false, attributionControl: true, minZoom: 7, maxZoom: 13 });
    L.control.zoom({ position: "bottomright" }).addTo(map);
    appliedTheme = props.theme;
    baseLayer = createBasemapLayer(appliedTheme).addTo(map);
    map.setView([32, 35], 10);
    requestAnimationFrame(() => map?.invalidateSize());
  });

  createEffect(() => {
    const theme = props.theme;
    if (!map || !baseLayer || theme === appliedTheme) return;
    map.removeLayer(baseLayer);
    baseLayer = createBasemapLayer(theme).addTo(map);
    appliedTheme = theme;
  });

  createEffect(() => {
    if (!map || state.boundaries.length === 0) return;
    const comparisonParty = selectors.comparisonParty();
    const comparison =
      selectors.comparisonReady() && comparisonParty
        ? {
            localities: selectors.comparisonLocalities(),
            partyId: comparisonParty.id,
          }
        : undefined;
    localityLayer?.remove();
    const next = createLocalityLayer({
      boundaries: state.boundaries,
      localities: selectors.localities(),
      partyId: state.analysis.party,
      comparison,
      onSelect: actions.chooseLocality,
    });
    localityLayer = next.layer.addTo(map);
    layers = next.layers;
    styles = next.styles;
    setRevision((value) => value + 1);
  });

  createEffect(() => {
    const nextRevision = revision();
    const selected = state.analysis.locality;
    if (!map || nextRevision === 0) return;
    const rebuilt = nextRevision !== appliedRevision;
    if (!rebuilt && previousSelection === selected) return;
    if (!rebuilt && previousSelection !== undefined) {
      const previousLayer = layers.get(previousSelection);
      const previousStyle = styles.get(previousSelection);
      if (previousLayer && previousStyle) previousLayer.setStyle(previousStyle);
    }
    if (selected !== undefined) focusLocality(map, layers.get(selected));
    previousSelection = selected;
    appliedRevision = nextRevision;
  });

  onCleanup(() => map?.remove());
  return (
    <div
      class="leaflet-map"
      ref={(node) => {
        element = node;
      }}
      title={t("map.interactive")}
      data-testid="leaflet-map"
    />
  );
}

function focusLocality(map: L.Map, layer?: L.Path) {
  layer?.setStyle(selectedStyle);
  const bounds = (
    layer as (L.Path & { getBounds?: () => L.LatLngBounds }) | undefined
  )?.getBounds?.();
  if (bounds?.isValid()) map.fitBounds(bounds.pad(0.45), { maxZoom: 11, animate: true });
}
