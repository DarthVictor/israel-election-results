import { Show } from "solid-js";
import type { LocalityResult, PartyList } from "../../../domain/contracts";
import { comparisonDelta, displayLocality, partyShare } from "../analysis";

const percent = new Intl.NumberFormat("en", {
  style: "percent",
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

export function ComparisonDetails(props: {
  first?: LocalityResult;
  second?: LocalityResult;
  firstParty?: PartyList;
  secondParty?: PartyList;
  partyId: string;
}) {
  const delta = () =>
    comparisonDelta(props.first, props.partyId, props.second, props.secondParty?.id ?? "");

  return (
    <section class="locality-panel" aria-live="polite" data-testid="selected-locality">
      <p class="eyebrow">Independent A / B locality comparison</p>
      <h2>{displayLocality(props.first ?? props.second)}</h2>
      <Show
        when={props.first && props.second}
        fallback={
          <p class="comparison-note">
            This locality is present in only one election, so a change cannot be calculated.
          </p>
        }
      >
        <div class="comparison-result">
          <div>
            <span>A · {props.firstParty?.nameEn ?? props.firstParty?.nameHe}</span>
            <strong>{percent.format(partyShare(props.first!, props.partyId) / 100)}</strong>
          </div>
          <div>
            <span>B · {props.secondParty?.nameEn ?? props.secondParty?.nameHe}</span>
            <strong>
              {percent.format(partyShare(props.second!, props.secondParty?.id ?? "") / 100)}
            </strong>
          </div>
          <div>
            <span>Change</span>
            <strong>
              {delta() === undefined
                ? "No data"
                : `${delta()! >= 0 ? "+" : ""}${delta()!.toFixed(1)} pp`}
            </strong>
          </div>
        </div>
      </Show>
    </section>
  );
}
