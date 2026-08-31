import { For, Show } from "solid-js";
import { useI18n } from "../../../i18n/context";
import { useElectionResults } from "../state/ElectionResultsContext";
import { ErrorPanel } from "./StatusPanels";

export function ComparisonControls() {
  const { t, plural, partyName, shortPartyName } = useI18n();
  const { state, selectors, actions } = useElectionResults();
  const electionLabel = (id: number) => plural("controls.knesset", id, "ordinal");
  return (
    <section class="comparison-controls" data-testid="comparison-controls">
      <p class="mode-label">{t("controls.comparisonTitle")}</p>
      <p class="comparison-note">{t("controls.comparisonNote")}</p>
      <div class="control-stack">
        <label>
          {t("controls.electionB")}
          <select
            data-testid="compare-election-select"
            value={selectors.comparisonElection()?.id}
            onInput={(event) => actions.chooseComparisonElection(Number(event.currentTarget.value))}
          >
            <For each={state.manifest?.elections}>
              {(item) => <option value={item.id}>{electionLabel(item.id)}</option>}
            </For>
          </select>
        </label>
        <label>
          {t("controls.listB")}
          <select
            data-testid="compare-party-select"
            value={selectors.comparisonParty()?.id}
            onInput={(event) => actions.chooseComparisonParty(event.currentTarget.value)}
          >
            <For each={selectors.comparisonElection()?.parties}>
              {(item) => (
                <option value={item.id} title={partyName(item)}>
                  {shortPartyName(item)}
                </option>
              )}
            </For>
          </select>
        </label>
      </div>
      <Show when={state.requests.comparison.loading}>
        <p class="status-message" role="status">
          {t("controls.loadingComparison")}
        </p>
      </Show>
      <Show when={state.requests.comparison.error}>
        <ErrorPanel
          compact
          error={state.requests.comparison.error}
          onRetry={actions.reloadComparison}
        />
      </Show>
    </section>
  );
}
