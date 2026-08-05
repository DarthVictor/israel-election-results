/** Versioned contract for generated, static election data. */
export const MANIFEST_SCHEMA_VERSION = 1 as const;

export type ElectionId = number;

export type AnalysisMode = "explore" | "compare" | "table";

export type VoteTotals = {
  eligible: number;
  voters: number;
  valid: number;
  invalid: number;
};

/** A party list is intentionally scoped to one election. */
export type PartyList = {
  id: string;
  nameHe: string;
  nameEn: string | null;
};

export type ElectionMetadata = {
  id: ElectionId;
  date: string;
  label: string;
  /** Official Central Elections Committee results page. */
  sourceUrl: string;
  /** Official locality-level CSV used to build this election's static data. */
  sourceCsvUrl: string;
  dataUrl: string;
  parties: PartyList[];
  nationalTotals: VoteTotals;
};

export type ElectionManifest = {
  schemaVersion: typeof MANIFEST_SCHEMA_VERSION;
  elections: ElectionMetadata[];
  geometryUrl: string;
};

export type LocalityResult = VoteTotals & {
  localityId: number;
  nameHe: string;
  nameEn: string | null;
  partyVotes: Record<string, number>;
  /** One-based rank by list vote share among mappable localities. */
  partyRanks: Record<string, number>;
  /** Distinguishes mapped localities from geometry gaps and national-only records. */
  geography: "mappable" | "unmatchedBoundary" | "nonGeographic";
  hasGeometry: boolean;
};

/** One independently cacheable static data file for an election. */
export type ElectionResultsFile = {
  schemaVersion: typeof MANIFEST_SCHEMA_VERSION;
  electionId: ElectionId;
  localities: LocalityResult[];
  /** Locality IDs which are election records but have no boundary in the supplied map. */
  unmatchedLocalityIds: number[];
  /** National-only records, such as external envelopes, retained in national totals. */
  nonGeographicLocalityIds: number[];
};

export type AnalysisState = {
  mode: AnalysisMode;
  election: ElectionId;
  party: string;
  locality?: number;
  compareElection?: ElectionId;
  compareParty?: string;
  turnoutMin?: number;
  shareMin?: number;
  minValidVotes?: number;
};
