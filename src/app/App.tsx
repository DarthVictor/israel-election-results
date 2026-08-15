import { ExplorerPage } from "../features/explorer/ExplorerPage";
import { createExplorerFeature } from "../features/explorer/feature/create-explorer-feature";
import { useI18n } from "../i18n/context";
import {
  createBrowserExplorerDependencies,
  createExplorerPageEnvironment,
} from "./create-browser-explorer-dependencies";

/** Application composition root. */
export function App() {
  const explorer = createExplorerFeature({
    ...createBrowserExplorerDependencies(),
    i18n: useI18n(),
  });
  return <ExplorerPage explorer={explorer} environment={createExplorerPageEnvironment()} />;
}
