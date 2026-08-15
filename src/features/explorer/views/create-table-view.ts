import { createMemo, createSignal, type Accessor } from "solid-js";
import type { AnalysisState, LocalityResult, PartyList } from "../../../domain/contracts";
import type { I18n } from "../../../i18n/create-i18n";
import { sortTableRows, tableRows, type TableSortKey, type TextPolicy } from "../analysis";

export type TableSort = { key: TableSortKey; direction: "asc" | "desc" };

/** Reactive presentation data and local controls for the locality table. */
export function createTableView(dependencies: {
  i18n: I18n;
  state: Accessor<AnalysisState>;
  compareParty: Accessor<PartyList | undefined>;
  rows: Accessor<LocalityResult[]>;
  comparisonRows: Accessor<LocalityResult[]>;
}) {
  const [tableSearch, setTableSearch] = createSignal("");
  const [tableSort, setTableSort] = createSignal<TableSort>({ key: "share", direction: "desc" });
  // Reading through the accessors keeps the memo subscribed to the locale, so switching
  // language re-folds the filter and re-collates the name column.
  const text = (): TextPolicy => ({
    fold: dependencies.i18n.fold,
    compare: dependencies.i18n.compare,
    localityName: dependencies.i18n.localityName,
  });
  const filteredTable = createMemo(() =>
    sortTableRows(
      tableRows(
        dependencies.rows(),
        dependencies.state().party,
        {
          query: tableSearch(),
          turnoutMin: dependencies.state().turnoutMin,
          shareMin: dependencies.state().shareMin,
          minValidVotes: dependencies.state().minValidVotes,
        },
        text(),
        dependencies.state().mode === "compare" && dependencies.compareParty()
          ? { rows: dependencies.comparisonRows(), partyId: dependencies.compareParty()!.id }
          : undefined,
      ),
      tableSort().key,
      tableSort().direction,
      text(),
    ),
  );

  return { tableSearch, setTableSearch, tableSort, setTableSort, filteredTable };
}
