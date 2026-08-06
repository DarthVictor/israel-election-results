import { createExplorerActions } from "../actions/create-explorer-actions";
import { createElectionResultsLoader } from "../loaders/election-results-loader";
import { createManifestGeometryLoader } from "../loaders/manifest-geometry-loader";
import { createAnalysisSelection } from "../selection/create-analysis-selection";
import { createExploreView } from "../views/create-explore-view";
import { createMapView } from "../views/create-map-view";
import { createTableView } from "../views/create-table-view";
import type { ExplorerFeature, ExplorerFeatureDependencies } from "./explorer-feature.types";

/** Composes the Explorer's six public slices without imposing a UI layout. */
export function createExplorerFeature(dependencies: ExplorerFeatureDependencies): ExplorerFeature {
  const selectionReference: { current?: ReturnType<typeof createAnalysisSelection> } = {};
  const manifestGeometry = createManifestGeometryLoader({
    repository: dependencies.data,
    onManifestLoaded: () => selectionReference.current?.restore(),
  });
  const selection = createAnalysisSelection({
    manifest: manifestGeometry.manifest,
    history: dependencies.history,
  });
  selectionReference.current = selection;
  const currentLoader = createElectionResultsLoader({
    selected: selection.election,
    loadElection: dependencies.data.loadElection,
    mismatchMessage: "The result file does not match the selected election.",
  });
  const comparisonLoader = createElectionResultsLoader({
    selected: selection.compareElection,
    active: () => selection.state().mode === "compare",
    loadElection: dependencies.data.loadElection,
    mismatchMessage: "The comparison file does not match the selected election.",
  });
  const explore = createExploreView({
    state: selection.state,
    election: selection.election,
    compareElection: selection.compareElection,
    compareParty: selection.compareParty,
    results: currentLoader.results,
    comparisonResults: comparisonLoader.results,
  });
  const table = createTableView({
    state: selection.state,
    compareParty: selection.compareParty,
    rows: explore.rows,
    comparisonRows: explore.comparisonRows,
  });
  const loading = {
    manifest: manifestGeometry.manifest,
    manifestError: manifestGeometry.manifestError,
    resultsError: currentLoader.error,
    comparisonError: comparisonLoader.error,
    geometryError: manifestGeometry.geometryError,
    loadingManifest: manifestGeometry.loadingManifest,
    loadingResults: currentLoader.loading,
    loadingComparison: comparisonLoader.loading,
    reloadManifest: manifestGeometry.reloadManifest,
    reloadGeometry: manifestGeometry.reloadGeometry,
    reloadCurrentResults: currentLoader.reload,
    reloadComparisonResults: comparisonLoader.reload,
  };
  const map = createMapView({
    state: selection.state,
    geometry: manifestGeometry.geometry,
    geometryError: manifestGeometry.geometryError,
    currentResults: explore.currentResults,
    rows: explore.rows,
    comparisonRows: explore.comparisonRows,
    comparisonReady: explore.comparisonReady,
    comparisonError: comparisonLoader.error,
    loadingComparison: comparisonLoader.loading,
    compareParty: selection.compareParty,
    resultsError: currentLoader.error,
    chooseLocality: selection.chooseLocality,
    reloadGeometry: manifestGeometry.reloadGeometry,
  });
  const actions = createExplorerActions({
    manifest: manifestGeometry.manifest,
    state: selection.state,
    writeState: selection.writeState,
    currentUrl: dependencies.history.href,
    filteredTable: table.filteredTable,
    election: selection.election,
    party: selection.party,
    compareElection: selection.compareElection,
    compareParty: selection.compareParty,
    comparisonRows: explore.comparisonRows,
    comparisonReady: explore.comparisonReady,
    geometry: manifestGeometry.geometry,
    localityRows: explore.rows,
    browser: dependencies.browser,
  });

  return { selection, loading, explore, table, map, actions };
}
