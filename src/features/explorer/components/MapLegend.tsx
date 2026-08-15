import { useI18n } from "../../../i18n/context";

export function MapLegend(props: { compareMode: boolean }) {
  const { t } = useI18n();
  return (
    <div class="map-legend" aria-label={t("legend.label")}>
      <span>{props.compareMode ? t("legend.comparisonTitle") : t("legend.shareTitle")}</span>
      <div classList={{ "legend-scale": true, comparison: props.compareMode }}>
        <i />
        <i />
        <i />
        <i />
        <i />
      </div>
      <div class="legend-labels">
        <span>{props.compareMode ? t("legend.negative") : t("legend.lower")}</span>
        <span>{props.compareMode ? t("legend.zero") : ""}</span>
        <span>{props.compareMode ? t("legend.positive") : t("legend.higher")}</span>
      </div>
      <small>{t("legend.noData")}</small>
    </div>
  );
}
