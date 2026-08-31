import { For, Show } from "solid-js";
import { useI18n } from "../../../i18n/context";
import type { LocalitySortKey, LocalityStatistic } from "../locality-statistics";

export function LocalityStatisticsTable(props: {
  statistics: readonly LocalityStatistic[];
  partyId: string;
  compareMode: boolean;
  onSort(key: LocalitySortKey): void;
  onSelect(localityId: number): void;
}) {
  const { t, localityName, formatters } = useI18n();
  const headings: [LocalitySortKey, string][] = [
    ["name", t("table.locality")],
    ["votes", t("table.votes")],
    ["share", t("table.share")],
    ["turnout", t("table.turnout")],
    ["valid", t("table.valid")],
    ["rank", t("table.rank")],
  ];
  return (
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <For each={headings}>
              {([key, label]) => <SortHeading label={label} field={key} onSort={props.onSort} />}
            </For>
            <Show when={props.compareMode}>
              <SortHeading label={t("table.delta")} field="delta" onSort={props.onSort} />
            </Show>
          </tr>
        </thead>
        <tbody>
          <For each={props.statistics}>
            {(item) => (
              <tr>
                <td>
                  <button
                    type="button"
                    title={localityName(item.locality)}
                    onClick={() => props.onSelect(item.locality.localityId)}
                  >
                    {localityName(item.locality)}
                  </button>
                </td>
                <td>{formatters().number.format(item.votes)}</td>
                <td>{formatters().percent.format(item.share / 100)}</td>
                <td>{formatters().percent.format(item.turnout / 100)}</td>
                <td>{formatters().number.format(item.locality.valid)}</td>
                <td>{item.locality.partyRanks[props.partyId] ?? "—"}</td>
                <Show when={props.compareMode}>
                  <td>
                    {item.delta === undefined
                      ? t("table.noData")
                      : formatters().points.format(item.delta)}
                  </td>
                </Show>
              </tr>
            )}
          </For>
        </tbody>
      </table>
    </div>
  );
}

function SortHeading(props: {
  label: string;
  field: LocalitySortKey;
  onSort(field: LocalitySortKey): void;
}) {
  return (
    <th scope="col">
      <button type="button" onClick={() => props.onSort(props.field)}>
        {props.label}
      </button>
    </th>
  );
}
