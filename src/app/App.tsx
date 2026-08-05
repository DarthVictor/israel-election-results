import { For, Show, createEffect, createMemo, createSignal, onCleanup, onMount } from "solid-js";
import type {
  AnalysisMode,
  AnalysisState,
  ElectionManifest,
  ElectionResultsFile,
  LocalityResult,
  PartyList,
} from "../domain/contracts";
import { DEFAULT_ANALYSIS_STATE } from "../state/analysis-state";
import { parseAnalysisState, serializeAnalysisState } from "../state/url-state";
import { LeafletMap } from "../features/explorer/LeafletMap";
import { loadElection, loadGeometry, loadManifest } from "../features/explorer/data";
import {
  analysisCsv,
  analysisSvg,
  downloadBlob,
  downloadText,
  pngFromSvg,
} from "../features/explorer/exports";
import {
  comparisonDelta,
  comparisonLocalities,
  displayLocality,
  displayParty,
  partyShare,
  rankedPartyBreakdown,
  sortTableRows,
  strongestLocality,
  tableRows,
  turnout,
  type TableSortKey,
} from "../features/explorer/analysis";
import { topologyToFeatures } from "../features/explorer/topology";

const percent = new Intl.NumberFormat("en", {
  style: "percent",
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});
const number = new Intl.NumberFormat("en");
const modes: { id: AnalysisMode; label: string }[] = [
  { id: "explore", label: "Explore" },
  { id: "compare", label: "Compare" },
  { id: "table", label: "Table" },
];

const errorText = (error: unknown) =>
  error instanceof Error ? error.message : "Something went wrong while loading the explorer.";

