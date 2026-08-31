import { createEffect, createSignal, onMount, Show } from "solid-js";
import { createThemeStorage } from "../../app/create-browser-dependencies";
import { type AppTheme, readStoredTheme } from "../../app/theme";
import { useI18n } from "../../i18n/context";
import { ElectionMapPanel } from "./components/ElectionMapPanel";
import { ResultsSidebar } from "./components/ResultsSidebar";
import { SiteFooter } from "./components/SiteFooter";
import { SiteHeader } from "./components/SiteHeader";
import { ErrorPanel, LoadingScreen } from "./components/StatusPanels";
import { useElectionResults } from "./state/ElectionResultsContext";

export function ElectionResultsPage() {
  const { t } = useI18n();
  const { state, actions } = useElectionResults();
  const [theme, setTheme] = createSignal<AppTheme>(readStoredTheme(createThemeStorage()));

  createEffect(() => {
    const nextTheme = theme();
    document.documentElement.dataset.theme = nextTheme;
    document.documentElement.style.colorScheme = nextTheme;
    createThemeStorage().write(nextTheme);
  });

  onMount(() => void actions.reloadManifest());

  return (
    <div class="app-shell" data-theme={theme()}>
      <a class="skip-link" href="#election-results-content">
        {t("app.skipLink")}
      </a>
      <SiteHeader theme={theme()} onTheme={setTheme} />
      <main id="election-results-content" tabindex={-1}>
        <Show
          when={!state.requests.manifest.loading}
          fallback={<LoadingScreen label={t("app.preparing")} />}
        >
          <Show
            when={!state.requests.manifest.error}
            fallback={
              <ErrorPanel
                error={state.requests.manifest.error}
                onRetry={() => void actions.reloadManifest()}
              />
            }
          >
            <section class="results-layout">
              <ResultsSidebar />
              <ElectionMapPanel theme={theme()} />
            </section>
          </Show>
        </Show>
      </main>
      <SiteFooter />
    </div>
  );
}
