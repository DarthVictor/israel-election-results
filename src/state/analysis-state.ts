import type { AnalysisState } from "../domain/contracts";

export const DEFAULT_ELECTION_ID = 25;
export const DEFAULT_PARTY_ID = "";

export const DEFAULT_ANALYSIS_STATE: AnalysisState = {
  mode: "explore",
  election: DEFAULT_ELECTION_ID,
  party: DEFAULT_PARTY_ID,
};
