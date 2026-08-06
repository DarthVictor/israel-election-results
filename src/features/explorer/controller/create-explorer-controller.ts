import {
  createEffect,
  createMemo,
  createSignal,
  onCleanup,
  untrack,
  type Accessor,
} from "solid-js";
import type {
  AnalysisMode,
  AnalysisState,
  ElectionManifest,
  ElectionMetadata,
  ElectionResultsFile,
  LocalityResult,
  PartyList,
} from "../../../domain/contracts";
import {
  chooseAnalysisElection,
  chooseAnalysisLocality,
  chooseAnalysisMode,
  chooseAnalysisParty,
  chooseComparisonElection,
  chooseComparisonParty,
} from "../../../domain/explorer/selection";
import { DEFAULT_ANALYSIS_STATE } from "../../../state/analysis-state";
import { parseAnalysisState, serializeAnalysisState } from "../../../state/url-state";
import { comparisonLocalities, sortTableRows, tableRows, type TableSortKey } from "../analysis";
import type { ExplorerFeature } from "../topology";
import type { ExplorerControllerDependencies } from "./explorer-dependencies";

export type ExplorerController = {
  manifest: Accessor<ElectionManifest | undefined>;
  state: Accessor<AnalysisState>;
  geometry: Accessor<ExplorerFeature[]>;
  search: Accessor<string>;
  setSearch(value: string): void;
  tableSearch: Accessor<string>;
  setTableSearch(value: string): void;
  tableSort: Accessor<{ key: TableSortKey; direction: "asc" | "desc" }>;
  setTableSort(value: { key: TableSortKey; direction: "asc" | "desc" }): void;
  manifestError: Accessor<unknown>;
  resultsError: Accessor<unknown>;
  comparisonError: Accessor<unknown>;
  geometryError: Accessor<unknown>;
  loadingManifest: Accessor<boolean>;
  loadingResults: Accessor<boolean>;
  loadingComparison: Accessor<boolean>;
  status: Accessor<string>;
  setStatus(value: string): void;
  election: Accessor<ElectionMetadata | undefined>;
  party: Accessor<PartyList | undefined>;
  compareElection: Accessor<ElectionManifest["elections"][number] | undefined>;
  compareParty: Accessor<PartyList | undefined>;
  currentResults: Accessor<ElectionResultsFile | undefined>;
  rows: Accessor<LocalityResult[]>;
  comparisonRows: Accessor<LocalityResult[]>;
  comparisonReady: Accessor<boolean>;
  selectableRows: Accessor<LocalityResult[]>;
  selected: Accessor<LocalityResult | undefined>;
  selectedComparison: Accessor<LocalityResult | undefined>;
  queryMatches: Accessor<LocalityResult[]>;
  filteredTable: Accessor<ReturnType<typeof tableRows>>;
  nationalShare: Accessor<number>;
  currentUrl(): string;
  load(): Promise<void>;
  retry(): void;
  writeState(next: AnalysisState, replace?: boolean): void;
  chooseMode(mode: AnalysisMode): void;
  chooseElection(electionId: number): void;
  chooseParty(partyId: string): void;
  chooseLocality(localityId: number): void;
  chooseComparisonElection(electionId: number): void;
  chooseComparisonParty(partyId: string): void;
};

const isAbortError = (error: unknown) => error instanceof Error && error.name === "AbortError";

