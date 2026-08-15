import { For, Show } from "solid-js";
import type { LocalityResult, PartyList } from "../../../domain/contracts";
import { useI18n } from "../../../i18n/context";
import { partyShare, rankedPartyBreakdown, turnout } from "../analysis";

export function LocalityDetails(props: {
  locality: LocalityResult;
  partyId: string;
  parties: PartyList[];
}) {
  const { t, plural, partyName, localityName, formatters } = useI18n();
  return (
    <section class="locality-panel" aria-live="polite" data-testid="selected-locality">
      <div class="panel-heading">
        <div>
          <p class="eyebrow">{t("details.selected")}</p>
          <h2>{localityName(props.locality)}</h2>
        </div>
        <Show when={props.partyId}>
          <span class="rank">
            {t("details.rank", { rank: props.locality.partyRanks[props.partyId] ?? "—" })}
          </span>
        </Show>
      </div>
      <Show when={props.partyId}>
        <div class="selected-result">
          <strong>
            {formatters().percent.format(partyShare(props.locality, props.partyId) / 100)}
          </strong>
          <span>{plural("details.votes", props.locality.partyVotes[props.partyId] ?? 0)}</span>
        </div>
      </Show>
      <dl class="stat-list">
        <div>
          <dt>{t("details.turnout")}</dt>
          <dd>{formatters().percent.format(turnout(props.locality) / 100)}</dd>
        </div>
        <div>
          <dt>{t("details.validBallots")}</dt>
          <dd>{formatters().number.format(props.locality.valid)}</dd>
        </div>
      </dl>
      <h3>{t("details.breakdown")}</h3>
      <ol class="party-breakdown" data-testid="party-breakdown">
        <For each={rankedPartyBreakdown(props.locality, props.parties)}>
          {(entry) => (
            <li>
              <span class="party-name" title={partyName(entry.party)}>
                {partyName(entry.party)}
              </span>
              <b>{formatters().percent.format(entry.share / 100)}</b>
            </li>
          )}
        </For>
      </ol>
    </section>
  );
}
