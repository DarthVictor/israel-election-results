import type { Translate } from "../../../i18n/translate";
import { mergeComparisonLocalities } from "../sort-locality-statistics";
import type { ElectionResultsState } from "./election-results-store.types";

export function createElectionResultsSelectors(state: ElectionResultsState, t: Translate) {
  const election = () =>
    state.manifest?.elections.find((item) => item.id === state.analysis.election);
  const party = () => election()?.parties.find((item) => item.id === state.analysis.party);
  const comparisonElection = () => {
    const elections = state.manifest?.elections ?? [];
    return (
      elections.find((item) => item.id === state.analysis.compareElection) ??
      elections.find((item) => item.id !== state.analysis.election) ??
      election()
    );
  };
  const comparisonParty = () =>
    comparisonElection()?.parties.find((item) => item.id === state.analysis.compareParty) ??
    comparisonElection()?.parties[0];
  const results = () =>
    state.results?.electionId === state.analysis.election ? state.results : undefined;
  const comparisonResults = () =>
    state.comparisonResults?.electionId === comparisonElection()?.id
      ? state.comparisonResults
      : undefined;
  const localities = () => results()?.localities ?? [];
  const comparisonLocalities = () => comparisonResults()?.localities ?? [];
  const comparisonReady = () =>
    state.analysis.mode === "compare" && !!comparisonResults() && !!comparisonParty();
  const searchableLocalities = () =>
    comparisonReady()
      ? mergeComparisonLocalities(localities(), comparisonLocalities())
      : localities();
  const selectedLocality = () =>
    localities().find((item) => item.localityId === state.analysis.locality);
  const selectedComparisonLocality = () =>
    comparisonLocalities().find((item) => item.localityId === state.analysis.locality);
  const nationalShare = () => {
    const valid = election()?.nationalTotals.valid ?? 0;
    if (!valid) return 0;
    const votes = localities().reduce(
      (sum, locality) => sum + (locality.partyVotes[state.analysis.party] ?? 0),
      0,
    );
    return votes / valid;
  };
  const mapReady = () =>
    !state.requests.boundaries.error &&
    state.boundaries.length > 0 &&
    !!results() &&
    (state.analysis.mode !== "compare" || comparisonReady());
  const mapUnavailableMessage = () => {
    if (state.analysis.mode === "compare" && state.requests.comparison.error) {
      return t("map.comparisonError");
    }
    if (state.analysis.mode === "compare" && state.requests.comparison.loading) {
      return t("map.comparisonLoading");
    }
    return state.requests.results.error ? t("map.resultsError") : t("map.boundariesLoading");
  };
  return {
    election,
    party,
    comparisonElection,
    comparisonParty,
    results,
    comparisonResults,
    localities,
    comparisonLocalities,
    comparisonReady,
    searchableLocalities,
    selectedLocality,
    selectedComparisonLocality,
    nationalShare,
    mapReady,
    mapUnavailableMessage,
  };
}
