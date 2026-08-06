import { createMemo, createSignal, type Accessor } from "solid-js";
import type { AnalysisState, LocalityResult, PartyList } from "../../../domain/contracts";
import { sortTableRows, tableRows, type TableSortKey } from "../analysis";

export type TableSort = { key: TableSortKey; direction: "asc" | "desc" };

/** Reactive presentation data and local controls for the locality table. */
export function createTableView(dependencies: {
  state: Accessor<AnalysisState>;
  compareParty: Accessor<PartyList | undefined>;
  rows: Accessor<LocalityResult[]>;
  comparisonRows: Accessor<LocalityResult[]>;
}) {
  const [tableSearch, setTableSearch] = createSignal("");
  const [tableSort, setTableSort] = createSignal<TableSort>({ key: "share", direction: "desc" });
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
        dependencies.state().mode === "compare" && dependencies.compareParty()
          ? { rows: dependencies.comparisonRows(), partyId: dependencies.compareParty()!.id }
          : undefined,
      ),
      tableSort().key,
      tableSort().direction,
    ),
  );

  return { tableSearch, setTableSearch, tableSort, setTableSort, filteredTable };
}
