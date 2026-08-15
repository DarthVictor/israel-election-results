import { For, Show } from "solid-js";
import type {
  AnalysisMode,
  AnalysisState,
  ElectionManifest,
  ElectionMetadata,
  PartyList,
} from "../../../domain/contracts";
import { useI18n } from "../../../i18n/context";
import { ErrorPanel } from "./StatusPanels";

/** Ballot-order tabs. Labels are read per render so a locale switch re-translates them. */
const MODES: AnalysisMode[] = ["explore", "compare", "table"];

export function AnalysisControls(props: {
  state: AnalysisState;
  manifest?: ElectionManifest;
  election?: ElectionMetadata;
  compareElection?: ElectionMetadata;
  compareParty?: PartyList;
  loadingComparison: boolean;
  comparisonError: unknown;
  onRetryComparison(): void;
  onMode(mode: AnalysisMode): void;
  onElection(electionId: number): void;
  onParty(partyId: string): void;
  onComparisonElection(electionId: number): void;
  onComparisonParty(partyId: string): void;
}) {
  const { t, plural, partyName, shortPartyName, formatDate } = useI18n();
  // The manifest label is a fixed English string, so the Knesset number drives the text
  // instead — ordinal plural rules give 21st/22nd/23rd where English needs them.
  const electionLabel = (id: number) => plural("controls.knesset", id, "ordinal");

  return (
    <>
      <nav class="mode-tabs" aria-label={t("modes.label")}>
        <For each={MODES}>
          {(mode) => (
            <button
              type="button"
              classList={{ active: props.state.mode === mode }}
              aria-current={props.state.mode === mode ? "page" : undefined}
              onClick={() => props.onMode(mode)}
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
            value={props.state.election}
            onInput={(event) => props.onElection(Number(event.currentTarget.value))}
          >
            <For each={props.manifest?.elections}>
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
            value={props.state.party}
            onInput={(event) => props.onParty(event.currentTarget.value)}
          >
            <option value="">{t("controls.chooseParty")}</option>
            <For each={props.election?.parties}>
              {(item) => (
                // Only the reader's own language here: the ballot names run to sixty
                // characters, and a native select cannot lay out the pairing legibly. The
                // official name stays one hover away, and in full everywhere else.
                <option value={item.id} title={partyName(item)}>
                  {shortPartyName(item)}
                </option>
              )}
            </For>
          </select>
        </label>
      </div>
      <Show when={props.state.mode === "compare"}>
        <section class="comparison-controls" data-testid="comparison-controls">
          <p class="mode-label">{t("controls.comparisonTitle")}</p>
          <p class="comparison-note">{t("controls.comparisonNote")}</p>
          <div class="control-stack">
            <label>
              {t("controls.electionB")}
              <select
                data-testid="compare-election-select"
                value={props.compareElection?.id}
                onInput={(event) => props.onComparisonElection(Number(event.currentTarget.value))}
              >
                <For each={props.manifest?.elections}>
                  {(item) => <option value={item.id}>{electionLabel(item.id)}</option>}
                </For>
              </select>
            </label>
            <label>
              {t("controls.listB")}
              <select
                data-testid="compare-party-select"
                value={props.compareParty?.id}
                onInput={(event) => props.onComparisonParty(event.currentTarget.value)}
              >
                <For each={props.compareElection?.parties}>
                  {(item) => (
                    <option value={item.id} title={partyName(item)}>
                      {shortPartyName(item)}
                    </option>
                  )}
                </For>
              </select>
            </label>
          </div>
          <Show when={props.loadingComparison}>
            <p class="status-message" role="status">
              {t("controls.loadingComparison")}
            </p>
          </Show>
          <Show when={props.comparisonError}>
            <ErrorPanel compact error={props.comparisonError} onRetry={props.onRetryComparison} />
          </Show>
        </section>
      </Show>
    </>
  );
}
