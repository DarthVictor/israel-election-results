import { createSignal, onCleanup, onMount, Show } from "solid-js";
import { useI18n } from "../../../i18n/context";
import { useElectionResults } from "../state/ElectionResultsContext";
import { AnalysisControls } from "./AnalysisControls";
import { createLocalityResultsModel } from "./create-locality-results-model";
import { ExportActions } from "./ExportActions";
import { LocalityAnalysisPanel } from "./LocalityAnalysisPanel";
import { LocalityResultsTable } from "./LocalityResultsTable";
import { ResultsStatus } from "./StatusPanels";

export function ResultsSidebar() {
  const { t } = useI18n();
  const { state, selectors, actions } = useElectionResults();
  const [isMobile, setIsMobile] = createSignal(false);
  const [isOpen, setIsOpen] = createSignal(false);
  const table = createLocalityResultsModel();

  onMount(() => {
    const mediaQuery = window.matchMedia("(max-width: 760px)");
    const update = () => {
      setIsMobile(mediaQuery.matches);
      if (!mediaQuery.matches) setIsOpen(false);
    };
    update();
    mediaQuery.addEventListener("change", update);
    onCleanup(() => mediaQuery.removeEventListener("change", update));
  });

  return (
    <aside
      class="analysis-panel"
      classList={{ "is-sheet-open": isOpen() }}
      aria-label={t("panel.controls")}
      data-testid="analysis-panel"
    >
      <button
        type="button"
        class="sheet-toggle"
        aria-expanded={isOpen()}
        aria-controls="analysis-sheet-content"
        onClick={() => setIsOpen((open) => !open)}
        data-testid="bottom-sheet-toggle"
      >
        <span>{state.analysis.mode === "table" ? t("panel.table") : t("panel.explore")}</span>
        <span aria-hidden="true">{isOpen() ? t("panel.hide") : t("panel.show")}</span>
      </button>
      <div
        id="analysis-sheet-content"
        class="analysis-sheet-content"
        aria-hidden={isMobile() && !isOpen()}
        inert={isMobile() && !isOpen()}
      >
        <AnalysisControls />
        <ExportActions table={table} />
        <ResultsStatus
          loading={state.requests.results.loading}
          error={state.requests.results.error}
          onRetry={actions.reloadResults}
        >
          <Show when={state.analysis.mode !== "table"}>
            <LocalityAnalysisPanel />
          </Show>
          <Show when={state.analysis.mode === "table" || selectors.comparisonReady()}>
            <LocalityResultsTable model={table} />
          </Show>
        </ResultsStatus>
      </div>
    </aside>
  );
}
