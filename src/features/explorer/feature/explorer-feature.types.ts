import type { Accessor } from "solid-js";
import type { ElectionManifest } from "../../../domain/contracts";
import type { I18n } from "../../../i18n/create-i18n";
import type { ExplorerActionBrowser } from "../actions/create-explorer-actions";
import type { AnalysisSelection } from "../selection/create-analysis-selection";
import type { createExploreView } from "../views/create-explore-view";
import type { createMapView } from "../views/create-map-view";
import type { createTableView } from "../views/create-table-view";

export type ExplorerLoading = {
  manifest: Accessor<ElectionManifest | undefined>;
  manifestError: Accessor<unknown>;
  resultsError: Accessor<unknown>;
  comparisonError: Accessor<unknown>;
  geometryError: Accessor<unknown>;
  loadingManifest: Accessor<boolean>;
  loadingResults: Accessor<boolean>;
  loadingComparison: Accessor<boolean>;
  reloadManifest(): Promise<void>;
  reloadGeometry(): Promise<void>;
  reloadCurrentResults(): void;
  reloadComparisonResults(): void;
};

export type ExplorerFeature = {
  selection: AnalysisSelection;
  loading: ExplorerLoading;
  explore: ReturnType<typeof createExploreView>;
  table: ReturnType<typeof createTableView>;
  map: ReturnType<typeof createMapView>;
  actions: ReturnType<typeof import("../actions/create-explorer-actions").createExplorerActions>;
};

export type ExplorerFeatureDependencies = {
  /** Injected rather than read from context, so these slices stay free of a component tree. */
  i18n: I18n;
  data: {
    loadManifest(signal?: AbortSignal): Promise<ElectionManifest>;
    loadElection(
      url: string,
      signal?: AbortSignal,
    ): Promise<import("../../../domain/contracts").ElectionResultsFile>;
    loadGeometry(url: string, signal?: AbortSignal): Promise<unknown>;
    topologyToFeatures(rawTopology: unknown): import("../topology").ExplorerFeature[];
  };
  history: {
    readSearch(): string;
    pathname(): string;
    href(): string;
    push(state: unknown, url: string): void;
    replace(state: unknown, url: string): void;
    subscribe(listener: () => void): () => void;
  };
  browser?: ExplorerActionBrowser;
};
