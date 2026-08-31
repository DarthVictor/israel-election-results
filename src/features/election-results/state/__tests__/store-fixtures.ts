import { createRoot } from "solid-js";
import type { ElectionManifest, ElectionResultsFile } from "../../../../domain/contracts";
import { createStaticI18n } from "../../../../i18n/create-i18n";
import {
  createElectionResultsStore,
  type ElectionResultsStore,
} from "../create-election-results-store";
import type { ElectionResultsDependencies } from "../election-results-store.types";

export const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

export function storeHarness(dependencies: ElectionResultsDependencies) {
  let store: ElectionResultsStore | undefined;
  let dispose: () => void = () => undefined;
  createRoot((nextDispose) => {
    dispose = nextDispose;
    store = createElectionResultsStore(dependencies);
  });
  if (!store) throw new Error("Store was not created");
  return { store, dispose };
}

export const manifest: ElectionManifest = {
  schemaVersion: 2,
  geometryUrl: "/data/localities.topo.json",
  elections: [
    {
      id: 24,
      date: "2021-03-23",
      label: "24th Knesset",
      sourceUrl: "https://example.test/24",
      sourceCsvUrl: "https://example.test/24.csv",
      dataUrl: "/data/elections/24.json",
      parties: [{ id: "YESH-ATID", nameHe: "יש עתיד", nameEn: "Yesh Atid", nameRu: null }],
      nationalTotals: { eligible: 1, voters: 1, valid: 1, invalid: 0 },
    },
    {
      id: 25,
      date: "2022-11-01",
      label: "25th Knesset",
      sourceUrl: "https://example.test/25",
      sourceCsvUrl: "https://example.test/25.csv",
      dataUrl: "/data/elections/25.json",
      parties: [{ id: "LIKUD", nameHe: "מחל", nameEn: "Likud", nameRu: null }],
      nationalTotals: { eligible: 1, voters: 1, valid: 1, invalid: 0 },
    },
  ],
};

export const resultFor = (electionId: number): ElectionResultsFile => ({
  schemaVersion: 2,
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

export function dependencies() {
  const pushedUrls: string[] = [];
  const value: ElectionResultsDependencies = {
    i18n: createStaticI18n("en"),
    repository: {
      loadManifest: async () => manifest,
      loadGeometry: async () => ({}),
      loadElection: async (url) => resultFor(url.includes("24") ? 24 : 25),
      topologyToBoundaries: () => [],
    },
    history: {
      readSearch: () => "?mode=explore&election=25",
      pathname: () => "/",
      href: () => "https://example.test/?mode=explore&election=25",
      push: (_state, url) => pushedUrls.push(url),
      replace: () => undefined,
      subscribe: () => () => undefined,
    },
  };
  return { value, pushedUrls };
}
