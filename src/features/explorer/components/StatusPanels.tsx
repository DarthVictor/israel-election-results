import { Show, type JSX } from "solid-js";

const errorText = (error: unknown) =>
  error instanceof Error ? error.message : "Something went wrong while loading the explorer.";

export function LoadingScreen(props: { label: string }) {
  return (
    <div class="loading-screen" role="status">
      {props.label}…
    </div>
  );
}

export function ErrorPanel(props: { error: unknown; onRetry(): void; compact?: boolean }) {
  return (
    <section
      class={props.compact ? "error-panel compact" : "error-panel"}
      role="alert"
      data-testid="load-error"
    >
      <h2>Data could not load</h2>
      <p>{errorText(props.error)}</p>
      <button type="button" onClick={() => props.onRetry()} data-testid="retry-load">
        Try again
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
  return (
    <Show
      when={!props.loading}
      fallback={
        <p class="status-message" role="status">
          Loading locality results…
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
