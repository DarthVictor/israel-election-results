import type { Accessor } from "solid-js";
import type { AnalysisMode, AnalysisState } from "../../../domain/contracts";

/** Public selection controls shared by the Explorer facade and selection implementation. */
export interface ExplorerSelection {
  state: Accessor<AnalysisState>;
  writeState(next: AnalysisState, replace?: boolean): void;
  chooseMode(mode: AnalysisMode): void;
  chooseElection(electionId: number): void;
  chooseParty(partyId: string): void;
  chooseLocality(localityId: number): void;
  chooseComparisonElection(electionId: number): void;
  chooseComparisonParty(partyId: string): void;
}
