import { createRoot } from "solid-js";
import { describe, expect, it } from "vitest";
import type { ElectionManifest } from "../../../domain/contracts";
import type { ExplorerFeature } from "../topology";
import { createManifestGeometryLoader } from "./manifest-geometry-loader";

const firstManifest: ElectionManifest = {
  schemaVersion: 1,
  geometryUrl: "/first.topo.json",
  elections: [],
};
const secondManifest: ElectionManifest = {
  schemaVersion: 1,
  geometryUrl: "/second.topo.json",
  elections: [],
};
const feature = (nameEn: string): ExplorerFeature => ({
  type: "Feature",
  properties: { localityId: 3000, nameHe: "ירושלים", nameEn },
  geometry: {
    type: "Polygon",
    coordinates: [
      [
        [35, 31],
        [35, 31],
        [35, 31],
      ],
    ],
  },
});

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((nextResolve, nextReject) => {
    resolve = nextResolve;
    reject = nextReject;
  });
  return { promise, resolve, reject };
}

const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

describe("Manifest and geometry loader", () => {
  it("keeps the latest manifest and geometry when an overlapping load completes stale", async () => {
    const pendingManifest = [deferred<ElectionManifest>(), deferred<ElectionManifest>()];
    const pendingGeometry = [deferred<unknown>(), deferred<unknown>()];
    const geometrySignals: AbortSignal[] = [];
    let manifestCalls = 0;
    let geometryCalls = 0;
    let loader!: ReturnType<typeof createManifestGeometryLoader>;
    createRoot(() => {
      loader = createManifestGeometryLoader({
        repository: {
          loadManifest: () => pendingManifest[manifestCalls++]!.promise,
          loadGeometry: (_url, signal) => {
            if (signal) geometrySignals.push(signal);
            return pendingGeometry[geometryCalls++]!.promise;
          },
          topologyToFeatures: (raw) => [feature((raw as { name: string }).name)],
        },
        onManifestLoaded: () => undefined,
      });
    });

    const firstLoad = loader.reloadManifest();
    pendingManifest[0]!.resolve(firstManifest);
    await settle();
    const secondLoad = loader.reloadManifest();
    expect(geometrySignals[0]?.aborted).toBe(true);
    pendingManifest[1]!.resolve(secondManifest);
    await settle();
    pendingGeometry[1]!.resolve({ name: "second" });
    await settle();
    pendingGeometry[0]!.resolve({ name: "first" });
    await Promise.all([firstLoad, secondLoad]);

    expect(loader.manifest()).toEqual(secondManifest);
    expect(loader.geometry()).toEqual([feature("second")]);
  });

  it("clears a geometry error after targeted geometry retry succeeds", async () => {
    let manifestCalls = 0;
    let geometryCalls = 0;
    let loader!: ReturnType<typeof createManifestGeometryLoader>;
    createRoot(() => {
      loader = createManifestGeometryLoader({
        repository: {
          loadManifest: async () => {
            manifestCalls += 1;
            return firstManifest;
          },
          loadGeometry: async () => {
            geometryCalls += 1;
            if (geometryCalls === 1) throw new Error("Geometry temporarily unavailable");
            return { name: "recovered" };
          },
          topologyToFeatures: (raw) => [feature((raw as { name: string }).name)],
        },
        onManifestLoaded: () => undefined,
      });
    });

    await loader.reloadManifest();
    expect(loader.geometryError()).toBeInstanceOf(Error);
    await loader.reloadGeometry();

    expect(loader.geometryError()).toBeUndefined();
    expect(loader.geometry()).toEqual([feature("recovered")]);
    expect(manifestCalls).toBe(1);
    expect(geometryCalls).toBe(2);
  });

  it("ignores late geometry completion after disposal", async () => {
    const pendingGeometry = deferred<unknown>();
    let geometrySignal: AbortSignal | undefined;
    let dispose!: () => void;
    let loader!: ReturnType<typeof createManifestGeometryLoader>;
    createRoot((nextDispose) => {
      dispose = nextDispose;
      loader = createManifestGeometryLoader({
        repository: {
          loadManifest: async () => firstManifest,
          loadGeometry: (_url, signal) => {
            geometrySignal = signal;
            return pendingGeometry.promise;
          },
          topologyToFeatures: () => [feature("late")],
        },
        onManifestLoaded: () => undefined,
      });
    });

    const loading = loader.reloadManifest();
    await settle();
    dispose();
    expect(geometrySignal?.aborted).toBe(true);
    pendingGeometry.resolve({ name: "late" });
    await loading;

    expect(loader.geometry()).toEqual([]);
    expect(loader.geometryError()).toBeUndefined();
  });
});
