import { For, Show } from "solid-js";
import type { AnalysisState } from "../../../domain/contracts";
import { useI18n } from "../../../i18n/context";
import { tableRows, type TableSortKey } from "../analysis";

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
  const { t, plural, localityName, formatters } = useI18n();
  const numeric = (field: "turnoutMin" | "shareMin" | "minValidVotes", value: string) =>
    props.onState({ ...props.state, [field]: value === "" ? undefined : Number(value) });
  const sort = (key: TableSortKey) =>
    props.setSort({
      key,
      direction: props.sort.key === key && props.sort.direction === "desc" ? "asc" : "desc",
    });
  return (
    <section class="table-panel" data-testid="table-panel">
      <h2>{t("table.title")}</h2>
      <input
        name="table-locality-filter"
        aria-label={t("table.filterLabel")}
        value={props.tableSearch}
        onInput={(event) => props.setTableSearch(event.currentTarget.value)}
        placeholder={t("table.filterPlaceholder")}
        autocomplete="off"
      />
      <div class="filter-grid">
        <label>
          {t("table.minTurnout")}
          <input
            name="min-turnout"
            type="number"
            min="0"
            max="100"
            value={props.state.turnoutMin ?? ""}
            onInput={(event) => numeric("turnoutMin", event.currentTarget.value)}
            autocomplete="off"
          />
        </label>
        <label>
          {t("table.minShare")}
          <input
            name="min-share"
            type="number"
            min="0"
            max="100"
            value={props.state.shareMin ?? ""}
            onInput={(event) => numeric("shareMin", event.currentTarget.value)}
            autocomplete="off"
          />
        </label>
        <label>
          {t("table.minValid")}
          <input
            name="min-valid-ballots"
            type="number"
            min="0"
            value={props.state.minValidVotes ?? ""}
            onInput={(event) => numeric("minValidVotes", event.currentTarget.value)}
            autocomplete="off"
          />
        </label>
      </div>
      <p class="table-count">{plural("table.count", props.rows.length)}</p>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <SortHead label={t("table.locality")} field="name" sort={sort} />
              <SortHead label={t("table.votes")} field="votes" sort={sort} />
              <SortHead label={t("table.share")} field="share" sort={sort} />
              <SortHead label={t("table.turnout")} field="turnout" sort={sort} />
              <SortHead label={t("table.valid")} field="valid" sort={sort} />
              <SortHead label={t("table.rank")} field="rank" sort={sort} />
              <Show when={props.compareMode}>
                <SortHead label={t("table.delta")} field="delta" sort={sort} />
              </Show>
            </tr>
          </thead>
          <tbody>
            <For each={props.rows}>
              {(row) => (
                <tr>
                  <td>
                    <button
                      type="button"
                      title={localityName(row.locality)}
                      onClick={() => props.onSelect(row.locality.localityId)}
                    >
                      {localityName(row.locality)}
                    </button>
                  </td>
                  <td>{formatters().number.format(row.votes)}</td>
                  <td>{formatters().percent.format(row.share / 100)}</td>
                  <td>{formatters().percent.format(row.turnout / 100)}</td>
                  <td>{formatters().number.format(row.locality.valid)}</td>
                  <td>{row.locality.partyRanks[props.state.party] ?? "—"}</td>
                  <Show when={props.compareMode}>
                    <td>
                      {row.delta === undefined
                        ? t("table.noData")
                        : formatters().points.format(row.delta)}
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
