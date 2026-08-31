import { createStore } from "solid-js/store";
import { DEFAULT_ANALYSIS_STATE } from "../../../state/analysis-state";
import { createElectionResultsSelectors } from "./election-results-selectors";
import type {
  ElectionResultsDependencies,
  ElectionResultsState,
} from "./election-results-store.types";
import { createExportActions } from "./export-actions";
import { createManifestActions } from "./manifest-actions";
import { createElectionRequestEffect } from "./result-effects";
import { createSelectionActions } from "./selection-actions";

const request = () => ({ loading: false, error: undefined });

export function createElectionResultsStore(dependencies: ElectionResultsDependencies) {
  const [state, setState] = createStore<ElectionResultsState>({
    analysis: { ...DEFAULT_ANALYSIS_STATE },
    boundaries: [],
    requests: {
      manifest: { loading: true, error: undefined },
      boundaries: request(),
      results: request(),
      comparison: request(),
    },
  });
  const selectors = createElectionResultsSelectors(state, dependencies.i18n.t);
  const selection = createSelectionActions(state, setState, dependencies.history);
  const manifest = createManifestActions(
    state,
    setState,
    dependencies.repository,
    selection.restore,
  );
  const reloadResults = createElectionRequestEffect({
    state,
    setState,
    repository: dependencies.repository,
    selected: selectors.election,
    target: "results",
    request: "results",
    mismatchMessage: () => dependencies.i18n.t("dataError.electionMismatch"),
  });
  const reloadComparison = createElectionRequestEffect({
    state,
    setState,
    repository: dependencies.repository,
    selected: selectors.comparisonElection,
    active: () => state.analysis.mode === "compare",
    target: "comparisonResults",
    request: "comparison",
    mismatchMessage: () => dependencies.i18n.t("dataError.comparisonMismatch"),
  });
  const exports = createExportActions(state, selectors, selection, dependencies);

  return {
    state,
    selectors,
    actions: {
      ...selection,
      ...manifest,
      reloadResults,
      reloadComparison,
      ...exports,
    },
  };
}

export type ElectionResultsStore = ReturnType<typeof createElectionResultsStore>;
