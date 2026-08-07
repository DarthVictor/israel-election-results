import { Show, createSignal, onCleanup, onMount } from "solid-js";
import { AnalysisControls } from "./components/AnalysisControls";
import { ExplorePanel } from "./components/ExplorePanel";
import { ExportActions } from "./components/ExportActions";
import { LocalityTable } from "./components/LocalityTable";
import { MapExplorerView } from "./components/MapExplorerView";
import { ErrorPanel, LoadingScreen, ResultsStatus } from "./components/StatusPanels";
import type { ExplorerFeature } from "./feature/explorer-feature.types";

export type ExplorerPageEnvironment = {
  subscribeMobile(listener: (isMobile: boolean) => void): () => void;
};

/** Explorer layout. Browser bindings and feature construction stay outside this component. */
export function ExplorerPage(props: {
  explorer: ExplorerFeature;
  environment: ExplorerPageEnvironment;
}) {
  const [isMobile, setIsMobile] = createSignal(false);
  const [isSheetOpen, setIsSheetOpen] = createSignal(false);
  const selectExploreLocality = (localityId: number) => {
    props.explorer.selection.chooseLocality(localityId);
    props.explorer.explore.setSearch("");
  };

  onMount(() => {
    void props.explorer.loading.reloadManifest();
    onCleanup(
      props.environment.subscribeMobile((mobile) => {
        setIsMobile(mobile);
        if (!mobile) setIsSheetOpen(false);
      }),
    );
  });

  return (
    <div class="app-shell">
      <a class="skip-link" href="#explorer-content">
        Skip to election explorer
      </a>
      <header class="site-header">
        <div>
          <p class="eyebrow">Locality-level Knesset results · 2019–2022</p>
          <h1>Israel Election Results Explorer</h1>
        </div>
        <div class="source-links" aria-label="Official data sources">
          <a
            href={
              props.explorer.selection.election()?.sourceUrl ?? "https://votes25.bechirot.gov.il/"
            }
            target="_blank"
            rel="noreferrer"
          >
            Official results
          </a>
          <a
            href={
              props.explorer.selection.election()?.sourceCsvUrl ??
              "https://media25.bechirot.gov.il/files/expc.csv"
            }
            target="_blank"
            rel="noreferrer"
          >
            Download locality CSV
          </a>
        </div>
      </header>
      <main id="explorer-content" tabindex={-1}>
        <Show
          when={!props.explorer.loading.loadingManifest()}
          fallback={<LoadingScreen label="Preparing election data" />}
        >
          <Show
            when={!props.explorer.loading.manifestError()}
            fallback={
              <ErrorPanel
                error={props.explorer.loading.manifestError()}
                onRetry={() => void props.explorer.loading.reloadManifest()}
              />
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
                    {props.explorer.selection.state().mode === "table"
                      ? "Locality table"
                      : "Explore results"}
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
                    state={props.explorer.selection.state()}
                    manifest={props.explorer.loading.manifest()}
                    election={props.explorer.selection.election()}
                    compareElection={props.explorer.selection.compareElection()}
                    compareParty={props.explorer.selection.compareParty()}
                    loadingComparison={props.explorer.loading.loadingComparison()}
                    comparisonError={props.explorer.loading.comparisonError()}
                    onRetryComparison={props.explorer.loading.reloadComparisonResults}
                    onMode={props.explorer.selection.chooseMode}
                    onElection={props.explorer.selection.chooseElection}
                    onParty={props.explorer.selection.chooseParty}
                    onComparisonElection={props.explorer.selection.chooseComparisonElection}
                    onComparisonParty={props.explorer.selection.chooseComparisonParty}
                  />
                  <ExportActions
                    onCopy={() => void props.explorer.actions.copyLink()}
                    onCsv={props.explorer.actions.downloadCsv}
                    onPng={() => void props.explorer.actions.downloadPng()}
                  />
                  <p class="sr-status" aria-live="polite">
                    {props.explorer.actions.status()}
                  </p>
                  <ResultsStatus
                    loading={props.explorer.loading.loadingResults()}
                    error={props.explorer.loading.resultsError()}
                    onRetry={props.explorer.loading.reloadCurrentResults}
                  >
                    <Show when={props.explorer.selection.state().mode !== "table"}>
                      <ExplorePanel
                        party={props.explorer.selection.party()}
                        parties={props.explorer.selection.election()?.parties ?? []}
                        rows={props.explorer.explore.rows()}
                        partyId={props.explorer.selection.state().party}
                        nationalShare={props.explorer.explore.nationalShare()}
                        search={props.explorer.explore.search()}
                        setSearch={props.explorer.explore.setSearch}
                        matches={props.explorer.explore.queryMatches()}
                        onSelect={selectExploreLocality}
                        selected={props.explorer.explore.selected()}
                        selectedComparison={props.explorer.explore.selectedComparison()}
                        compareParty={props.explorer.selection.compareParty()}
                        compareMode={props.explorer.selection.state().mode === "compare"}
                      />
                    </Show>
                    <Show
                      when={
                        props.explorer.selection.state().mode === "table" ||
                        props.explorer.explore.comparisonReady()
                      }
                    >
                      <LocalityTable
                        rows={props.explorer.table.filteredTable()}
                        state={props.explorer.selection.state()}
                        tableSearch={props.explorer.table.tableSearch()}
                        setTableSearch={props.explorer.table.setTableSearch}
                        sort={props.explorer.table.tableSort()}
                        setSort={props.explorer.table.setTableSort}
                        onState={props.explorer.selection.writeState}
                        onSelect={props.explorer.selection.chooseLocality}
                        compareMode={props.explorer.explore.comparisonReady()}
                      />
                    </Show>
                  </ResultsStatus>
                </div>
              </aside>
              <MapExplorerView map={props.explorer.map} />
            </section>
          </Show>
        </Show>
      </main>
      <footer class="site-footer" role="contentinfo">
        <span>
          Final results:{" "}
          <a
            href={
              props.explorer.selection.election()?.sourceUrl ?? "https://votes25.bechirot.gov.il/"
            }
          >
            Central Elections Committee
          </a>{" "}
          ·{" "}
          <a
            href={
              props.explorer.selection.election()?.sourceCsvUrl ??
              "https://media25.bechirot.gov.il/files/expc.csv"
            }
          >
            Locality CSV
          </a>
        </span>
        <span>
          Map: <a href="https://leafletjs.com/">Leaflet</a> and{" "}
          <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>
        </span>
      </footer>
    </div>
  );
}
