import { createMemo } from "solid-js";
import { createStore } from "solid-js/store";
import { useI18n } from "../../../i18n/context";
import { buildLocalityStatistics, type LocalitySortKey } from "../locality-statistics";
import { sortLocalityStatistics } from "../sort-locality-statistics";
import { useElectionResults } from "../state/ElectionResultsContext";

export function createLocalityResultsModel() {
  const i18n = useI18n();
  const { state, selectors } = useElectionResults();
  const [controls, setControls] = createStore({
    query: "",
    sort: { key: "share" as LocalitySortKey, direction: "desc" as "asc" | "desc" },
  });
  const statistics = createMemo(() => {
    const comparisonParty = selectors.comparisonParty();
    const comparison =
      selectors.comparisonReady() && comparisonParty
        ? {
            localities: selectors.comparisonLocalities(),
            partyId: comparisonParty.id,
          }
        : undefined;
    const items = buildLocalityStatistics(
      selectors.localities(),
      state.analysis.party,
      {
        query: controls.query,
        turnoutMin: state.analysis.turnoutMin,
        shareMin: state.analysis.shareMin,
        minValidVotes: state.analysis.minValidVotes,
      },
      i18n,
      comparison,
    );
    return sortLocalityStatistics(items, controls.sort.key, controls.sort.direction, i18n);
  });
  const setQuery = (query: string) => setControls("query", query);
  const toggleSort = (key: LocalitySortKey) => {
    setControls("sort", {
      key,
      direction: controls.sort.key === key && controls.sort.direction === "desc" ? "asc" : "desc",
    });
  };
  return { controls, statistics, setQuery, toggleSort };
}

export type LocalityResultsModel = ReturnType<typeof createLocalityResultsModel>;
