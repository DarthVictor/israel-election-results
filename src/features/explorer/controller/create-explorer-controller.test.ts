import { createRoot } from "solid-js";
import { describe, expect, it } from "vitest";
import type { ElectionManifest, ElectionResultsFile } from "../../../domain/contracts";
import type { ExplorerFeature } from "../topology";
import { createExplorerController, type ExplorerController } from "./create-explorer-controller";
import type { ExplorerControllerDependencies } from "./explorer-dependencies";

const manifest: ElectionManifest = {
  schemaVersion: 1,
  geometryUrl: "/data/localities.topo.json",
  elections: [
    {
      id: 24,
      date: "2021-03-23",
      label: "24th Knesset",
      sourceUrl: "https://example.test/24",
      sourceCsvUrl: "https://example.test/24.csv",
      dataUrl: "/data/elections/24.json",
      parties: [{ id: "YESH-ATID", nameHe: "יש עתיד", nameEn: "Yesh Atid" }],
      nationalTotals: { eligible: 1, voters: 1, valid: 1, invalid: 0 },
    },
    {
      id: 25,
      date: "2022-11-01",
      label: "25th Knesset",
      sourceUrl: "https://example.test/25",
      sourceCsvUrl: "https://example.test/25.csv",
      dataUrl: "/data/elections/25.json",
      parties: [{ id: "LIKUD", nameHe: "מחל", nameEn: "Likud" }],
      nationalTotals: { eligible: 1, voters: 1, valid: 1, invalid: 0 },
    },
  ],
};

const resultFor = (electionId: number): ElectionResultsFile => ({
  schemaVersion: 1,
  electionId,
  localities: [
    {
      localityId: 3000,
      nameHe: "ירושלים",
      nameEn: "Jerusalem",
      eligible: 10,
      voters: 8,
      valid: 7,
      invalid: 1,
      partyVotes: electionId === 25 ? { LIKUD: 5 } : { "YESH-ATID": 5 },
      partyRanks: electionId === 25 ? { LIKUD: 1 } : { "YESH-ATID": 1 },
      geography: "mappable",
      hasGeometry: true,
    },
  ],
  unmatchedLocalityIds: [],
  nonGeographicLocalityIds: [],
});

const geometryFeature: ExplorerFeature = {
  type: "Feature",
  properties: { localityId: 3000, nameHe: "ירושלים", nameEn: "Jerusalem" },
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
};

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((nextResolve, nextReject) => {
    resolve = nextResolve;
    reject = nextReject;
  });
  return { promise, resolve, reject };
}

function history(search = "?mode=explore&election=25") {
  const pushes: string[] = [];
  const replacements: string[] = [];
  let popState: (() => void) | undefined;

  return {
    pushes,
    replacements,
    readSearch: () => search,
    pathname: () => "/",
    href: () => `https://example.test/${search}`,
    push: (_state: unknown, url: string) => pushes.push(url),
    replace: (_state: unknown, url: string) => replacements.push(url),
    subscribe: (listener: () => void) => {
      popState = listener;
      return () => {
        popState = undefined;
      };
    },
    restore: (nextSearch: string) => {
      search = nextSearch;
      popState?.();
    },
  };
}

function harness(dependencies: ExplorerControllerDependencies): {
  controller: ExplorerController;
  dispose: () => void;
} {
  let controller!: ExplorerController;
  let dispose!: () => void;
  createRoot((nextDispose) => {
    dispose = nextDispose;
    controller = createExplorerController(dependencies);
  });
  return { controller, dispose };
}

const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

