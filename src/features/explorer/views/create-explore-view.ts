import { createMemo, createSignal, type Accessor } from "solid-js";
import type {
  AnalysisState,
  ElectionMetadata,
  ElectionResultsFile,
  PartyList,
} from "../../../domain/contracts";
import type { I18n } from "../../../i18n/create-i18n";
import { comparisonLocalities } from "../analysis";

/** Reactive presentation data for the Explore surface, independent of UI components. */
export function createExploreView(dependencies: {
  i18n: I18n;
  state: Accessor<AnalysisState>;
  election: Accessor<ElectionMetadata | undefined>;
  compareElection: Accessor<ElectionMetadata | undefined>;
  compareParty: Accessor<PartyList | undefined>;
  results: Accessor<ElectionResultsFile | undefined>;
  comparisonResults: Accessor<ElectionResultsFile | undefined>;
}) {
  const [search, setSearch] = createSignal("");
  const currentResults = createMemo(() =>
    dependencies.results()?.electionId === dependencies.state().election
      ? dependencies.results()
      : undefined,
  );
  const currentComparison = createMemo(() =>
    dependencies.comparisonResults()?.electionId === dependencies.compareElection()?.id
      ? dependencies.comparisonResults()
      : undefined,
  );
  const rows = createMemo(() => currentResults()?.localities ?? []);
  const comparisonRows = createMemo(() => currentComparison()?.localities ?? []);
  const comparisonReady = createMemo(
    () =>
      dependencies.state().mode === "compare" &&
      !!currentComparison() &&
      !!dependencies.compareParty(),
  );
  const selectableRows = createMemo(() =>
    comparisonReady() ? comparisonLocalities(rows(), comparisonRows()) : rows(),
  );
  const selected = createMemo(() =>
    rows().find((row) => row.localityId === dependencies.state().locality),
  );
  const selectedComparison = createMemo(() =>
    comparisonRows().find((row) => row.localityId === dependencies.state().locality),
  );
  const queryMatches = createMemo(() => {
    // Case folding follows the interface language rather than the host environment, so the
    // same query behaves identically for every reader of a given locale.
    const fold = dependencies.i18n.fold;
    const needle = fold(search().trim());
    return !needle
      ? []
      : selectableRows()
          .filter((row) => fold(`${row.nameHe} ${row.nameEn ?? ""}`).includes(needle))
          .slice(0, 8);
  });
  const nationalShare = createMemo(() => {
    const valid = dependencies.election()?.nationalTotals.valid ?? 0;
    const partyId = dependencies.state().party;
    return valid ? rows().reduce((sum, row) => sum + (row.partyVotes[partyId] ?? 0), 0) / valid : 0;
  });

  return {
    search,
    setSearch,
    currentResults,
    currentComparison,
    rows,
    comparisonRows,
    comparisonReady,
    selectableRows,
    selected,
    selectedComparison,
    queryMatches,
    nationalShare,
  };
}
