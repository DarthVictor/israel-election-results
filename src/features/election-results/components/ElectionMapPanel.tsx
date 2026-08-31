import { Show } from "solid-js";
import type { AppTheme } from "../../../app/theme";
import { useI18n } from "../../../i18n/context";
import { ElectionMap } from "../ElectionMap";
import { useElectionResults } from "../state/ElectionResultsContext";
import { MapLegend } from "./MapLegend";
import { ErrorPanel } from "./StatusPanels";

export function ElectionMapPanel(props: { theme: AppTheme }) {
  const { t } = useI18n();
  const { state, selectors, actions } = useElectionResults();
  return (
    <section class="map-region" aria-label={t("map.region")} data-testid="map-region">
      <Show when={state.requests.boundaries.error}>
        <div class="map-error">
          <ErrorPanel
            compact
            error={state.requests.boundaries.error}
            onRetry={actions.reloadBoundaries}
          />
        </div>
      </Show>
      <Show
        when={selectors.mapReady()}
        fallback={
          <div class="map-placeholder" data-testid="map-unavailable">
            {selectors.mapUnavailableMessage()}
          </div>
        }
      >
        <ElectionMap theme={props.theme} />
      </Show>
      <Show when={state.analysis.mode !== "compare" || selectors.comparisonReady()}>
        <MapLegend compareMode={selectors.comparisonReady()} />
      </Show>
    </section>
  );
}