describe("Explorer controller", () => {
  it("restores initial party-less Explore from the browser URL", async () => {
    const browser = history();
    const { controller, dispose } = harness({
      data: {
        loadManifest: async () => manifest,
        loadGeometry: async () => ({}),
        loadElection: async (url) => resultFor(url.includes("25") ? 25 : 24),
        topologyToFeatures: () => [],
      },
      history: browser,
    });

    await controller.load();

    expect(controller.state()).toEqual({ mode: "explore", election: 25, party: "" });
    dispose();
  });

  it("writes a shareable URL when mode selection requires a Party List", async () => {
    const browser = history();
    const { controller, dispose } = harness({
      data: {
        loadManifest: async () => manifest,
        loadGeometry: async () => ({}),
        loadElection: async () => resultFor(25),
        topologyToFeatures: () => [],
      },
      history: browser,
    });
    await controller.load();

    controller.chooseMode("table");

    expect(controller.state()).toEqual({ mode: "table", election: 25, party: "LIKUD" });
    expect(browser.pushes).toEqual(["/?mode=table&election=25&party=LIKUD"]);
    dispose();
  });

  it("loads the result file for the active Election", async () => {
    const browser = history();
    const { controller, dispose } = harness({
      data: {
        loadManifest: async () => manifest,
        loadGeometry: async () => ({}),
        loadElection: async () => resultFor(25),
        topologyToFeatures: () => [],
      },
      history: browser,
    });

    await controller.load();
    await settle();

    expect(controller.rows()).toEqual(resultFor(25).localities);
    expect(controller.loadingResults()).toBe(false);
    dispose();
  });

  it("ignores a stale selected-Election response after selection changes", async () => {
    const browser = history();
    const pending25 = deferred<ElectionResultsFile>();
    const pending24 = deferred<ElectionResultsFile>();
    const { controller, dispose } = harness({
      data: {
        loadManifest: async () => manifest,
        loadGeometry: async () => ({}),
        loadElection: (url) => (url.includes("25") ? pending25.promise : pending24.promise),
        topologyToFeatures: () => [],
      },
      history: browser,
    });

    await controller.load();
    await settle();
    controller.chooseElection(24);
    await settle();
    pending25.resolve(resultFor(25));
    await settle();

    expect(controller.rows()).toEqual([]);
    pending24.resolve(resultFor(24));
    await settle();
    expect(controller.rows()).toEqual(resultFor(24).localities);
    dispose();
  });

  it("retries the active Election after a failed load", async () => {
    const browser = history();
    let attempts = 0;
    const { controller, dispose } = harness({
      data: {
        loadManifest: async () => manifest,
        loadGeometry: async () => ({}),
        loadElection: async () => {
          attempts += 1;
          if (attempts === 1) throw new Error("Temporary failure");
          return resultFor(25);
        },
        topologyToFeatures: () => [],
      },
      history: browser,
    });

    await controller.load();
    await settle();
    expect(controller.resultsError()).toBeInstanceOf(Error);

    controller.retry();
    await settle();

    expect(controller.rows()).toEqual(resultFor(25).localities);
    expect(attempts).toBe(2);
    dispose();
  });

  it("clears a geometry error after a retry succeeds", async () => {
    const browser = history();
    let geometryAttempts = 0;
    const { controller, dispose } = harness({
      data: {
        loadManifest: async () => manifest,
        loadGeometry: async () => {
          geometryAttempts += 1;
          if (geometryAttempts === 1) throw new Error("Temporary geometry failure");
          return { version: 2 };
        },
        loadElection: async () => resultFor(25),
        topologyToFeatures: () => [geometryFeature],
      },
      history: browser,
    });

    await controller.load();
    expect(controller.geometryError()).toBeInstanceOf(Error);

    await controller.load();

    expect(controller.geometryError()).toBeUndefined();
    expect(controller.geometry()).toEqual([geometryFeature]);
    expect(geometryAttempts).toBe(2);
    dispose();
  });

  it("aborts an overlapping manifest load and ignores the obsolete completion", async () => {
    const browser = history();
    const first = deferred<ElectionManifest>();
    const second = deferred<ElectionManifest>();
    const signals: AbortSignal[] = [];
    let calls = 0;
    const { controller, dispose } = harness({
      data: {
        loadManifest: (signal) => {
          if (signal) signals.push(signal);
          calls += 1;
          return calls === 1 ? first.promise : second.promise;
        },
        loadGeometry: async () => ({}),
        loadElection: async () => resultFor(25),
        topologyToFeatures: () => [],
      },
      history: browser,
    });

    const firstLoad = controller.load();
    await settle();
    const secondLoad = controller.load();
    expect(signals[0]?.aborted).toBe(true);

    second.resolve(manifest);
    await secondLoad;
    first.resolve({ ...manifest, elections: [manifest.elections[0]] });
    await firstLoad;

    expect(controller.manifest()?.elections.map((election) => election.id)).toEqual([24, 25]);
    dispose();
  });

  it("aborts in-flight geometry and ignores completion after disposal", async () => {
    const browser = history();
    const pendingGeometry = deferred<unknown>();
    let geometrySignal: AbortSignal | undefined;
    const { controller, dispose } = harness({
      data: {
        loadManifest: async () => manifest,
        loadGeometry: (_url, signal) => {
          geometrySignal = signal;
          return pendingGeometry.promise;
        },
        loadElection: async () => resultFor(25),
        topologyToFeatures: () => [geometryFeature],
      },
      history: browser,
    });

    const loading = controller.load();
    await settle();
    dispose();
    expect(geometrySignal?.aborted).toBe(true);

    pendingGeometry.resolve({ version: 2 });
    await loading;
    expect(controller.geometry()).toEqual([]);
    expect(controller.geometryError()).toBeUndefined();
  });

  it("ignores stale comparison responses after the comparison selection changes", async () => {
    const browser = history();
    const staleComparison = deferred<ElectionResultsFile>();
    const { controller, dispose } = harness({
      data: {
        loadManifest: async () => manifest,
        loadGeometry: async () => ({}),
        loadElection: (url) =>
          url.includes("24") ? staleComparison.promise : Promise.resolve(resultFor(25)),
        topologyToFeatures: () => [],
      },
      history: browser,
    });

    await controller.load();
    await settle();
    controller.writeState({
      mode: "compare",
      election: 25,
      party: "LIKUD",
      compareElection: 24,
      compareParty: "YESH-ATID",
    });
    await settle();
    controller.writeState({
      mode: "compare",
      election: 25,
      party: "LIKUD",
      compareElection: 25,
      compareParty: "LIKUD",
    });
    await settle();
    staleComparison.resolve(resultFor(24));
    await settle();

    expect(controller.comparisonRows()).toEqual(resultFor(25).localities);
    dispose();
  });

  it("unsubscribes the browser-history listener during disposal", async () => {
    const browser = history();
    const { controller, dispose } = harness({
      data: {
        loadManifest: async () => manifest,
        loadGeometry: async () => ({}),
        loadElection: async () => resultFor(25),
        topologyToFeatures: () => [],
      },
      history: browser,
    });

    await controller.load();
    dispose();
    browser.restore("?mode=explore&election=24");

    expect(controller.state().election).toBe(25);
  });
});
