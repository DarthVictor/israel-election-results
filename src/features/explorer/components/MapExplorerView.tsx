import { Show } from "solid-js";
import type {
  AnalysisState,
  ElectionResultsFile,
  LocalityResult,
  PartyList,
} from "../../../domain/contracts";
import { LeafletMap } from "../LeafletMap";
import { MapLegend } from "./MapLegend";
import { ErrorPanel } from "./StatusPanels";
import type { ExplorerFeature } from "../topology";

export function MapExplorerView(props: {
  state: AnalysisState;
  geometry: ExplorerFeature[];
  geometryError: unknown;
  currentResults?: ElectionResultsFile;
  rows: LocalityResult[];
  comparisonRows: LocalityResult[];
  comparisonReady: boolean;
  comparisonError: unknown;
  loadingComparison: boolean;
  compareParty?: PartyList;
  resultsError: unknown;
  onSelect(localityId: number): void;
  onRetryLoad(): void;
}) {
  return (
    <section class="map-region" aria-label="Election result map" data-testid="map-region">
      <Show when={props.geometryError}>
        <div class="map-error">
          <ErrorPanel compact error={props.geometryError} onRetry={props.onRetryLoad} />
        </div>
      </Show>
      <Show
        when={
          !props.geometryError &&
          props.geometry.length > 0 &&
          props.currentResults &&
          (props.state.mode !== "compare" || props.comparisonReady)
        }
        fallback={
          <div class="map-placeholder" data-testid="map-unavailable">
            {props.state.mode === "compare" && props.comparisonError
              ? "Comparison results are unavailable. Try again to restore the comparison map."
              : props.state.mode === "compare" && props.loadingComparison
                ? "Loading comparison results…"
                : props.resultsError
                  ? "Selected election results are unavailable. Try again to restore the map."
                  : "Loading map boundaries…"}
          </div>
        }
      >
        <LeafletMap
          features={props.geometry}
          rows={props.rows}
          partyId={props.state.party}
          selectedLocalityId={props.state.locality}
          onSelect={props.onSelect}
          {...(props.comparisonReady
            ? { comparison: { rows: props.comparisonRows, partyId: props.compareParty!.id } }
            : {})}
        />
      </Show>
      <Show when={props.state.mode !== "compare" || props.comparisonReady}>
        <MapLegend compareMode={props.comparisonReady} />
      </Show>
    </section>
  );
}
