import type { AnalysisMode, AnalysisState, ElectionManifest, ElectionMetadata } from "../contracts";

export function electionFor(manifest: ElectionManifest, electionId: number) {
  return manifest.elections.find((election) => election.id === electionId);
}

export function firstPartyId(election: ElectionMetadata | undefined) {
  return election?.parties[0]?.id ?? "";
}

export function hasParty(election: ElectionMetadata | undefined, partyId: string) {
  return election?.parties.some((party) => party.id === partyId) ?? false;
}

export function partyForMode(
  election: ElectionMetadata | undefined,
  partyId: string,
  mode: AnalysisMode,
) {
  if (hasParty(election, partyId)) return partyId;
  return mode === "explore" ? "" : firstPartyId(election);
}

export function withoutLocality(state: AnalysisState): AnalysisState {
  if (state.locality === undefined) return state;
  const selection = { ...state };
  delete selection.locality;
  return selection;
}

export function comparisonElectionFor(state: AnalysisState, manifest: ElectionManifest) {
  return (
    electionFor(manifest, state.compareElection ?? Number.NaN) ??
    manifest.elections.find((election) => election.id !== state.election) ??
    electionFor(manifest, state.election)
  );
}
