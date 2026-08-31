import { ElectionResultsPage } from "../features/election-results/ElectionResultsPage";
import { createElectionResultsStore } from "../features/election-results/state/create-election-results-store";
import { ElectionResultsProvider } from "../features/election-results/state/ElectionResultsContext";
import { useI18n } from "../i18n/context";
import { createBrowserDependencies } from "./create-browser-dependencies";

/** Application composition root. */
export function App() {
  const store = createElectionResultsStore({
    ...createBrowserDependencies(),
    i18n: useI18n(),
  });
  return (
    <ElectionResultsProvider store={store}>
      <ElectionResultsPage />
    </ElectionResultsProvider>
  );
}
