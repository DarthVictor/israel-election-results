import { createMemo, type Accessor } from "solid-js";
import type {
  AnalysisState,
  ElectionResultsFile,
  LocalityResult,
  PartyList,
} from "../../../domain/contracts";
import type { ExplorerFeature } from "../topology";

/** Component-ready map data, presentation state, and map-specific callbacks. */
export function createMapView(dependencies: {
  state: Accessor<AnalysisState>;
  geometry: Accessor<ExplorerFeature[]>;
  geometryError: Accessor<unknown>;
  currentResults: Accessor<ElectionResultsFile | undefined>;
  rows: Accessor<LocalityResult[]>;
  comparisonRows: Accessor<LocalityResult[]>;
  comparisonReady: Accessor<boolean>;
  comparisonError: Accessor<unknown>;
  loadingComparison: Accessor<boolean>;
  compareParty: Accessor<PartyList | undefined>;
  resultsError: Accessor<unknown>;
  chooseLocality(localityId: number): void;
  reloadGeometry(): Promise<void>;
}) {
  const ready = createMemo(
    () =>
      !dependencies.geometryError() &&
      dependencies.geometry().length > 0 &&
      !!dependencies.currentResults() &&
      (dependencies.state().mode !== "compare" || dependencies.comparisonReady()),
  );
  const unavailableMessage = createMemo(() => {
    if (dependencies.state().mode === "compare" && dependencies.comparisonError()) {
      return "Comparison results are unavailable. Try again to restore the comparison map.";
    }
    if (dependencies.state().mode === "compare" && dependencies.loadingComparison()) {
      return "Loading comparison results…";
    }
    if (dependencies.resultsError()) {
      return "Selected election results are unavailable. Try again to restore the map.";
    }
    return "Loading map boundaries…";
  });

  return {
    state: dependencies.state,
    geometry: dependencies.geometry,
    geometryError: dependencies.geometryError,
    currentResults: dependencies.currentResults,
    rows: dependencies.rows,
    comparisonRows: dependencies.comparisonRows,
    comparisonReady: dependencies.comparisonReady,
    compareParty: dependencies.compareParty,
    ready,
    unavailableMessage,
    onSelect: dependencies.chooseLocality,
    onRetryLoad: dependencies.reloadGeometry,
  };
}
