import type { AnalysisMode, AnalysisState, ElectionManifest } from "../contracts";
import {
  comparisonElectionFor,
  electionFor,
  firstPartyId,
  hasParty,
  partyForMode,
  withoutLocality,
} from "./selection-helpers";

/**
 * Chooses an analysis mode while ensuring modes that require a Party List have
 * one and Comparison Analysis has an independent B selection.
 */
export function chooseAnalysisMode(
  state: AnalysisState,
  mode: AnalysisMode,
  manifest: ElectionManifest,
): AnalysisState {
  const election = electionFor(manifest, state.election);
  const selection: AnalysisState = {
    ...state,
    mode,
    party: partyForMode(election, state.party, mode),
  };

  if (mode !== "compare") return selection;

  const comparisonElection = comparisonElectionFor(selection, manifest);
  return {
    ...selection,
    ...(comparisonElection ? { compareElection: comparisonElection.id } : {}),
    ...(comparisonElection && hasParty(comparisonElection, selection.compareParty ?? "")
      ? { compareParty: selection.compareParty }
      : { compareParty: firstPartyId(comparisonElection) }),
  };
}

/** Changes Election A, retaining its Party List only when the new Election contains that list. */
export function chooseAnalysisElection(
  state: AnalysisState,
  electionId: number,
  manifest: ElectionManifest,
): AnalysisState {
  const election = electionFor(manifest, electionId);
  if (!election) return state;

  return {
    ...withoutLocality(state),
    election: election.id,
    party: partyForMode(election, state.party, state.mode),
  };
}

/** Selects Party List A and clears a locality selection made under the prior list. */
export function chooseAnalysisParty(
  state: AnalysisState,
  partyId: string,
  manifest: ElectionManifest,
): AnalysisState {
  const election = electionFor(manifest, state.election);
  if (!election) return state;

  return {
    ...withoutLocality(state),
    party: partyForMode(election, partyId, state.mode),
  };
}

/** Selects a locality in the active Election without changing the remaining analysis choices. */
export function chooseAnalysisLocality(
  state: AnalysisState,
  localityId: number,
  manifest: ElectionManifest,
): AnalysisState {
  if (!electionFor(manifest, state.election)) return state;
  return { ...state, locality: localityId };
}

/** Changes Election B and selects that Election's first Party List B. */
export function chooseComparisonElection(
  state: AnalysisState,
  electionId: number,
  manifest: ElectionManifest,
): AnalysisState {
  const election = electionFor(manifest, electionId);
  if (!election) return state;

  return {
    ...state,
    compareElection: election.id,
    compareParty: firstPartyId(election),
  };
}

/** Selects Party List B within the active independent Election B. */
export function chooseComparisonParty(
  state: AnalysisState,
  partyId: string,
  manifest: ElectionManifest,
): AnalysisState {
  const election = comparisonElectionFor(state, manifest);
  if (!election) return state;

  return {
    ...state,
    compareElection: election.id,
    compareParty: hasParty(election, partyId) ? partyId : firstPartyId(election),
  };
}
