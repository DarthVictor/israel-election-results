import { onCleanup } from "solid-js";
import type {
  ElectionResultsRepository,
  ElectionState,
  SetElectionState,
} from "./election-results-store.types";

const isAbortError = (error: unknown) => error instanceof Error && error.name === "AbortError";

export function createManifestActions(
  state: ElectionState,
  setState: SetElectionState,
  repository: ElectionResultsRepository,
  restoreSelection: () => void,
) {
  let manifestAbort: AbortController | undefined;
  let boundariesAbort: AbortController | undefined;
  let generation = 0;
  let disposed = false;

  const reloadBoundaries = async () => {
    if (!state.manifest) return;
    boundariesAbort?.abort();
    const activeGeneration = generation;
    const abort = new AbortController();
    boundariesAbort = abort;
    setState("requests", "boundaries", { loading: true, error: undefined });
    try {
      const raw = await repository.loadGeometry(state.manifest.geometryUrl, abort.signal);
      if (!disposed && generation === activeGeneration && boundariesAbort === abort) {
        setState("boundaries", repository.topologyToBoundaries(raw));
      }
    } catch (error) {
      if (!disposed && generation === activeGeneration && !isAbortError(error)) {
        setState("requests", "boundaries", "error", error);
      }
    } finally {
      if (boundariesAbort === abort) boundariesAbort = undefined;
      if (!disposed && generation === activeGeneration) {
        setState("requests", "boundaries", "loading", false);
      }
    }
  };

  const reloadManifest = async () => {
    manifestAbort?.abort();
    boundariesAbort?.abort();
    const activeGeneration = ++generation;
    const abort = new AbortController();
    manifestAbort = abort;
    setState("requests", "manifest", { loading: true, error: undefined });
    setState("requests", "boundaries", "error", undefined);
    try {
      const manifest = await repository.loadManifest(abort.signal);
      if (disposed || generation !== activeGeneration) return;
      setState("manifest", manifest);
      restoreSelection();
      await reloadBoundaries();
    } catch (error) {
      if (!disposed && generation === activeGeneration && !isAbortError(error)) {
        setState("requests", "manifest", "error", error);
      }
    } finally {
      if (manifestAbort === abort) manifestAbort = undefined;
      if (!disposed && generation === activeGeneration) {
        setState("requests", "manifest", "loading", false);
      }
    }
  };

  onCleanup(() => {
    disposed = true;
    generation += 1;
    manifestAbort?.abort();
    boundariesAbort?.abort();
  });
  return { reloadManifest, reloadBoundaries };
}
