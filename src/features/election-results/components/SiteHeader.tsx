import type { AppTheme } from "../../../app/theme";
import { useI18n } from "../../../i18n/context";
import { useElectionResults } from "../state/ElectionResultsContext";
import { LocaleSwitcher } from "./LocaleSwitcher";
import { ThemeSwitcher } from "./ThemeSwitcher";

export function SiteHeader(props: { theme: AppTheme; onTheme(theme: AppTheme): void }) {
  const { t } = useI18n();
  const { selectors } = useElectionResults();
  return (
    <header class="site-header">
      <div>
        <p class="eyebrow">{t("app.eyebrow")}</p>
        <h1>{t("app.title")}</h1>
      </div>
      <div class="header-tools">
        <div class="preference-toggles">
          <LocaleSwitcher />
          <ThemeSwitcher theme={props.theme} onTheme={props.onTheme} />
        </div>
        <nav class="source-links" aria-label={t("header.sources")}>
          <a
            href={selectors.election()?.sourceUrl ?? "https://votes25.bechirot.gov.il/"}
            target="_blank"
            rel="noreferrer"
          >
            {t("header.officialResults")}
          </a>
          <a
            href={
              selectors.election()?.sourceCsvUrl ?? "https://media25.bechirot.gov.il/files/expc.csv"
            }
            target="_blank"
            rel="noreferrer"
          >
            {t("header.downloadCsv")}
          </a>
        </nav>
      </div>
    </header>
  );
}
