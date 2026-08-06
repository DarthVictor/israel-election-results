import type { AnalysisMode, AnalysisState, ElectionManifest, ElectionMetadata } from "../contracts";

function electionFor(manifest: ElectionManifest, electionId: number): ElectionMetadata | undefined {
  return manifest.elections.find((election) => election.id === electionId);
}

function firstPartyId(election: ElectionMetadata | undefined): string {
  return election?.parties[0]?.id ?? "";
}

function hasParty(election: ElectionMetadata | undefined, partyId: string): boolean {
  return election?.parties.some((party) => party.id === partyId) ?? false;
}

function partyForMode(
  election: ElectionMetadata | undefined,
  partyId: string,
  mode: AnalysisMode,
): string {
  if (hasParty(election, partyId)) return partyId;
  return mode === "explore" ? "" : firstPartyId(election);
}

function withoutLocality(state: AnalysisState): AnalysisState {
  if (state.locality === undefined) return state;
  const selection = { ...state };
  delete selection.locality;
  return selection;
}

function comparisonElectionFor(
  state: AnalysisState,
  manifest: ElectionManifest,
): ElectionMetadata | undefined {
  return (
    electionFor(manifest, state.compareElection ?? Number.NaN) ??
    manifest.elections.find((election) => election.id !== state.election) ??
    electionFor(manifest, state.election)
  );
}

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
