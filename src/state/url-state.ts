import type { AnalysisMode, AnalysisState, ElectionManifest, PartyList } from "../domain/contracts";
import { DEFAULT_ANALYSIS_STATE, DEFAULT_ELECTION_ID, DEFAULT_PARTY_ID } from "./analysis-state";

const VALID_MODES: readonly AnalysisMode[] = ["explore", "compare", "table"];

function parseInteger(value: string | null): number | undefined {
  if (value === null || !/^-?\d+$/.test(value)) {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : undefined;
}

function parseMinimum(value: string | null, max?: number): number | undefined {
  if (value === null || value.trim() === "") {
    return undefined;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0 || (max !== undefined && parsed > max)) {
    return undefined;
  }

  return parsed;
}

function defaultElection(manifest: ElectionManifest) {
  return (
    manifest.elections.find((election) => election.id === DEFAULT_ELECTION_ID) ??
    manifest.elections.at(-1) ??
    null
  );
}

function electionFor(value: string | null, manifest: ElectionManifest) {
  const id = parseInteger(value);
  return manifest.elections.find((election) => election.id === id) ?? defaultElection(manifest);
}

function partyFor(value: string | null, parties: PartyList[], allowNoSelection = false) {
  if (allowNoSelection && (value === null || value.trim() === "")) return null;

  const normalizedValue = value?.trim().toLocaleLowerCase();
  const matchingParty = parties.find((party) => party.id.toLocaleLowerCase() === normalizedValue);

  return matchingParty ?? parties[0] ?? null;
}

function comparisonElectionFor(value: string | null, manifest: ElectionManifest) {
  return value === null ? null : electionFor(value, manifest);
}

/**
 * Converts a URL query string to a safe application state. Explore starts with
 * no party selected; an invalid explicit party falls back to the first list.
 */
export function parseAnalysisState(search: string, manifest: ElectionManifest): AnalysisState {
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  const election = electionFor(params.get("election"), manifest);

  if (!election) {
    return { ...DEFAULT_ANALYSIS_STATE };
  }

  const requestedMode = VALID_MODES.includes(params.get("mode") as AnalysisMode)
    ? (params.get("mode") as AnalysisMode)
    : "explore";
  const party = partyFor(params.get("party"), election.parties, requestedMode === "explore");
  const compareElection =
    comparisonElectionFor(params.get("compareElection"), manifest) ??
    (requestedMode === "compare"
      ? (manifest.elections.find((item) => item.id !== election.id) ?? election)
      : null);
  const compareParty = compareElection
    ? partyFor(params.get("compareParty"), compareElection.parties)
    : null;
  const locality = parseInteger(params.get("locality"));
  const turnoutMin = parseMinimum(params.get("turnoutMin"), 100);
  const shareMin = parseMinimum(params.get("shareMin"), 100);
  const minValidVotes = parseMinimum(params.get("minValidVotes"));

  return {
    mode: requestedMode,
    election: election.id,
    party: party?.id ?? DEFAULT_PARTY_ID,
    ...(locality !== undefined && locality > 0 ? { locality } : {}),
    ...(compareElection ? { compareElection: compareElection.id } : {}),
    ...(compareParty ? { compareParty: compareParty.id } : {}),
    ...(turnoutMin !== undefined ? { turnoutMin } : {}),
    ...(shareMin !== undefined ? { shareMin } : {}),
    ...(minValidVotes !== undefined ? { minValidVotes } : {}),
  };
}

/** Serializes only explicit analysis choices, producing stable shareable URLs. */
export function serializeAnalysisState(state: AnalysisState): string {
  const params = new URLSearchParams({
    mode: state.mode,
    election: String(state.election),
  });

  if (state.party) params.set("party", state.party);
  if (state.locality !== undefined) params.set("locality", String(state.locality));
  if (state.compareElection !== undefined)
    params.set("compareElection", String(state.compareElection));
  if (state.compareParty !== undefined) params.set("compareParty", state.compareParty);
  if (state.turnoutMin !== undefined) params.set("turnoutMin", String(state.turnoutMin));
  if (state.shareMin !== undefined) params.set("shareMin", String(state.shareMin));
  if (state.minValidVotes !== undefined) params.set("minValidVotes", String(state.minValidVotes));

  return params.toString();
}
