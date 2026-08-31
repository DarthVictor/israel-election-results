import { onCleanup } from "solid-js";
import {
  chooseAnalysisElection,
  chooseAnalysisLocality,
  chooseAnalysisMode,
  chooseAnalysisParty,
  chooseComparisonElection,
  chooseComparisonParty,
} from "../../../domain/analysis/selection";
import type { AnalysisMode, AnalysisState, ElectionManifest } from "../../../domain/contracts";
import { parseAnalysisState, serializeAnalysisState } from "../../../state/url-state";
import type {
  ElectionResultsHistory,
  ElectionState,
  SetElectionState,
} from "./election-results-store.types";

export function createSelectionActions(
  state: ElectionState,
  setState: SetElectionState,
  history: ElectionResultsHistory,
) {
  const write = (analysis: AnalysisState, replace = false) => {
    const normalized = normalize(analysis, state.manifest);
    setState("analysis", normalized);
    const url = `${history.pathname()}?${serializeAnalysisState(normalized)}`;
    history[replace ? "replace" : "push"](normalized, url);
  };
  const restore = () => {
    if (state.manifest)
      setState("analysis", parseAnalysisState(history.readSearch(), state.manifest));
  };
  const update = (
    change: (analysis: AnalysisState, manifest: ElectionManifest) => AnalysisState,
  ) => {
    if (state.manifest) write(change(state.analysis, state.manifest));
  };
  const chooseMode = (mode: AnalysisMode) =>
    update((analysis, manifest) => chooseAnalysisMode(analysis, mode, manifest));
  const chooseElection = (electionId: number) =>
    update((analysis, manifest) => chooseAnalysisElection(analysis, electionId, manifest));
  const chooseParty = (partyId: string) =>
    update((analysis, manifest) => chooseAnalysisParty(analysis, partyId, manifest));
  const chooseLocality = (localityId: number) =>
    update((analysis, manifest) => chooseAnalysisLocality(analysis, localityId, manifest));
  const chooseComparisonElectionAction = (electionId: number) =>
    update((analysis, manifest) => chooseComparisonElection(analysis, electionId, manifest));
  const chooseComparisonPartyAction = (partyId: string) =>
    update((analysis, manifest) => chooseComparisonParty(analysis, partyId, manifest));

  onCleanup(history.subscribe(restore));
  return {
    write,
    restore,
    chooseMode,
    chooseElection,
    chooseParty,
    chooseLocality,
    chooseComparisonElection: chooseComparisonElectionAction,
    chooseComparisonParty: chooseComparisonPartyAction,
  };
}

function normalize(analysis: AnalysisState, manifest?: ElectionManifest) {
  return manifest ? parseAnalysisState(`?${serializeAnalysisState(analysis)}`, manifest) : analysis;
}
