import { For, Show } from "solid-js";
import type { AnalysisMode } from "../../../domain/contracts";
import { useI18n } from "../../../i18n/context";
import { useElectionResults } from "../state/ElectionResultsContext";
import { ComparisonControls } from "./ComparisonControls";

const MODES: AnalysisMode[] = ["explore", "compare", "table"];

export function AnalysisControls() {
  const { t, plural, partyName, shortPartyName, formatDate } = useI18n();
  const { state, selectors, actions } = useElectionResults();
  const electionLabel = (id: number) => plural("controls.knesset", id, "ordinal");

  return (
    <>
      <nav class="mode-tabs" aria-label={t("modes.label")}>
        <For each={MODES}>
          {(mode) => (
            <button
              type="button"
              classList={{ active: state.analysis.mode === mode }}
              aria-current={state.analysis.mode === mode ? "page" : undefined}
              onClick={() => actions.chooseMode(mode)}
              data-testid={`mode-${mode}`}
            >
              {t(`modes.${mode}`)}
            </button>
          )}
        </For>
      </nav>
      <div class="control-stack">
        <label>
          {t("controls.election")}
          <select
            data-testid="election-select"
            value={state.analysis.election}
            onInput={(event) => actions.chooseElection(Number(event.currentTarget.value))}
          >
            <For each={state.manifest?.elections}>
              {(item) => (
                <option value={item.id}>
                  {electionLabel(item.id)} · {formatDate(item.date)}
                </option>
              )}
            </For>
          </select>
        </label>
        <label>
          {t("controls.party")}
          <select
            data-testid="party-select"
            value={state.analysis.party}
            onInput={(event) => actions.chooseParty(event.currentTarget.value)}
          >
            <option value="">{t("controls.chooseParty")}</option>
            <For each={selectors.election()?.parties}>
              {(item) => (
                <option value={item.id} title={partyName(item)}>
                  {shortPartyName(item)}
                </option>
              )}
            </For>
          </select>
        </label>
      </div>
      <Show when={state.analysis.mode === "compare"}>
        <ComparisonControls />
      </Show>
    </>
  );
}
