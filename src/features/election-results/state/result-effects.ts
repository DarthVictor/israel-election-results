import { createEffect, createSignal, onCleanup } from "solid-js";
import type { ElectionMetadata } from "../../../domain/contracts";
import type {
  ElectionResultsRepository,
  ElectionState,
  SetElectionState,
} from "./election-results-store.types";

const isAbortError = (error: unknown) => error instanceof Error && error.name === "AbortError";

type RequestOptions = {
  state: ElectionState;
  setState: SetElectionState;
  repository: ElectionResultsRepository;
  selected(): ElectionMetadata | undefined;
  active?(): boolean;
  target: "results" | "comparisonResults";
  request: "results" | "comparison";
  mismatchMessage(): string;
};

export function createElectionRequestEffect(options: RequestOptions) {
  const [revision, setRevision] = createSignal(0);
  let generation = 0;
  let disposed = false;
  const reload = () => setRevision((value) => value + 1);

  createEffect(() => {
    const selected = options.selected();
    const active = options.active?.() ?? true;
    revision();
    if (!active || !selected) {
      generation += 1;
      options.setState(options.target, undefined);
      options.setState("requests", options.request, { loading: false, error: undefined });
      return;
    }
    const abort = new AbortController();
    const request = ++generation;
    options.setState(options.target, undefined);
    options.setState("requests", options.request, { loading: true, error: undefined });
    void options.repository
      .loadElection(selected.dataUrl, abort.signal)
      .then((data) => {
        if (disposed || request !== generation) return;
        if (data.electionId === selected.id) options.setState(options.target, data);
        else
          options.setState(
            "requests",
            options.request,
            "error",
            new Error(options.mismatchMessage()),
          );
      })
      .catch((error: unknown) => {
        if (!disposed && request === generation && !isAbortError(error)) {
          options.setState("requests", options.request, "error", error);
        }
      })
      .finally(() => {
        if (!disposed && request === generation) {
          options.setState("requests", options.request, "loading", false);
        }
      });
    onCleanup(() => abort.abort());
  });
  onCleanup(() => {
    disposed = true;
    generation += 1;
  });
  return reload;
}
