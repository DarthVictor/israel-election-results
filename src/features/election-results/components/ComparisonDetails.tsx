import { Show } from "solid-js";
import type { LocalityResult, PartyList } from "../../../domain/contracts";
import { useI18n } from "../../../i18n/context";
import { comparisonDelta, partyShare } from "../metrics";

export function ComparisonDetails(props: {
  first?: LocalityResult;
  second?: LocalityResult;
  firstParty?: PartyList;
  secondParty?: PartyList;
  partyId: string;
}) {
  const { t, partyName, localityName, formatters } = useI18n();
  const comparison = () => {
    if (!props.first || !props.second) return undefined;
    return {
      first: props.first,
      second: props.second,
      delta: comparisonDelta(props.first, props.partyId, props.second, props.secondParty?.id ?? ""),
    };
  };
  const formatDelta = (value: number | undefined) =>
    value === undefined
      ? t("comparison.noData")
      : `${formatters().points.format(value)} ${t("units.points")}`;

  return (
    <section class="locality-panel" aria-live="polite" data-testid="selected-locality">
      <p class="eyebrow">{t("comparison.title")}</p>
      <h2>{localityName(props.first ?? props.second)}</h2>
      <Show
        when={comparison()}
        fallback={<p class="comparison-note">{t("comparison.singleElection")}</p>}
      >
        {(result) => (
          <div class="comparison-result">
            <div>
              <span>
                {t("comparison.first")} · {partyName(props.firstParty)}
              </span>
              <strong>
                {formatters().percent.format(partyShare(result().first, props.partyId) / 100)}
              </strong>
            </div>
            <div>
              <span>
                {t("comparison.second")} · {partyName(props.secondParty)}
              </span>
              <strong>
                {formatters().percent.format(
                  partyShare(result().second, props.secondParty?.id ?? "") / 100,
                )}
              </strong>
            </div>
            <div>
              <span>{t("comparison.change")}</span>
              <strong>{formatDelta(result().delta)}</strong>
            </div>
          </div>
        )}
      </Show>
    </section>
  );
}
