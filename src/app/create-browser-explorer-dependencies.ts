import type { ExplorerFeatureDependencies } from "../features/explorer/feature/explorer-feature.types";
import { loadElection, loadGeometry, loadManifest } from "../features/explorer/data";
import { topologyToFeatures } from "../features/explorer/topology";
import { downloadBlob, downloadText, pngFromSvg } from "./browser-export-adapters";

export type ExplorerPageEnvironment = {
  subscribeMobile(listener: (isMobile: boolean) => void): () => void;
};

/** Binds browser APIs and static-data adapters at the application boundary. */
export function createBrowserExplorerDependencies(): ExplorerFeatureDependencies {
  return {
    data: { loadManifest, loadElection, loadGeometry, topologyToFeatures },
    history: {
      readSearch: () => window.location.search,
      pathname: () => window.location.pathname,
      href: () => window.location.href,
      push: (nextState, url) => window.history.pushState(nextState, "", url),
      replace: (nextState, url) => window.history.replaceState(nextState, "", url),
      subscribe: (listener) => {
        window.addEventListener("popstate", listener);
        return () => window.removeEventListener("popstate", listener);
      },
    },
    browser: {
      clipboard: navigator.clipboard,
      exports: { downloadText, pngFromSvg, downloadBlob },
    },
  };
}

export function createExplorerPageEnvironment(): ExplorerPageEnvironment {
  return {
    subscribeMobile(listener) {
      const mediaQuery = window.matchMedia("(max-width: 760px)");
      const update = () => listener(mediaQuery.matches);
      update();
      mediaQuery.addEventListener("change", update);
      return () => mediaQuery.removeEventListener("change", update);
    },
  };
}
