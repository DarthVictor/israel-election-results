import { For, Show } from "solid-js";
import type {
  AnalysisMode,
  AnalysisState,
  ElectionManifest,
  ElectionMetadata,
  PartyList,
} from "../../../domain/contracts";
import { displayParty } from "../analysis";
import { ErrorPanel } from "./StatusPanels";

const modes: { id: AnalysisMode; label: string }[] = [
  { id: "explore", label: "Explore" },
  { id: "compare", label: "Compare" },
  { id: "table", label: "Table" },
];

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
  return (
    <>
      <nav class="mode-tabs" aria-label="Analysis view">
        <For each={modes}>
          {(item) => (
            <button
              type="button"
              classList={{ active: props.state.mode === item.id }}
              aria-current={props.state.mode === item.id ? "page" : undefined}
              onClick={() => props.onMode(item.id)}
              data-testid={`mode-${item.id}`}
            >
              {item.label}
            </button>
          )}
        </For>
      </nav>
      <div class="control-stack">
        <label>
          Election
          <select
            data-testid="election-select"
            value={props.state.election}
            onInput={(event) => props.onElection(Number(event.currentTarget.value))}
          >
            <For each={props.manifest?.elections}>
              {(item) => (
                <option value={item.id}>
                  {item.label} · {item.date}
                </option>
              )}
            </For>
          </select>
        </label>
        <label>
          Party
          <select
            data-testid="party-select"
            value={props.state.party}
            onInput={(event) => props.onParty(event.currentTarget.value)}
          >
            <option value="">Choose a party</option>
            <For each={props.election?.parties}>
              {(item) => <option value={item.id}>{displayParty(item)}</option>}
            </For>
          </select>
        </label>
      </div>
      <Show when={props.state.mode === "compare"}>
        <section class="comparison-controls" data-testid="comparison-controls">
          <p class="mode-label">Independent comparison</p>
          <p class="comparison-note">
            A and B are separate historical lists. This comparison does not claim party continuity.
          </p>
          <div class="control-stack">
            <label>
              Election B
              <select
                data-testid="compare-election-select"
                value={props.compareElection?.id}
                onInput={(event) => props.onComparisonElection(Number(event.currentTarget.value))}
              >
                <For each={props.manifest?.elections}>
                  {(item) => <option value={item.id}>{item.label}</option>}
                </For>
              </select>
            </label>
            <label>
              List B
              <select
                data-testid="compare-party-select"
                value={props.compareParty?.id}
                onInput={(event) => props.onComparisonParty(event.currentTarget.value)}
              >
                <For each={props.compareElection?.parties}>
                  {(item) => <option value={item.id}>{displayParty(item)}</option>}
                </For>
              </select>
            </label>
          </div>
          <Show when={props.loadingComparison}>
            <p class="status-message" role="status">
              Loading comparison data…
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
