import type { ElectionManifest, ElectionResultsFile } from "../../../domain/contracts";
import type { ExplorerFeature } from "../topology";

export type ExplorerDataDependencies = {
  loadManifest(signal?: AbortSignal): Promise<ElectionManifest>;
  loadElection(url: string, signal?: AbortSignal): Promise<ElectionResultsFile>;
  loadGeometry(url: string, signal?: AbortSignal): Promise<unknown>;
  topologyToFeatures(rawTopology: unknown): ExplorerFeature[];
};

export type ExplorerHistoryDependencies = {
  readSearch(): string;
  pathname(): string;
  href(): string;
  push(state: unknown, url: string): void;
  replace(state: unknown, url: string): void;
  subscribe(listener: () => void): () => void;
};

export type ExplorerControllerDependencies = {
  data: ExplorerDataDependencies;
  history: ExplorerHistoryDependencies;
};
