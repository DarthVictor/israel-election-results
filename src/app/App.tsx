import { ExplorerPage } from "../features/explorer/ExplorerPage";
import { createExplorerFeature } from "../features/explorer/feature/create-explorer-feature";
import {
  createBrowserExplorerDependencies,
  createExplorerPageEnvironment,
} from "./create-browser-explorer-dependencies";

/** Application composition root. */
export function App() {
  const explorer = createExplorerFeature(createBrowserExplorerDependencies());
  return <ExplorerPage explorer={explorer} environment={createExplorerPageEnvironment()} />;
}
