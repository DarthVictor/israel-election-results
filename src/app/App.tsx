import { Show, createSignal, onCleanup, onMount } from "solid-js";
import { AnalysisControls } from "../features/explorer/components/AnalysisControls";
import { ExplorePanel } from "../features/explorer/components/ExplorePanel";
import { ExportActions } from "../features/explorer/components/ExportActions";
import { LocalityTable } from "../features/explorer/components/LocalityTable";
import { MapExplorerView } from "../features/explorer/components/MapExplorerView";
import {
  ErrorPanel,
  LoadingScreen,
  ResultsStatus,
} from "../features/explorer/components/StatusPanels";
import { createExplorerController } from "../features/explorer/controller/create-explorer-controller";
import { loadElection, loadGeometry, loadManifest } from "../features/explorer/data";
import { exportCsv, exportPng } from "../features/explorer/export-actions";
import { downloadBlob, downloadText, pngFromSvg } from "../features/explorer/exports";
import { topologyToFeatures } from "../features/explorer/topology";

export function App() {
  const [isMobile, setIsMobile] = createSignal(false);
  const [isSheetOpen, setIsSheetOpen] = createSignal(false);
  const explorer = createExplorerController({
    data: { loadManifest, loadElection, loadGeometry, topologyToFeatures },
    history: {
      readSearch: () => window.location.search,
      pathname: () => window.location.pathname,
      href: () => window.location.href,
      push: (nextState, url) => window.history.pushState(nextState, "", url),
      replace: (nextState, url) => window.history.replaceState(nextState, "", url),
      subscribe: (listener) => {
        window.addEventListener("popstate", listener);
        return () => window.removeEventListener("popstate", listener);
      },
    },
  });

  onMount(() => {
    void explorer.load();
    const mediaQuery = window.matchMedia("(max-width: 760px)");
    const updateMobile = () => {
      setIsMobile(mediaQuery.matches);
      if (!mediaQuery.matches) setIsSheetOpen(false);
    };
    updateMobile();
    mediaQuery.addEventListener("change", updateMobile);
    onCleanup(() => mediaQuery.removeEventListener("change", updateMobile));
  });

  const exportSnapshot = () => ({
    rows: explorer.filteredTable(),
    state: explorer.state(),
    election: explorer.election(),
    party: explorer.party(),
    compareElection: explorer.compareElection(),
    compareParty: explorer.compareParty(),
    comparisonRows: explorer.comparisonRows(),
    comparisonReady: explorer.comparisonReady(),
    geometry: explorer.geometry(),
    localityRows: explorer.rows(),
  });
  const browserExports = { downloadText, pngFromSvg, downloadBlob };
  const copyLink = async () => {
    if (explorer.manifest()) explorer.writeState(explorer.state(), true);
    try {
      await navigator.clipboard.writeText(explorer.currentUrl());
      explorer.setStatus("Analysis link copied to your clipboard.");
    } catch {
      explorer.setStatus("Copy this analysis link from your browser address bar.");
    }
  };
  const downloadCsv = () => {
    explorer.setStatus(
      exportCsv(exportSnapshot(), browserExports) ? "CSV download started." : "CSV export failed.",
    );
  };
  const downloadPng = async () => {
    try {
      await exportPng(exportSnapshot(), browserExports);
      explorer.setStatus("PNG download started.");
    } catch (error) {
      explorer.setStatus(
        `PNG export failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  };
  const selectExploreLocality = (localityId: number) => {
    explorer.chooseLocality(localityId);
    explorer.setSearch("");
  };

  return (
    <main class="app-shell">
      <header class="site-header">
        <div>
          <p class="eyebrow">Locality-level Knesset results · 2019–2022</p>
          <h1>Israel Election Results Explorer</h1>
        </div>
        <div class="source-links" aria-label="Official data sources">
          <a
            href={explorer.election()?.sourceUrl ?? "https://votes25.bechirot.gov.il/"}
            target="_blank"
            rel="noreferrer"
          >
            Official results
          </a>
          <a
            href={
              explorer.election()?.sourceCsvUrl ?? "https://media25.bechirot.gov.il/files/expc.csv"
            }
            target="_blank"
            rel="noreferrer"
          >
            Download locality CSV
          </a>
        </div>
      </header>
      <Show
        when={!explorer.loadingManifest()}
        fallback={<LoadingScreen label="Preparing election data" />}
      >
        <Show
          when={!explorer.manifestError()}
          fallback={
            <ErrorPanel error={explorer.manifestError()} onRetry={() => void explorer.load()} />
          }
        >
          <section class="explorer-layout">
            <aside
              class="analysis-panel"
              classList={{ "is-sheet-open": isSheetOpen() }}
              aria-label="Election controls and locality analysis"
              data-testid="analysis-panel"
            >
              <button
                type="button"
                class="sheet-toggle"
                aria-expanded={isSheetOpen()}
                aria-controls="analysis-sheet-content"
                onClick={() => setIsSheetOpen((open) => !open)}
                data-testid="bottom-sheet-toggle"
              >
                <span>
                  {explorer.state().mode === "table" ? "Locality table" : "Explore results"}
                </span>
                <span aria-hidden="true">{isSheetOpen() ? "Hide" : "Show"}</span>
              </button>
              <div
                id="analysis-sheet-content"
                class="analysis-sheet-content"
                aria-hidden={isMobile() && !isSheetOpen()}
                inert={isMobile() && !isSheetOpen()}
              >
                <AnalysisControls
                  state={explorer.state()}
                  manifest={explorer.manifest()}
                  election={explorer.election()}
                  compareElection={explorer.compareElection()}
                  compareParty={explorer.compareParty()}
                  loadingComparison={explorer.loadingComparison()}
                  comparisonError={explorer.comparisonError()}
                  onRetryComparison={explorer.retry}
                  onMode={explorer.chooseMode}
                  onElection={explorer.chooseElection}
                  onParty={explorer.chooseParty}
                  onComparisonElection={explorer.chooseComparisonElection}
                  onComparisonParty={explorer.chooseComparisonParty}
                />
                <ExportActions
                  onCopy={() => void copyLink()}
                  onCsv={downloadCsv}
                  onPng={() => void downloadPng()}
                />
                <p class="sr-status" aria-live="polite">
                  {explorer.status()}
                </p>
                <ResultsStatus
                  loading={explorer.loadingResults()}
                  error={explorer.resultsError()}
                  onRetry={explorer.retry}
                >
                  <Show when={explorer.state().mode !== "table"}>
                    <ExplorePanel
                      party={explorer.party()}
                      parties={explorer.election()?.parties ?? []}
                      rows={explorer.rows()}
                      partyId={explorer.state().party}
                      nationalShare={explorer.nationalShare()}
                      search={explorer.search()}
                      setSearch={explorer.setSearch}
                      matches={explorer.queryMatches()}
                      onSelect={selectExploreLocality}
                      selected={explorer.selected()}
                      selectedComparison={explorer.selectedComparison()}
                      compareParty={explorer.compareParty()}
                      compareMode={explorer.state().mode === "compare"}
                    />
                  </Show>
                  <Show when={explorer.state().mode === "table" || explorer.comparisonReady()}>
                    <LocalityTable
                      rows={explorer.filteredTable()}
                      state={explorer.state()}
                      tableSearch={explorer.tableSearch()}
                      setTableSearch={explorer.setTableSearch}
                      sort={explorer.tableSort()}
                      setSort={explorer.setTableSort}
                      onState={explorer.writeState}
                      onSelect={explorer.chooseLocality}
                      compareMode={explorer.comparisonReady()}
                    />
                  </Show>
                </ResultsStatus>
              </div>
            </aside>
            <MapExplorerView
              state={explorer.state()}
              geometry={explorer.geometry()}
              geometryError={explorer.geometryError()}
              currentResults={explorer.currentResults()}
              rows={explorer.rows()}
              comparisonRows={explorer.comparisonRows()}
              comparisonReady={explorer.comparisonReady()}
              comparisonError={explorer.comparisonError()}
              loadingComparison={explorer.loadingComparison()}
              compareParty={explorer.compareParty()}
              resultsError={explorer.resultsError()}
              onSelect={explorer.chooseLocality}
              onRetryLoad={() => void explorer.load()}
            />
          </section>
        </Show>
      </Show>
      <footer class="site-footer" role="contentinfo">
        <span>
          Final results:{" "}
          <a href={explorer.election()?.sourceUrl ?? "https://votes25.bechirot.gov.il/"}>
            Central Elections Committee
          </a>{" "}
          ·{" "}
          <a
            href={
              explorer.election()?.sourceCsvUrl ?? "https://media25.bechirot.gov.il/files/expc.csv"
            }
          >
            Locality CSV
          </a>
        </span>
        <span>
          Map: <a href="https://leafletjs.com/">Leaflet</a> and{" "}
          <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>
        </span>
        <a href="https://github.com/DarthVictor/israel-polls">Project source &amp; methodology</a>
      </footer>
    </main>
  );
}
