import { useI18n } from "../../../i18n/context";

export function ExportActions(props: { onCopy(): void; onCsv(): void; onPng(): void }) {
  const { t } = useI18n();
  return (
    <div class="action-row">
      <button type="button" onClick={() => props.onCopy()} data-testid="copy-link">
        {t("exports.copyLink")}
      </button>
      <button type="button" onClick={() => props.onCsv()} data-testid="export-csv">
        {t("exports.csv")}
      </button>
      <button type="button" onClick={() => props.onPng()} data-testid="export-png">
        {t("exports.png")}
      </button>
    </div>
  );
}
