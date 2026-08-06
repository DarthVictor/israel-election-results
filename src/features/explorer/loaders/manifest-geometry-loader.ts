import { createSignal, onCleanup } from "solid-js";
import type { ElectionManifest } from "../../../domain/contracts";
import type { ExplorerFeature } from "../topology";

const isAbortError = (error: unknown) => error instanceof Error && error.name === "AbortError";

export function createManifestGeometryLoader(dependencies: {
  repository: {
    loadManifest(signal?: AbortSignal): Promise<ElectionManifest>;
    loadGeometry(url: string, signal?: AbortSignal): Promise<unknown>;
    topologyToFeatures(rawTopology: unknown): ExplorerFeature[];
  };
  onManifestLoaded(): void;
}) {
  const [manifest, setManifest] = createSignal<ElectionManifest>();
  const [geometry, setGeometry] = createSignal<ExplorerFeature[]>([]);
  const [manifestError, setManifestError] = createSignal<unknown>();
  const [geometryError, setGeometryError] = createSignal<unknown>();
  const [loadingManifest, setLoadingManifest] = createSignal(true);
  let generation = 0;
  let manifestAbort: AbortController | undefined;
  let geometryAbort: AbortController | undefined;
  let disposed = false;

  const reloadGeometry = async () => {
    const currentManifest = manifest();
    if (!currentManifest) return;
    geometryAbort?.abort();
    const activeGeneration = generation;
    const abort = new AbortController();
    geometryAbort = abort;
    setGeometryError(undefined);
    try {
      const raw = await dependencies.repository.loadGeometry(
        currentManifest.geometryUrl,
        abort.signal,
      );
      if (!disposed && activeGeneration === generation && geometryAbort === abort)
        setGeometry(dependencies.repository.topologyToFeatures(raw));
    } catch (error) {
      if (
        !disposed &&
        activeGeneration === generation &&
        geometryAbort === abort &&
        !isAbortError(error)
      )
        setGeometryError(error);
    } finally {
      if (geometryAbort === abort) geometryAbort = undefined;
    }
  };
  const reloadManifest = async () => {
    manifestAbort?.abort();
    geometryAbort?.abort();
    const activeGeneration = ++generation;
    const abort = new AbortController();
    manifestAbort = abort;
    setLoadingManifest(true);
    setManifestError(undefined);
    setGeometryError(undefined);
    try {
      const loaded = await dependencies.repository.loadManifest(abort.signal);
      if (disposed || activeGeneration !== generation) return;
      setManifest(loaded);
      dependencies.onManifestLoaded();
      setLoadingManifest(false);
      await reloadGeometry();
    } catch (error) {
      if (!disposed && activeGeneration === generation && !isAbortError(error))
        setManifestError(error);
    } finally {
      if (manifestAbort === abort) manifestAbort = undefined;
      if (!disposed && activeGeneration === generation) setLoadingManifest(false);
    }
  };
  onCleanup(() => {
    disposed = true;
    generation += 1;
    manifestAbort?.abort();
    geometryAbort?.abort();
  });
  return {
    manifest,
    geometry,
    manifestError,
    geometryError,
    loadingManifest,
    reloadManifest,
    reloadGeometry,
  };
}
