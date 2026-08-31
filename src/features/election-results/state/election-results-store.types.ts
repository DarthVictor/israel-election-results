import type { SetStoreFunction, Store } from "solid-js/store";
import type {
  AnalysisState,
  ElectionManifest,
  ElectionResultsFile,
} from "../../../domain/contracts";
import type { I18n } from "../../../i18n/create-i18n";
import type { ExportBrowser } from "../export-actions";
import type { LocalityBoundary } from "../locality-boundaries";

export type RequestStatus = { loading: boolean; error?: unknown };

export type ElectionResultsState = {
  analysis: AnalysisState;
  manifest?: ElectionManifest;
  boundaries: LocalityBoundary[];
  results?: ElectionResultsFile;
  comparisonResults?: ElectionResultsFile;
  requests: {
    manifest: RequestStatus;
    boundaries: RequestStatus;
    results: RequestStatus;
    comparison: RequestStatus;
  };
};

export type ElectionResultsHistory = {
  readSearch(): string;
  pathname(): string;
  href(): string;
  push(state: unknown, url: string): void;
  replace(state: unknown, url: string): void;
  subscribe(listener: () => void): () => void;
};

export type ElectionResultsRepository = {
  loadManifest(signal?: AbortSignal): Promise<ElectionManifest>;
  loadElection(url: string, signal?: AbortSignal): Promise<ElectionResultsFile>;
  loadGeometry(url: string, signal?: AbortSignal): Promise<unknown>;
  topologyToBoundaries(rawTopology: unknown): LocalityBoundary[];
};

export type BrowserCapabilities = {
  clipboard?: { writeText(value: string): Promise<void> };
  exports?: ExportBrowser;
};

export type ElectionResultsDependencies = {
  i18n: I18n;
  repository: ElectionResultsRepository;
  history: ElectionResultsHistory;
  browser?: BrowserCapabilities;
};

export type ElectionState = Store<ElectionResultsState>;
export type SetElectionState = SetStoreFunction<ElectionResultsState>;
