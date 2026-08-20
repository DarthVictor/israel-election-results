import { For, Show } from "solid-js";
import type { LocalityProperties, LocalityResult, PartyList } from "../../../domain/contracts";
import { useI18n } from "../../../i18n/context";
import { strongestLocality } from "../analysis";
import { ComparisonDetails } from "./ComparisonDetails";
import { InsightCard } from "./InsightCard";
import { LocalityDetails } from "./LocalityDetails";

export function ExplorePanel(props: {
  party?: PartyList;
  parties: PartyList[];
  rows: LocalityResult[];
  partyId: string;
  nationalShare: number;
  search: string;
  setSearch(value: string): void;
  matches: LocalityResult[];
  onSelect(localityId: number): void;
  selected?: LocalityResult;
  selectedComparison?: LocalityResult;
  /** A selected map area the chosen election reports no results for. */
  selectedWithoutResults?: LocalityProperties;
  compareParty?: PartyList;
  compareMode: boolean;
}) {
  const { t, partyName, localityName, formatters } = useI18n();
  return (
    <>
      <Show
        when={props.party}
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
          <h2>{partyName(props.party)}</h2>
          <div class="insight-grid">
            <InsightCard
              label={t("explore.nationalShare")}
              value={formatters().percent.format(props.nationalShare)}
            />
            <InsightCard
              label={t("explore.strongestLocality")}
              value={
                props.rows.length ? localityName(strongestLocality(props.rows, props.partyId)) : "—"
              }
            />
            <InsightCard
              label={t("explore.mappedLocalities")}
              value={formatters().number.format(
                props.rows.filter((row) => row.geography === "mappable").length,
              )}
            />
          </div>
        </section>
      </Show>
      <section class="search-section">
        <label for="locality-search">{t("explore.findLocality")}</label>
        <input
          id="locality-search"
          name="locality-search"
          data-testid="locality-search"
          value={props.search}
          onInput={(event) => props.setSearch(event.currentTarget.value)}
          placeholder={t("explore.searchPlaceholder")}
          autocomplete="off"
        />
        <Show when={props.matches.length > 0}>
          <ul class="search-results">
            <For each={props.matches}>
              {(item) => (
                <li>
                  <button
                    type="button"
                    data-testid={`locality-match-${item.localityId}`}
                    onClick={() => props.onSelect(item.localityId)}
                  >
                    {localityName(item)}
                  </button>
                </li>
              )}
            </For>
          </ul>
        </Show>
      </section>
      <Show
        when={props.selected ?? props.selectedComparison}
        fallback={
          <Show
            when={props.selectedWithoutResults}
            fallback={
              <section class="locality-panel empty-selection">
                <h2>{t("explore.selectLocality")}</h2>
                <p>{t("explore.selectLocalityHint")}</p>
              </section>
            }
          >
            {(area) => (
              <section
                class="locality-panel empty-selection"
                aria-live="polite"
                data-testid="selected-locality-without-results"
              >
                <p class="eyebrow">{t("details.selected")}</p>
                <h2>{localityName(area())}</h2>
                <p>{t("details.noResults")}</p>
              </section>
            )}
          </Show>
        }
      >
        {(selected) =>
          props.compareMode ? (
            <ComparisonDetails
              first={props.selected}
              second={props.selectedComparison}
              firstParty={props.party}
              secondParty={props.compareParty}
              partyId={props.partyId}
            />
          ) : (
            <LocalityDetails
              locality={selected()}
              partyId={props.partyId}
              parties={props.parties}
            />
          )
        }
      </Show>
    </>
  );
}
