import { createMemo, createSignal, onCleanup, untrack, type Accessor } from "solid-js";
import type {
  AnalysisMode,
  AnalysisState,
  ElectionManifest,
  ElectionMetadata,
  PartyList,
} from "../../../domain/contracts";
import {
  chooseAnalysisElection,
  chooseAnalysisLocality,
  chooseAnalysisMode,
  chooseAnalysisParty,
  chooseComparisonElection,
  chooseComparisonParty,
} from "../../../domain/explorer/selection";
import { DEFAULT_ANALYSIS_STATE } from "../../../state/analysis-state";
import { parseAnalysisState, serializeAnalysisState } from "../../../state/url-state";
import type { AnalysisSelectionHistory } from "./analysis-selection-dependencies";
import type { ExplorerSelection } from "./analysis-selection.types";

export type AnalysisSelection = ExplorerSelection & {
  election: Accessor<ElectionMetadata | undefined>;
  party: Accessor<PartyList | undefined>;
  compareElection: Accessor<ElectionMetadata | undefined>;
  compareParty: Accessor<PartyList | undefined>;
  restore(): void;
};

export function createAnalysisSelection(dependencies: {
  manifest: Accessor<ElectionManifest | undefined>;
  history: AnalysisSelectionHistory;
}): AnalysisSelection {
  const [state, setState] = createSignal<AnalysisState>(DEFAULT_ANALYSIS_STATE);
  const election = createMemo(() =>
    dependencies.manifest()?.elections.find((item) => item.id === state().election),
  );
  const party = createMemo(() => election()?.parties.find((item) => item.id === state().party));
  const compareElection = createMemo(() => {
    const elections = dependencies.manifest()?.elections ?? [];
    return (
      elections.find((item) => item.id === state().compareElection) ??
      elections.find((item) => item.id !== state().election) ??
      election()
    );
  });
  const compareParty = createMemo(
    () =>
      compareElection()?.parties.find((item) => item.id === state().compareParty) ??
      compareElection()?.parties[0],
  );

  const restore = () => {
    const manifest = untrack(dependencies.manifest);
    if (manifest) setState(parseAnalysisState(dependencies.history.readSearch(), manifest));
  };
  const writeState = (next: AnalysisState, replace = false) => {
    const manifest = dependencies.manifest();
    const normalized = manifest
      ? parseAnalysisState(`?${serializeAnalysisState(next)}`, manifest)
      : next;
    setState(normalized);
    const url = `${dependencies.history.pathname()}?${serializeAnalysisState(normalized)}`;
    dependencies.history[replace ? "replace" : "push"](normalized, url);
  };
  const chooseMode = (mode: AnalysisMode) => {
    const manifest = dependencies.manifest();
    if (manifest) writeState(chooseAnalysisMode(state(), mode, manifest));
  };
  const chooseElection = (electionId: number) => {
    const manifest = dependencies.manifest();
    if (manifest) writeState(chooseAnalysisElection(state(), electionId, manifest));
  };
  const chooseParty = (partyId: string) => {
    const manifest = dependencies.manifest();
    if (manifest) writeState(chooseAnalysisParty(state(), partyId, manifest));
  };
  const chooseLocality = (localityId: number) => {
    const manifest = dependencies.manifest();
    if (manifest) writeState(chooseAnalysisLocality(state(), localityId, manifest));
  };
  const chooseComparisonElectionAction = (electionId: number) => {
    const manifest = dependencies.manifest();
    if (manifest) writeState(chooseComparisonElection(state(), electionId, manifest));
  };
  const chooseComparisonPartyAction = (partyId: string) => {
    const manifest = dependencies.manifest();
    if (manifest) writeState(chooseComparisonParty(state(), partyId, manifest));
  };

  onCleanup(dependencies.history.subscribe(restore));

  return {
    state,
    election,
    party,
    compareElection,
    compareParty,
    restore,
    writeState,
    chooseMode,
    chooseElection,
    chooseParty,
    chooseLocality,
    chooseComparisonElection: chooseComparisonElectionAction,
    chooseComparisonParty: chooseComparisonPartyAction,
  };
}