export function createExplorerController(
  dependencies: ExplorerControllerDependencies,
): ExplorerController {
  const [manifest, setManifest] = createSignal<ElectionManifest>();
  const [results, setResults] = createSignal<ElectionResultsFile>();
  const [comparisonResults, setComparisonResults] = createSignal<ElectionResultsFile>();
  const [geometry, setGeometry] = createSignal<ExplorerFeature[]>([]);
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
  let loadGeneration = 0;
  let resultsRequestGeneration = 0;
  let comparisonRequestGeneration = 0;
  let manifestAbortController: AbortController | undefined;
  let geometryAbortController: AbortController | undefined;
  let disposed = false;

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
    const partyId = state().party;
    return valid ? rows().reduce((sum, row) => sum + (row.partyVotes[partyId] ?? 0), 0) / valid : 0;
  });

  const writeState = (next: AnalysisState, replace = false) => {
    const loadedManifest = manifest();
    const normalized = loadedManifest
      ? parseAnalysisState(`?${serializeAnalysisState(next)}`, loadedManifest)
      : next;
    setState(normalized);
    const url = `${dependencies.history.pathname()}?${serializeAnalysisState(normalized)}`;
    dependencies.history[replace ? "replace" : "push"](normalized, url);
  };
  const chooseMode = (mode: AnalysisMode) => {
    const loadedManifest = manifest();
    if (loadedManifest) writeState(chooseAnalysisMode(state(), mode, loadedManifest));
  };
  const chooseElection = (electionId: number) => {
    const loadedManifest = manifest();
    if (loadedManifest) writeState(chooseAnalysisElection(state(), electionId, loadedManifest));
  };
  const chooseParty = (partyId: string) => {
    const loadedManifest = manifest();
    if (loadedManifest) writeState(chooseAnalysisParty(state(), partyId, loadedManifest));
  };
  const chooseLocality = (localityId: number) => {
    const loadedManifest = manifest();
    if (loadedManifest) writeState(chooseAnalysisLocality(state(), localityId, loadedManifest));
  };
  const chooseComparisonElectionAction = (electionId: number) => {
    const loadedManifest = manifest();
    if (loadedManifest) writeState(chooseComparisonElection(state(), electionId, loadedManifest));
  };
  const chooseComparisonPartyAction = (partyId: string) => {
    const loadedManifest = manifest();
    if (loadedManifest) writeState(chooseComparisonParty(state(), partyId, loadedManifest));
  };

  const load = async () => {
    manifestAbortController?.abort();
    geometryAbortController?.abort();
    const generation = ++loadGeneration;
    const manifestController = new AbortController();
    manifestAbortController = manifestController;
    const isCurrent = () => !disposed && generation === loadGeneration;
    setLoadingManifest(true);
    setManifestError(undefined);
    setGeometryError(undefined);
    try {
      const loaded = await dependencies.data.loadManifest(manifestController.signal);
      if (!isCurrent()) return;
      setManifest(loaded);
      setState(parseAnalysisState(dependencies.history.readSearch(), loaded));
      setLoadingManifest(false);
      const geometryController = new AbortController();
      geometryAbortController = geometryController;
      try {
        const rawGeometry = await dependencies.data.loadGeometry(
          loaded.geometryUrl,
          geometryController.signal,
        );
        if (!isCurrent() || geometryAbortController !== geometryController) return;
        setGeometry(dependencies.data.topologyToFeatures(rawGeometry));
        setGeometryError(undefined);
      } catch (error) {
        if (isCurrent() && geometryAbortController === geometryController && !isAbortError(error))
          setGeometryError(error);
      } finally {
        if (geometryAbortController === geometryController) geometryAbortController = undefined;
      }
    } catch (error) {
      if (isCurrent() && !isAbortError(error)) setManifestError(error);
    } finally {
      if (manifestAbortController === manifestController) manifestAbortController = undefined;
      if (isCurrent()) setLoadingManifest(false);
    }
  };

  const retry = () => setRevision((value) => value + 1);

  onCleanup(() => {
    disposed = true;
    loadGeneration += 1;
    resultsRequestGeneration += 1;
    comparisonRequestGeneration += 1;
    manifestAbortController?.abort();
    geometryAbortController?.abort();
  });

  onCleanup(
    dependencies.history.subscribe(() => {
      const loadedManifest = untrack(manifest);
      if (loadedManifest)
        setState(
          untrack(() => parseAnalysisState(dependencies.history.readSearch(), loadedManifest)),
        );
    }),
  );

  createEffect(() => {
    const selected = election();
    revision();
    if (!selected) return;
    const abortController = new AbortController();
    const generation = ++resultsRequestGeneration;
    setResults(undefined);
    setResultsError(undefined);
    setLoadingResults(true);
    void dependencies.data
      .loadElection(selected.dataUrl, abortController.signal)
      .then((data) => {
        if (generation !== resultsRequestGeneration) return;
        if (data.electionId === selected.id) setResults(data);
        else setResultsError(new Error("The result file does not match the selected election."));
      })
      .catch((error: unknown) => {
        if (generation === resultsRequestGeneration && !isAbortError(error)) setResultsError(error);
      })
      .finally(() => {
        if (generation === resultsRequestGeneration) setLoadingResults(false);
      });
    onCleanup(() => abortController.abort());
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
    const abortController = new AbortController();
    const generation = ++comparisonRequestGeneration;
    setComparisonResults(undefined);
    setComparisonError(undefined);
    setLoadingComparison(true);
    void dependencies.data
      .loadElection(selected.dataUrl, abortController.signal)
      .then((data) => {
        if (generation !== comparisonRequestGeneration) return;
        if (data.electionId === selected.id) setComparisonResults(data);
        else
          setComparisonError(
            new Error("The comparison file does not match the selected election."),
          );
      })
      .catch((error: unknown) => {
        if (generation === comparisonRequestGeneration && !isAbortError(error))
          setComparisonError(error);
      })
      .finally(() => {
        if (generation === comparisonRequestGeneration) setLoadingComparison(false);
      });
    onCleanup(() => abortController.abort());
  });

  return {
    manifest,
    state,
    geometry,
    search,
    setSearch,
    tableSearch,
    setTableSearch,
    tableSort,
    setTableSort,
    manifestError,
    resultsError,
    comparisonError,
    geometryError,
    loadingManifest,
    loadingResults,
    loadingComparison,
    status,
    setStatus,
    election,
    party,
    compareElection,
    compareParty,
    currentResults,
    rows,
    comparisonRows,
    comparisonReady,
    selectableRows,
    selected,
    selectedComparison,
    queryMatches,
    filteredTable,
    nationalShare,
    currentUrl: dependencies.history.href,
    load,
    retry,
    writeState,
    chooseMode,
    chooseElection,
    chooseParty,
    chooseLocality,
    chooseComparisonElection: chooseComparisonElectionAction,
    chooseComparisonParty: chooseComparisonPartyAction,
  };
}
