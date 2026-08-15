import { createEffect, createSignal, onCleanup, type Accessor } from "solid-js";
import type { ElectionMetadata, ElectionResultsFile } from "../../../domain/contracts";

const isAbortError = (error: unknown) => error instanceof Error && error.name === "AbortError";

export function createElectionResultsLoader(dependencies: {
  selected: Accessor<ElectionMetadata | undefined>;
  active?: Accessor<boolean>;
  loadElection(url: string, signal?: AbortSignal): Promise<ElectionResultsFile>;
  /** Read at failure time rather than at construction, so it follows the active locale. */
  mismatchMessage: () => string;
}) {
  const [results, setResults] = createSignal<ElectionResultsFile>();
  const [error, setError] = createSignal<unknown>();
  const [loading, setLoading] = createSignal(false);
  const [revision, setRevision] = createSignal(0);
  let generation = 0;
  let disposed = false;
  const reload = () => setRevision((value) => value + 1);
  createEffect(() => {
    const selected = dependencies.selected();
    const active = dependencies.active?.() ?? true;
    revision();
    if (!active || !selected) {
      generation += 1;
      setResults(undefined);
      setError(undefined);
      setLoading(false);
      return;
    }
    const abort = new AbortController();
    const request = ++generation;
    setResults(undefined);
    setError(undefined);
    setLoading(true);
    void dependencies
      .loadElection(selected.dataUrl, abort.signal)
      .then((data) => {
        if (disposed || request !== generation) return;
        if (data.electionId === selected.id) setResults(data);
        else setError(new Error(dependencies.mismatchMessage()));
      })
      .catch((nextError: unknown) => {
        if (!disposed && request === generation && !isAbortError(nextError)) setError(nextError);
      })
      .finally(() => {
        if (!disposed && request === generation) setLoading(false);
      });
    onCleanup(() => abort.abort());
  });
  onCleanup(() => {
    disposed = true;
    generation += 1;
  });
  return { results, error, loading, reload };
}