export function App() {
  const [manifest, setManifest] = createSignal<ElectionManifest>();
  const [results, setResults] = createSignal<ElectionResultsFile>();
  const [comparisonResults, setComparisonResults] = createSignal<ElectionResultsFile>();
  const [geometry, setGeometry] = createSignal<ReturnType<typeof topologyToFeatures>>([]);
  const [state, setState] = createSignal<AnalysisState>(DEFAULT_ANALYSIS_STATE);
  const [search, setSearch] = createSignal("");
  const [tableSearch, setTableSearch] = createSignal("");
  const [tableSort, setTableSort] = createSignal<{ key: TableSortKey; direction: "asc" | "desc" }>({
    key: "share",
    direction: "desc",
  });
  const [manifestError, setManifestError] = createSignal<unknown>();
  const [resultsError, setResultsError] = createSignal<unknown>();
  const [comparisonError, setComparisonError] = createSignal<unknown>();
  const [geometryError, setGeometryError] = createSignal<unknown>();
  const [loadingManifest, setLoadingManifest] = createSignal(true);
  const [loadingResults, setLoadingResults] = createSignal(false);
  const [loadingComparison, setLoadingComparison] = createSignal(false);
  const [status, setStatus] = createSignal("");
  const [revision, setRevision] = createSignal(0);
  const [isMobile, setIsMobile] = createSignal(false);
  const [isSheetOpen, setIsSheetOpen] = createSignal(false);
  let resultsRequestGeneration = 0;
  let comparisonRequestGeneration = 0;

  const election = createMemo(() =>
    manifest()?.elections.find((item) => item.id === state().election),
  );
  const party = createMemo(() => election()?.parties.find((item) => item.id === state().party));
  const compareElection = createMemo(() => {
    const elections = manifest()?.elections ?? [];
    return (
      elections.find((item) => item.id === state().compareElection) ??
      elections.find((item) => item.id !== state().election) ??
      election()
    );
  });
  const compareParty = createMemo(
    () =>
      compareElection()?.parties.find((item) => item.id === state().compareParty) ??
      compareElection()?.parties[0],
  );
  const currentResults = createMemo(() =>
    results()?.electionId === state().election ? results() : undefined,
  );
  const currentComparison = createMemo(() =>
    comparisonResults()?.electionId === compareElection()?.id ? comparisonResults() : undefined,
  );
  const rows = createMemo(() => currentResults()?.localities ?? []);
  const comparisonRows = createMemo(() => currentComparison()?.localities ?? []);
  const comparisonReady = createMemo(
    () => state().mode === "compare" && !!currentComparison() && !!compareParty(),
  );
  const selectableRows = createMemo(() =>
    comparisonReady() ? comparisonLocalities(rows(), comparisonRows()) : rows(),
  );
  const selected = createMemo(() => rows().find((row) => row.localityId === state().locality));
  const selectedComparison = createMemo(() =>
    comparisonRows().find((row) => row.localityId === state().locality),
  );
  const queryMatches = createMemo(() => {
    const needle = search().trim().toLocaleLowerCase();
    return !needle
      ? []
      : selectableRows()
          .filter((row) => `${row.nameHe} ${row.nameEn ?? ""}`.toLocaleLowerCase().includes(needle))
          .slice(0, 8);
  });
  const filteredTable = createMemo(() =>
    sortTableRows(
      tableRows(
        rows(),
        state().party,
        {
          query: tableSearch(),
          turnoutMin: state().turnoutMin,
          shareMin: state().shareMin,
          minValidVotes: state().minValidVotes,
        },
        state().mode === "compare" && compareParty()
          ? { rows: comparisonRows(), partyId: compareParty()!.id }
          : undefined,
      ),
      tableSort().key,
      tableSort().direction,
    ),
  );
  const nationalShare = createMemo(() => {
    const valid = election()?.nationalTotals.valid ?? 0;
    return valid
      ? rows().reduce((sum, row) => sum + (row.partyVotes[state().party] ?? 0), 0) / valid
      : 0;
  });

  const writeState = (next: AnalysisState, replace = false) => {
    const normalized = manifest()
      ? parseAnalysisState(`?${serializeAnalysisState(next)}`, manifest()!)
      : next;
    setState(normalized);
    const url = `${window.location.pathname}?${serializeAnalysisState(normalized)}`;
    window.history[replace ? "replaceState" : "pushState"](normalized, "", url);
  };
  const chooseLocality = (localityId: number) => writeState({ ...state(), locality: localityId });
  const chooseMode = (mode: AnalysisMode) => {
    const next = { ...state(), mode };
    if (mode !== "explore" && !next.party) next.party = election()?.parties[0]?.id ?? "";
    if (mode === "compare" && !next.compareElection) {
      next.compareElection = compareElection()?.id;
      next.compareParty = compareParty()?.id;
    }
    writeState(next);
  };
  const chooseElection = (id: number) => {
    const next = manifest()?.elections.find((item) => item.id === id);
    if (!next) return;
    writeState({
      ...state(),
      election: id,
      party: next.parties.some((item) => item.id === state().party) ? state().party : "",
      locality: undefined,
    });
  };

  const loadAll = async () => {
    setLoadingManifest(true);
    setManifestError(undefined);
    try {
      const loaded = await loadManifest();
      setManifest(loaded);
      setState(parseAnalysisState(window.location.search, loaded));
      setLoadingManifest(false);
      try {
        setGeometry(topologyToFeatures(await loadGeometry(loaded.geometryUrl)));
      } catch (error) {
        setGeometryError(error);
      }
    } catch (error) {
      setManifestError(error);
      setLoadingManifest(false);
    }
  };

  onMount(() => {
    void loadAll();
    const mediaQuery = window.matchMedia("(max-width: 760px)");
    const updateMobile = () => {
      setIsMobile(mediaQuery.matches);
      if (!mediaQuery.matches) setIsSheetOpen(false);
    };
    updateMobile();
    mediaQuery.addEventListener("change", updateMobile);
    const onPop = () =>
      manifest() && setState(parseAnalysisState(window.location.search, manifest()!));
    window.addEventListener("popstate", onPop);
    onCleanup(() => {
      window.removeEventListener("popstate", onPop);
      mediaQuery.removeEventListener("change", updateMobile);
    });
  });
  createEffect(() => {
    const selected = election();
    revision();
    if (!selected) return;
    const controller = new AbortController();
    const generation = ++resultsRequestGeneration;
    setResults(undefined);
    setResultsError(undefined);
    setLoadingResults(true);
    void loadElection(selected.dataUrl, controller.signal)
      .then((data) => {
        if (generation !== resultsRequestGeneration || state().election !== selected.id) return;
        if (data.electionId === selected.id) setResults(data);
        else setResultsError(new Error("The result file does not match the selected election."));
      })
      .catch((error) => {
        if (
          generation === resultsRequestGeneration &&
          !(error instanceof DOMException && error.name === "AbortError")
        )
          setResultsError(error);
      })
      .finally(() => {
        if (generation === resultsRequestGeneration) setLoadingResults(false);
      });
    onCleanup(() => controller.abort());
  });
  createEffect(() => {
    const selected = compareElection();
    const active = state().mode === "compare";
    revision();
    if (!active || !selected) {
      comparisonRequestGeneration += 1;
      setComparisonResults(undefined);
      setComparisonError(undefined);
      setLoadingComparison(false);
      return;
    }
    const controller = new AbortController();
    const generation = ++comparisonRequestGeneration;
    setComparisonResults(undefined);
    setComparisonError(undefined);
    setLoadingComparison(true);
    void loadElection(selected.dataUrl, controller.signal)
      .then((data) => {
        if (
          generation === comparisonRequestGeneration &&
          state().mode === "compare" &&
          state().compareElection === selected.id &&
          data.electionId === selected.id
        )
          setComparisonResults(data);
      })
      .catch((error) => {
        if (
          generation === comparisonRequestGeneration &&
          !(error instanceof DOMException && error.name === "AbortError")
        )
          setComparisonError(error);
      })
      .finally(() => {
        if (generation === comparisonRequestGeneration) setLoadingComparison(false);
      });
    onCleanup(() => controller.abort());
  });

  const copyLink = async () => {
    if (manifest()) writeState(state(), true);
    const link = window.location.href;
    try {
      await navigator.clipboard.writeText(link);
      setStatus("Analysis link copied to your clipboard.");
    } catch {
      setStatus("Copy this analysis link from your browser address bar.");
    }
  };
  const exportCsv = () => {
    downloadText(
      "israel-election-analysis.csv",
      analysisCsv(
        filteredTable(),
        state(),
        election(),
        party(),
        comparisonReady() ? { election: compareElection(), party: compareParty() } : undefined,
      ),
    );
    setStatus("CSV download started.");
  };
  const exportPng = async () => {
    try {
      const isCompare = comparisonReady();
      if (!geometry().length || !rows().length || (state().mode === "compare" && !isCompare)) {
        throw new Error("Wait for geometry and active comparison data before exporting PNG.");
      }
      const svg = analysisSvg({
        features: geometry(),
        rows: rows(),
        partyId: state().party,
        title: isCompare
          ? "Locality comparison"
          : (party()?.nameEn ?? party()?.nameHe ?? "Election results"),
        context: isCompare
          ? `${election()?.label}: ${displayParty(party())}  |  ${compareElection()?.label}: ${displayParty(compareParty())}`
          : `${election()?.label} · ${displayParty(party())}`,
        insight: strongestLocality(rows(), state().party)
          ? `Strongest locality: ${displayLocality(strongestLocality(rows(), state().party))}`
          : "No mappable locality data",
        source: election()?.sourceUrl ?? "Official Central Elections Committee data",
        ...(isCompare
          ? { comparison: { rows: comparisonRows(), partyId: compareParty()!.id } }
          : {}),
      });
      const blob = await pngFromSvg(svg);
      downloadBlob("israel-election-analysis.png", blob);
      setStatus("PNG download started.");
    } catch (error) {
      setStatus(`PNG export failed: ${errorText(error)}`);
    }
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
            href={election()?.sourceUrl ?? "https://votes25.bechirot.gov.il/"}
            target="_blank"
            rel="noreferrer"
          >
            Official results
          </a>
          <a
            href={election()?.sourceCsvUrl ?? "https://media25.bechirot.gov.il/files/expc.csv"}
            target="_blank"
            rel="noreferrer"
          >
            Download locality CSV
          </a>
        </div>
      </header>
      <Show when={!loadingManifest()} fallback={<LoadingScreen label="Preparing election data" />}>
        <Show
          when={!manifestError()}
          fallback={<ErrorPanel error={manifestError()} onRetry={() => void loadAll()} />}
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
                <span>{state().mode === "table" ? "Locality table" : "Explore results"}</span>
                <span aria-hidden="true">{isSheetOpen() ? "Hide" : "Show"}</span>
              </button>
              <div
                id="analysis-sheet-content"
                class="analysis-sheet-content"
                aria-hidden={isMobile() && !isSheetOpen()}
                inert={isMobile() && !isSheetOpen()}
              >
                <nav class="mode-tabs" aria-label="Analysis view">
                  <For each={modes}>
                    {(item) => (
                      <button
                        type="button"
                        classList={{ active: state().mode === item.id }}
                        aria-current={state().mode === item.id ? "page" : undefined}
                        onClick={() => chooseMode(item.id)}
                        data-testid={`mode-${item.id}`}
                      >
                        {item.label}
                      </button>
                    )}
                  </For>
                </nav>
                <div class="control-stack">
                  <label>
                    Election
                    <select
                      data-testid="election-select"
                      value={state().election}
                      onInput={(event) => chooseElection(Number(event.currentTarget.value))}
                    >
                      <For each={manifest()?.elections}>
                        {(item) => (
                          <option value={item.id}>
                            {item.label} · {item.date}
                          </option>
                        )}
                      </For>
                    </select>
                  </label>
                  <label>
                    Party
                    <select
                      data-testid="party-select"
                      value={state().party}
                      onInput={(event) =>
                        writeState({
                          ...state(),
                          party: event.currentTarget.value,
                          locality: undefined,
                        })
                      }
                    >
                      <option value="">Choose a party</option>
                      <For each={election()?.parties}>
                        {(item) => <option value={item.id}>{displayParty(item)}</option>}
                      </For>
                    </select>
                  </label>
                </div>
                <Show when={state().mode === "compare"}>
                  <section class="comparison-controls" data-testid="comparison-controls">
                    <p class="mode-label">Independent comparison</p>
                    <p class="comparison-note">
                      A and B are separate historical lists. This comparison does not claim party
                      continuity.
                    </p>
                    <div class="control-stack">
                      <label>
                        Election B
                        <select
                          data-testid="compare-election-select"
                          value={compareElection()?.id}
                          onInput={(event) => {
                            const next = manifest()?.elections.find(
                              (item) => item.id === Number(event.currentTarget.value),
                            );
                            if (next)
                              writeState({
                                ...state(),
                                compareElection: next.id,
                                compareParty: next.parties[0]?.id,
                              });
                          }}
                        >
                          <For each={manifest()?.elections}>
                            {(item) => <option value={item.id}>{item.label}</option>}
                          </For>
                        </select>
                      </label>
                      <label>
                        List B
                        <select
                          data-testid="compare-party-select"
                          value={compareParty()?.id}
                          onInput={(event) =>
                            writeState({
                              ...state(),
                              compareElection: compareElection()?.id,
                              compareParty: event.currentTarget.value,
                            })
                          }
                        >
                          <For each={compareElection()?.parties}>
                            {(item) => <option value={item.id}>{displayParty(item)}</option>}
                          </For>
                        </select>
                      </label>
                    </div>
                    <Show when={loadingComparison()}>
                      <p class="status-message" role="status">
                        Loading comparison data…
                      </p>
                    </Show>
                    <Show when={comparisonError()}>
                      <ErrorPanel
                        compact
                        error={comparisonError()}
                        onRetry={() => setRevision((value) => value + 1)}
                      />
                    </Show>
                  </section>
                </Show>
                <div class="action-row">
                  <button type="button" onClick={() => void copyLink()} data-testid="copy-link">
                    Copy link
                  </button>
                  <button type="button" onClick={exportCsv} data-testid="export-csv">
                    CSV
                  </button>
                  <button type="button" onClick={() => void exportPng()} data-testid="export-png">
                    PNG
                  </button>
                </div>
                <p class="sr-status" aria-live="polite">
                  {status()}
                </p>
                <Show
                  when={!loadingResults()}
                  fallback={
                    <p class="status-message" role="status">
                      Loading locality results…
                    </p>
                  }
                >
                  <Show
                    when={!resultsError()}
                    fallback={
                      <ErrorPanel
                        compact
                        error={resultsError()}
                        onRetry={() => setRevision((value) => value + 1)}
                      />
                    }
                  >
                    <Show when={state().mode !== "table"}>
                      <ExplorePanel
                        party={party()}
                        parties={election()?.parties ?? []}
                        rows={rows()}
                        partyId={state().party}
                        nationalShare={nationalShare()}
                        search={search()}
                        setSearch={setSearch}
                        matches={queryMatches()}
                        onSelect={(id) => {
                          chooseLocality(id);
                          setSearch("");
                        }}
                        selected={selected()}
                        selectedComparison={selectedComparison()}
                        compareParty={compareParty()}
                        compareMode={state().mode === "compare"}
                      />
                    </Show>
                    <Show when={state().mode === "table" || comparisonReady()}>
                      <TablePanel
                        rows={filteredTable()}
                        state={state()}
                        tableSearch={tableSearch()}
                        setTableSearch={setTableSearch}
                        sort={tableSort()}
                        setSort={setTableSort}
                        onState={writeState}
                        onSelect={chooseLocality}
                        compareMode={comparisonReady()}
                      />
                    </Show>
                  </Show>
                </Show>
              </div>
            </aside>
            <section class="map-region" aria-label="Election result map" data-testid="map-region">
              <Show when={geometryError()}>
                <div class="map-error">
                  <ErrorPanel compact error={geometryError()} onRetry={() => void loadAll()} />
                </div>
              </Show>
              <Show
                when={
                  !geometryError() &&
                  geometry().length > 0 &&
                  currentResults() &&
                  (state().mode !== "compare" || comparisonReady())
                }
                fallback={
                  <div class="map-placeholder" data-testid="map-unavailable">
                    {state().mode === "compare" && comparisonError()
                      ? "Comparison results are unavailable. Try again to restore the comparison map."
                      : state().mode === "compare" && loadingComparison()
                        ? "Loading comparison results…"
                        : resultsError()
                          ? "Selected election results are unavailable. Try again to restore the map."
                          : "Loading map boundaries…"}
                  </div>
                }
              >
                <LeafletMap
                  features={geometry()}
                  rows={rows()}
                  partyId={state().party}
                  selectedLocalityId={state().locality}
                  onSelect={chooseLocality}
                  {...(comparisonReady()
                    ? { comparison: { rows: comparisonRows(), partyId: compareParty()!.id } }
                    : {})}
                />
              </Show>
              <Show when={state().mode !== "compare" || comparisonReady()}>
                <Legend compareMode={comparisonReady()} />
              </Show>
            </section>
          </section>
        </Show>
      </Show>
      <footer class="site-footer" role="contentinfo">
        <span>
          Final results:{" "}
          <a href={election()?.sourceUrl ?? "https://votes25.bechirot.gov.il/"}>
            Central Elections Committee
          </a>
          {" · "}
          <a href={election()?.sourceCsvUrl ?? "https://media25.bechirot.gov.il/files/expc.csv"}>
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

function ExplorePanel(props: {
  party?: PartyList;
  parties: PartyList[];
  rows: LocalityResult[];
  partyId: string;
  nationalShare: number;
  search: string;
  setSearch: (value: string) => void;
  matches: LocalityResult[];
  onSelect: (id: number) => void;
  selected?: LocalityResult;
  selectedComparison?: LocalityResult;
  compareParty?: PartyList;
  compareMode: boolean;
}) {
  return (
    <>
      <Show when={props.party}>
        <section class="insight-section">
          <h2>{props.party?.nameEn ?? props.party?.nameHe}</h2>
          <div class="insight-grid">
            <Insight label="National share" value={percent.format(props.nationalShare)} />
            <Insight
              label="Strongest locality"
              value={
                props.rows.length
                  ? displayLocality(strongestLocality(props.rows, props.partyId))
                  : "—"
              }
            />
            <Insight
              label="Mapped localities"
              value={number.format(props.rows.filter((row) => row.geography === "mappable").length)}
            />
          </div>
        </section>
      </Show>
      <section class="search-section">
        <label for="locality-search">Find a locality</label>
        <input
          id="locality-search"
          data-testid="locality-search"
          value={props.search}
          onInput={(event) => props.setSearch(event.currentTarget.value)}
          placeholder="Search in Hebrew or English"
          autocomplete="off"
        />
        <Show when={props.matches.length > 0}>
          <ul class="search-results">
            <For each={props.matches}>
              {(item) => (
                <li>
                  <button
                    type="button"
                    data-testid={`locality-match-${item.localityId}`}
                    onClick={() => props.onSelect(item.localityId)}
                  >
                    {displayLocality(item)}
                  </button>
                </li>
              )}
            </For>
          </ul>
        </Show>
      </section>
      <Show
        when={props.selected ?? props.selectedComparison}
        fallback={
          <section class="locality-panel empty-selection">
            <h2>Select a locality</h2>
            <p>Choose an area on the map or search by name.</p>
          </section>
        }
      >
        {(selected) =>
          props.compareMode ? (
            <ComparisonLocalityPanel
              first={props.selected}
              second={props.selectedComparison}
              firstParty={props.party}
              secondParty={props.compareParty}
              partyId={props.partyId}
            />
          ) : (
            <LocalityPanel locality={selected()} partyId={props.partyId} parties={props.parties} />
          )
        }
      </Show>
    </>
  );
}

function LocalityPanel(props: { locality: LocalityResult; partyId: string; parties: PartyList[] }) {
  return (
    <section class="locality-panel" aria-live="polite" data-testid="selected-locality">
      <div class="panel-heading">
        <div>
          <p class="eyebrow">Selected locality</p>
          <h2>{displayLocality(props.locality)}</h2>
        </div>
        <Show when={props.partyId}>
          <span class="rank">#{props.locality.partyRanks[props.partyId] ?? "—"} rank</span>
        </Show>
      </div>
      <Show when={props.partyId}>
        <div class="selected-result">
          <strong>{percent.format(partyShare(props.locality, props.partyId) / 100)}</strong>
          <span>
            {number.format(props.locality.partyVotes[props.partyId] ?? 0)} votes for selected party
          </span>
        </div>
      </Show>
      <dl class="stat-list">
        <div>
          <dt>Turnout</dt>
          <dd>{percent.format(turnout(props.locality) / 100)}</dd>
        </div>
        <div>
          <dt>Valid ballots</dt>
          <dd>{number.format(props.locality.valid)}</dd>
        </div>
      </dl>
      <h3>List breakdown</h3>
      <ol class="party-breakdown" data-testid="party-breakdown">
        <For each={rankedPartyBreakdown(props.locality, props.parties)}>
          {(entry) => (
            <li>
              <span
                class="party-name"
                title={[entry.party.nameEn, entry.party.nameHe].filter(Boolean).join(" · ")}
              >
                {[entry.party.nameEn, entry.party.nameHe].filter(Boolean).join(" · ")}
              </span>
              <b>{percent.format(entry.share / 100)}</b>
            </li>
          )}
        </For>
      </ol>
    </section>
  );
}

function ComparisonLocalityPanel(props: {
  first?: LocalityResult;
  second?: LocalityResult;
  firstParty?: PartyList;
  secondParty?: PartyList;
  partyId: string;
}) {
  const delta = () =>
    comparisonDelta(props.first, props.partyId, props.second, props.secondParty?.id ?? "");
  return (
    <section class="locality-panel" aria-live="polite" data-testid="selected-locality">
      <p class="eyebrow">Independent A / B locality comparison</p>
      <h2>{displayLocality(props.first ?? props.second)}</h2>
      <Show
        when={props.first && props.second}
        fallback={
          <p class="comparison-note">
            This locality is present in only one election, so a change cannot be calculated.
          </p>
        }
      >
        <div class="comparison-result">
          <div>
            <span>A · {props.firstParty?.nameEn ?? props.firstParty?.nameHe}</span>
            <strong>{percent.format(partyShare(props.first!, props.partyId) / 100)}</strong>
          </div>
          <div>
            <span>B · {props.secondParty?.nameEn ?? props.secondParty?.nameHe}</span>
            <strong>
              {percent.format(partyShare(props.second!, props.secondParty?.id ?? "") / 100)}
            </strong>
          </div>
          <div>
            <span>Change</span>
            <strong>
              {delta() === undefined
                ? "No data"
                : `${delta()! >= 0 ? "+" : ""}${delta()!.toFixed(1)} pp`}
            </strong>
          </div>
        </div>
      </Show>
    </section>
  );
}

function TablePanel(props: {
  rows: ReturnType<typeof tableRows>;
  state: AnalysisState;
  tableSearch: string;
  setTableSearch: (value: string) => void;
  sort: { key: TableSortKey; direction: "asc" | "desc" };
  setSort: (sort: { key: TableSortKey; direction: "asc" | "desc" }) => void;
  onState: (next: AnalysisState) => void;
  onSelect: (id: number) => void;
  compareMode: boolean;
}) {
  const numeric = (field: "turnoutMin" | "shareMin" | "minValidVotes", value: string) =>
    props.onState({ ...props.state, [field]: value === "" ? undefined : Number(value) });
  const sort = (key: TableSortKey) =>
    props.setSort({
      key,
      direction: props.sort.key === key && props.sort.direction === "desc" ? "asc" : "desc",
    });
  return (
    <section class="table-panel" data-testid="table-panel">
      <h2>Locality table</h2>
      <input
        aria-label="Filter table localities"
        value={props.tableSearch}
        onInput={(event) => props.setTableSearch(event.currentTarget.value)}
        placeholder="Filter locality name"
      />
      <div class="filter-grid">
        <label>
          Min turnout
          <input
            type="number"
            min="0"
            max="100"
            value={props.state.turnoutMin ?? ""}
            onInput={(event) => numeric("turnoutMin", event.currentTarget.value)}
          />
        </label>
        <label>
          Min share
          <input
            type="number"
            min="0"
            max="100"
            value={props.state.shareMin ?? ""}
            onInput={(event) => numeric("shareMin", event.currentTarget.value)}
          />
        </label>
        <label>
          Min valid ballots
          <input
            type="number"
            min="0"
            value={props.state.minValidVotes ?? ""}
            onInput={(event) => numeric("minValidVotes", event.currentTarget.value)}
          />
        </label>
      </div>
      <p class="table-count">{number.format(props.rows.length)} mapped localities</p>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <SortHead label="Locality" field="name" sort={sort} />
              <SortHead label="Votes" field="votes" sort={sort} />
              <SortHead label="Share" field="share" sort={sort} />
              <SortHead label="Turnout" field="turnout" sort={sort} />
              <SortHead label="Valid" field="valid" sort={sort} />
              <SortHead label="Rank" field="rank" sort={sort} />
              <Show when={props.compareMode}>
                <SortHead label="Δ pp" field="delta" sort={sort} />
              </Show>
            </tr>
          </thead>
          <tbody>
            <For each={props.rows}>
              {(row) => (
                <tr>
                  <td>
                    <button type="button" onClick={() => props.onSelect(row.locality.localityId)}>
                      {displayLocality(row.locality)}
                    </button>
                  </td>
                  <td>{number.format(row.votes)}</td>
                  <td>{row.share.toFixed(1)}%</td>
                  <td>{row.turnout.toFixed(1)}%</td>
                  <td>{number.format(row.locality.valid)}</td>
                  <td>{row.locality.partyRanks[props.state.party] ?? "—"}</td>
                  <Show when={props.compareMode}>
                    <td>
                      {row.delta === undefined
                        ? "No data"
                        : `${row.delta >= 0 ? "+" : ""}${row.delta.toFixed(1)}`}
                    </td>
                  </Show>
                </tr>
              )}
            </For>
          </tbody>
        </table>
      </div>
    </section>
  );
}
function SortHead(props: {
  label: string;
  field: TableSortKey;
  sort: (field: TableSortKey) => void;
}) {
  return (
    <th scope="col">
      <button type="button" onClick={() => props.sort(props.field)}>
        {props.label}
      </button>
    </th>
  );
}
function Insight(props: { label: string; value: string }) {
  return (
    <article class="insight">
      <span>{props.label}</span>
      <strong>{props.value}</strong>
    </article>
  );
}
function Legend(props: { compareMode: boolean }) {
  return (
    <div class="map-legend" aria-label="Map color legend">
      <span>{props.compareMode ? "B share minus A share" : "List vote share"}</span>
      <div classList={{ "legend-scale": true, comparison: props.compareMode }}>
        <i />
        <i />
        <i />
        <i />
        <i />
      </div>
      <div class="legend-labels">
        <span>{props.compareMode ? "-100 pp (A)" : "Lower"}</span>
        <span>{props.compareMode ? "0 pp" : ""}</span>
        <span>{props.compareMode ? "+100 pp (B)" : "Higher"}</span>
      </div>
      <small>Gray: no matching data</small>
    </div>
  );
}
function LoadingScreen(props: { label: string }) {
  return (
    <div class="loading-screen" role="status">
      {props.label}…
    </div>
  );
}
function ErrorPanel(props: { error: unknown; onRetry: () => void; compact?: boolean }) {
  return (
    <section
      class={props.compact ? "error-panel compact" : "error-panel"}
      role="alert"
      data-testid="load-error"
    >
      <h2>Data could not load</h2>
      <p>{errorText(props.error)}</p>
      <button type="button" onClick={() => props.onRetry()} data-testid="retry-load">
        Try again
      </button>
    </section>
  );
}
