import type { ExplorerFeatureDependencies } from "../features/explorer/feature/explorer-feature.types";
import { loadElection, loadGeometry, loadManifest } from "../features/explorer/data";
import { topologyToFeatures } from "../features/explorer/topology";
import { LOCALE_STORAGE_KEY, type LocaleStorage } from "../i18n/storage";
import { downloadBlob, downloadText, pngFromSvg } from "./browser-export-adapters";

export type ExplorerPageEnvironment = {
  subscribeMobile(listener: (isMobile: boolean) => void): () => void;
};

/**
 * Binds browser APIs and static-data adapters at the application boundary. The i18n slice is
 * supplied separately because it comes from the provider, not from a browser global.
 */
export function createBrowserExplorerDependencies(): Omit<ExplorerFeatureDependencies, "i18n"> {
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

/**
 * Storage access throws rather than returning null in private-mode and blocked-cookie
 * browsers, and losing a language preference is never worth failing the whole app for.
 */
export function createLocaleStorage(): LocaleStorage {
  return {
    read: () => {
      try {
        return window.localStorage.getItem(LOCALE_STORAGE_KEY);
      } catch {
        return null;
      }
    },
    write: (value) => {
      try {
        window.localStorage.setItem(LOCALE_STORAGE_KEY, value);
      } catch {
        // A session-only language choice is a better outcome than a thrown error.
      }
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
