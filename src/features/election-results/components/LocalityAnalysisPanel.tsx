import { Show } from "solid-js";
import { useI18n } from "../../../i18n/context";
import { strongestLocality } from "../metrics";
import { useElectionResults } from "../state/ElectionResultsContext";
import { ComparisonDetails } from "./ComparisonDetails";
import { InsightCard } from "./InsightCard";
import { LocalityDetails } from "./LocalityDetails";
import { LocalitySearch } from "./LocalitySearch";

export function LocalityAnalysisPanel() {
  const i18n = useI18n();
  const { t, partyName, localityName, formatters } = i18n;
  const { state, selectors } = useElectionResults();

  return (
    <>
      <Show
        when={selectors.party()}
        fallback={
          <section class="insight-section">
            <div class="empty-party-state" data-testid="no-party-selected">
              <h2>{t("explore.chooseParty")}</h2>
              <p>{t("explore.choosePartyHint")}</p>
            </div>
          </section>
        }
      >
        <section class="insight-section">
          <h2>{partyName(selectors.party())}</h2>
          <div class="insight-grid">
            <InsightCard
              label={t("explore.nationalShare")}
              value={formatters().percent.format(selectors.nationalShare())}
            />
            <InsightCard
              label={t("explore.strongestLocality")}
              value={
                selectors.localities().length
                  ? localityName(strongestLocality(selectors.localities(), state.analysis.party))
                  : "—"
              }
            />
            <InsightCard
              label={t("explore.mappedLocalities")}
              value={formatters().number.format(
                selectors.localities().filter((item) => item.geography === "mappable").length,
              )}
            />
          </div>
        </section>
      </Show>
      <LocalitySearch />
      <Show
        when={selectors.selectedLocality() ?? selectors.selectedComparisonLocality()}
        fallback={
          <section class="locality-panel empty-selection">
            <h2>{t("explore.selectLocality")}</h2>
            <p>{t("explore.selectLocalityHint")}</p>
          </section>
        }
      >
        {(selected) =>
          state.analysis.mode === "compare" ? (
            <ComparisonDetails
              first={selectors.selectedLocality()}
              second={selectors.selectedComparisonLocality()}
              firstParty={selectors.party()}
              secondParty={selectors.comparisonParty()}
              partyId={state.analysis.party}
            />
          ) : (
            <LocalityDetails
              locality={selected()}
              partyId={state.analysis.party}
              parties={selectors.election()?.parties ?? []}
            />
          )
        }
      </Show>
    </>
  );
}
