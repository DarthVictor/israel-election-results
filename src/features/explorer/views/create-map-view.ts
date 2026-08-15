import { createMemo, type Accessor } from "solid-js";
import type {
  AnalysisState,
  ElectionResultsFile,
  LocalityResult,
  PartyList,
} from "../../../domain/contracts";
import type { Translate } from "../../../i18n/translate";
import type { ExplorerFeature } from "../topology";

/** Component-ready map data, presentation state, and map-specific callbacks. */
export function createMapView(dependencies: {
  t: Translate;
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
      return dependencies.t("map.comparisonError");
    }
    if (dependencies.state().mode === "compare" && dependencies.loadingComparison()) {
      return dependencies.t("map.comparisonLoading");
    }
    if (dependencies.resultsError()) {
      return dependencies.t("map.resultsError");
    }
    return dependencies.t("map.boundariesLoading");
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
