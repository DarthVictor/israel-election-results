import { createSignal } from "solid-js";
import { useI18n } from "../../../i18n/context";
import { useElectionResults } from "../state/ElectionResultsContext";
import type { LocalityResultsModel } from "./create-locality-results-model";

export function ExportActions(props: { table: LocalityResultsModel }) {
  const { t } = useI18n();
  const { actions } = useElectionResults();
  const [status, setStatus] = createSignal("");
  return (
    <>
      <div class="action-row">
        <button
          type="button"
          onClick={() => void actions.copyLink().then(setStatus)}
          data-testid="copy-link"
        >
          {t("exports.copyLink")}
        </button>
        <button
          type="button"
          onClick={() => setStatus(actions.downloadCsv(props.table.statistics()))}
          data-testid="export-csv"
        >
          {t("exports.csv")}
        </button>
        <button
          type="button"
          onClick={() => void actions.downloadPng(props.table.statistics()).then(setStatus)}
          data-testid="export-png"
        >
          {t("exports.png")}
        </button>
      </div>
      <p class="sr-status" aria-live="polite">
        {status()}
      </p>
    </>
  );
}
