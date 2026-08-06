import { For, Show } from "solid-js";
import type { LocalityResult, PartyList } from "../../../domain/contracts";
import { displayLocality, partyShare, rankedPartyBreakdown, turnout } from "../analysis";

const percent = new Intl.NumberFormat("en", {
  style: "percent",
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});
const number = new Intl.NumberFormat("en");

export function LocalityDetails(props: {
  locality: LocalityResult;
  partyId: string;
  parties: PartyList[];
}) {
  return (
    <section class="locality-panel" aria-live="polite" data-testid="selected-locality">
      <div class="panel-heading">
        <div>
          <p class="eyebrow">Selected locality</p>
          <h2>{displayLocality(props.locality)}</h2>
        </div>
        <Show when={props.partyId}>
          <span class="rank">#{props.locality.partyRanks[props.partyId] ?? "—"} rank</span>
        </Show>
      </div>
      <Show when={props.partyId}>
        <div class="selected-result">
          <strong>{percent.format(partyShare(props.locality, props.partyId) / 100)}</strong>
          <span>
            {number.format(props.locality.partyVotes[props.partyId] ?? 0)} votes for selected party
          </span>
        </div>
      </Show>
      <dl class="stat-list">
        <div>
          <dt>Turnout</dt>
          <dd>{percent.format(turnout(props.locality) / 100)}</dd>
        </div>
        <div>
          <dt>Valid ballots</dt>
          <dd>{number.format(props.locality.valid)}</dd>
        </div>
      </dl>
      <h3>List breakdown</h3>
      <ol class="party-breakdown" data-testid="party-breakdown">
        <For each={rankedPartyBreakdown(props.locality, props.parties)}>
          {(entry) => (
            <li>
              <span
                class="party-name"
                title={[entry.party.nameEn, entry.party.nameHe].filter(Boolean).join(" · ")}
              >
                {[entry.party.nameEn, entry.party.nameHe].filter(Boolean).join(" · ")}
              </span>
              <b>{percent.format(entry.share / 100)}</b>
            </li>
          )}
        </For>
      </ol>
    </section>
  );
}
