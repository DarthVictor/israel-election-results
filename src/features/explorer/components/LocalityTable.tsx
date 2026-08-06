import { For, Show } from "solid-js";
import type { AnalysisState } from "../../../domain/contracts";
import { displayLocality, tableRows, type TableSortKey } from "../analysis";

const number = new Intl.NumberFormat("en");

export function LocalityTable(props: {
  rows: ReturnType<typeof tableRows>;
  state: AnalysisState;
  tableSearch: string;
  setTableSearch(value: string): void;
  sort: { key: TableSortKey; direction: "asc" | "desc" };
  setSort(sort: { key: TableSortKey; direction: "asc" | "desc" }): void;
  onState(next: AnalysisState): void;
  onSelect(localityId: number): void;
  compareMode: boolean;
}) {
  const numeric = (field: "turnoutMin" | "shareMin" | "minValidVotes", value: string) =>
    props.onState({ ...props.state, [field]: value === "" ? undefined : Number(value) });
  const sort = (key: TableSortKey) =>
    props.setSort({
      key,
      direction: props.sort.key === key && props.sort.direction === "desc" ? "asc" : "desc",
    });
  return (
    <section class="table-panel" data-testid="table-panel">
      <h2>Locality table</h2>
      <input
        aria-label="Filter table localities"
        value={props.tableSearch}
        onInput={(event) => props.setTableSearch(event.currentTarget.value)}
        placeholder="Filter locality name"
      />
      <div class="filter-grid">
        <label>
          Min turnout
          <input
            type="number"
            min="0"
            max="100"
            value={props.state.turnoutMin ?? ""}
            onInput={(event) => numeric("turnoutMin", event.currentTarget.value)}
          />
        </label>
        <label>
          Min share
          <input
            type="number"
            min="0"
            max="100"
            value={props.state.shareMin ?? ""}
            onInput={(event) => numeric("shareMin", event.currentTarget.value)}
          />
        </label>
        <label>
          Min valid ballots
          <input
            type="number"
            min="0"
            value={props.state.minValidVotes ?? ""}
            onInput={(event) => numeric("minValidVotes", event.currentTarget.value)}
          />
        </label>
      </div>
      <p class="table-count">{number.format(props.rows.length)} mapped localities</p>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <SortHead label="Locality" field="name" sort={sort} />
              <SortHead label="Votes" field="votes" sort={sort} />
              <SortHead label="Share" field="share" sort={sort} />
              <SortHead label="Turnout" field="turnout" sort={sort} />
              <SortHead label="Valid" field="valid" sort={sort} />
              <SortHead label="Rank" field="rank" sort={sort} />
              <Show when={props.compareMode}>
                <SortHead label="Δ pp" field="delta" sort={sort} />
              </Show>
            </tr>
          </thead>
          <tbody>
            <For each={props.rows}>
              {(row) => (
                <tr>
                  <td>
                    <button type="button" onClick={() => props.onSelect(row.locality.localityId)}>
                      {displayLocality(row.locality)}
                    </button>
                  </td>
                  <td>{number.format(row.votes)}</td>
                  <td>{row.share.toFixed(1)}%</td>
                  <td>{row.turnout.toFixed(1)}%</td>
                  <td>{number.format(row.locality.valid)}</td>
                  <td>{row.locality.partyRanks[props.state.party] ?? "—"}</td>
                  <Show when={props.compareMode}>
                    <td>
                      {row.delta === undefined
                        ? "No data"
                        : `${row.delta >= 0 ? "+" : ""}${row.delta.toFixed(1)}`}
                    </td>
                  </Show>
                </tr>
              )}
            </For>
          </tbody>
        </table>
      </div>
    </section>
  );
}

function SortHead(props: { label: string; field: TableSortKey; sort(field: TableSortKey): void }) {
  return (
    <th scope="col">
      <button type="button" onClick={() => props.sort(props.field)}>
        {props.label}
      </button>
    </th>
  );
}
