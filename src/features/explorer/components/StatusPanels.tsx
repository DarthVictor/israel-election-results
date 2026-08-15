import { Show, type JSX } from "solid-js";
import { useI18n } from "../../../i18n/context";
import { DataError } from "../data";
import type { Translate } from "../../../i18n/translate";

/**
 * Data-layer failures arrive as codes rather than sentences, so the message is chosen here,
 * in the active language, instead of being frozen in English where the error was thrown.
 */
const errorText = (error: unknown, t: Translate) => {
  if (error instanceof DataError) return t(error.key, error.args);
  return error instanceof Error ? error.message : t("status.unknownError");
};

export function LoadingScreen(props: { label: string }) {
  return (
    <div class="loading-screen" role="status">
      {props.label}…
    </div>
  );
}

export function ErrorPanel(props: { error: unknown; onRetry(): void; compact?: boolean }) {
  const { t } = useI18n();
  return (
    <section
      class={props.compact ? "error-panel compact" : "error-panel"}
      role="alert"
      data-testid="load-error"
    >
      <h2>{t("status.loadFailed")}</h2>
      <p>{errorText(props.error, t)}</p>
      <button type="button" onClick={() => props.onRetry()} data-testid="retry-load">
        {t("status.retry")}
      </button>
    </section>
  );
}

export function ResultsStatus(props: {
  loading: boolean;
  error: unknown;
  onRetry(): void;
  children: JSX.Element;
}) {
  const { t } = useI18n();
  return (
    <Show
      when={!props.loading}
      fallback={
        <p class="status-message" role="status">
          {t("status.loadingResults")}
        </p>
      }
    >
      <Show
        when={!props.error}
        fallback={<ErrorPanel compact error={props.error} onRetry={props.onRetry} />}
      >
        {props.children}
      </Show>
    </Show>
  );
}
