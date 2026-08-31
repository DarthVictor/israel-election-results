import { useI18n } from "../../../i18n/context";
import { useElectionResults } from "../state/ElectionResultsContext";
import type { LocalityResultsModel } from "./create-locality-results-model";
import { LocalityResultsFilters } from "./LocalityResultsFilters";
import { LocalityStatisticsTable } from "./LocalityStatisticsTable";

export function LocalityResultsTable(props: { model: LocalityResultsModel }) {
  const { t, plural } = useI18n();
  const { state, selectors, actions } = useElectionResults();
  return (
    <section class="table-panel" data-testid="table-panel">
      <h2>{t("table.title")}</h2>
      <input
        name="table-locality-filter"
        aria-label={t("table.filterLabel")}
        value={props.model.controls.query}
        onInput={(event) => props.model.setQuery(event.currentTarget.value)}
        placeholder={t("table.filterPlaceholder")}
        autocomplete="off"
      />
      <LocalityResultsFilters analysis={state.analysis} write={actions.write} />
      <p class="table-count">{plural("table.count", props.model.statistics().length)}</p>
      <LocalityStatisticsTable
        statistics={props.model.statistics()}
        partyId={state.analysis.party}
        compareMode={selectors.comparisonReady()}
        onSort={props.model.toggleSort}
        onSelect={actions.chooseLocality}
      />
    </section>
  );
}
