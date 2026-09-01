import { useI18n } from "../../../i18n/context";
import { useElectionResults } from "../state/ElectionResultsContext";

export function SiteFooter() {
  const { t } = useI18n();
  const { selectors } = useElectionResults();
  return (
    <footer class="site-footer" role="contentinfo">
      <span>
        {t("footer.finalResults")}{" "}
        <a href={selectors.election()?.sourceUrl ?? "https://votes25.bechirot.gov.il/"}>
          {t("footer.committee")}
        </a>{" "}
        ·{" "}
        <a
          href={
            selectors.election()?.sourceCsvUrl ?? "https://media25.bechirot.gov.il/files/expc.csv"
          }
        >
          {t("footer.localityCsv")}
        </a>
      </span>
      <span>
        {t("footer.map")} <a href="https://leafletjs.com/">Leaflet</a> {t("footer.and")}{" "}
        <a href="https://openfreemap.org/">OpenFreeMap</a>
      </span>
    </footer>
  );
}
