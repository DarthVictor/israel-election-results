export type AnalysisSelectionHistory = {
  readSearch(): string;
  pathname(): string;
  push(state: unknown, url: string): void;
  replace(state: unknown, url: string): void;
  subscribe(listener: () => void): () => void;
};
