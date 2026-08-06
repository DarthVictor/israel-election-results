import { For, Show } from "solid-js";
import type { LocalityResult, PartyList } from "../../../domain/contracts";
import { displayLocality, strongestLocality } from "../analysis";
import { ComparisonDetails } from "./ComparisonDetails";
import { InsightCard } from "./InsightCard";
import { LocalityDetails } from "./LocalityDetails";

const percent = new Intl.NumberFormat("en", {
  style: "percent",
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});
const number = new Intl.NumberFormat("en");

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
  compareParty?: PartyList;
  compareMode: boolean;
}) {
  return (
    <>
      <Show
        when={props.party}
        fallback={
          <section class="insight-section">
            <div class="empty-party-state" data-testid="no-party-selected">
              <h2>Choose a party</h2>
              <p>Select a party to color the map and see its results across localities.</p>
            </div>
          </section>
        }
      >
        <section class="insight-section">
          <h2>{props.party?.nameEn ?? props.party?.nameHe}</h2>
          <div class="insight-grid">
            <InsightCard label="National share" value={percent.format(props.nationalShare)} />
            <InsightCard
              label="Strongest locality"
              value={
                props.rows.length
                  ? displayLocality(strongestLocality(props.rows, props.partyId))
                  : "—"
              }
            />
            <InsightCard
              label="Mapped localities"
              value={number.format(props.rows.filter((row) => row.geography === "mappable").length)}
            />
          </div>
        </section>
      </Show>
      <section class="search-section">
        <label for="locality-search">Find a locality</label>
        <input
          id="locality-search"
          name="locality-search"
          data-testid="locality-search"
          value={props.search}
          onInput={(event) => props.setSearch(event.currentTarget.value)}
          placeholder="Search in Hebrew or English"
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
                    {displayLocality(item)}
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
          <section class="locality-panel empty-selection">
            <h2>Select a locality</h2>
            <p>Choose an area on the map or search by name.</p>
          </section>
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
