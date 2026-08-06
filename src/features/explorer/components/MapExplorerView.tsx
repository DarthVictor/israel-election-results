import { Show } from "solid-js";
import { LeafletMap } from "../LeafletMap";
import type { createMapView } from "../views/create-map-view";
import { MapLegend } from "./MapLegend";
import { ErrorPanel } from "./StatusPanels";

export function MapExplorerView(props: { map: ReturnType<typeof createMapView> }) {
  return (
    <section class="map-region" aria-label="Election result map" data-testid="map-region">
      <Show when={props.map.geometryError()}>
        <div class="map-error">
          <ErrorPanel compact error={props.map.geometryError()} onRetry={props.map.onRetryLoad} />
        </div>
      </Show>
      <Show
        when={props.map.ready()}
        fallback={
          <div class="map-placeholder" data-testid="map-unavailable">
            {props.map.unavailableMessage()}
          </div>
        }
      >
        <LeafletMap
          features={props.map.geometry()}
          rows={props.map.rows()}
          partyId={props.map.state().party}
          selectedLocalityId={props.map.state().locality}
          onSelect={props.map.onSelect}
          {...(props.map.comparisonReady()
            ? {
                comparison: {
                  rows: props.map.comparisonRows(),
                  partyId: props.map.compareParty()!.id,
                },
              }
            : {})}
        />
      </Show>
      <Show when={props.map.state().mode !== "compare" || props.map.comparisonReady()}>
        <MapLegend compareMode={props.map.comparisonReady()} />
      </Show>
    </section>
  );
}
