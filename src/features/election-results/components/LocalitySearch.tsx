import { createMemo, createSignal, For, Show } from "solid-js";
import { useI18n } from "../../../i18n/context";
import { useElectionResults } from "../state/ElectionResultsContext";

export function LocalitySearch() {
  const i18n = useI18n();
  const { selectors, actions } = useElectionResults();
  const [query, setQuery] = createSignal("");
  const matches = createMemo(() => {
    const needle = i18n.fold(query().trim());
    return !needle
      ? []
      : selectors
          .searchableLocalities()
          .filter((item) => i18n.fold(`${item.nameHe} ${item.nameEn ?? ""}`).includes(needle))
          .slice(0, 8);
  });
  const select = (localityId: number) => {
    actions.chooseLocality(localityId);
    setQuery("");
  };
  return (
    <section class="search-section">
      <label for="locality-search">{i18n.t("explore.findLocality")}</label>
      <input
        id="locality-search"
        name="locality-search"
        data-testid="locality-search"
        value={query()}
        onInput={(event) => setQuery(event.currentTarget.value)}
        placeholder={i18n.t("explore.searchPlaceholder")}
        autocomplete="off"
      />
      <Show when={matches().length > 0}>
        <ul class="search-results">
          <For each={matches()}>
            {(item) => (
              <li>
                <button
                  type="button"
                  data-testid={`locality-match-${item.localityId}`}
                  onClick={() => select(item.localityId)}
                >
                  {i18n.localityName(item)}
                </button>
              </li>
            )}
          </For>
        </ul>
      </Show>
    </section>
  );
}
