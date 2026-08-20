import { Show } from "solid-js";
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
      {/* The map now draws only localities the chosen Election reports, so a gray area is
          left over from comparison alone: a locality one of the two Elections never listed. */}
      <Show when={props.compareMode}>
        <small>{t("legend.noData")}</small>
      </Show>
    </div>
  );
}
