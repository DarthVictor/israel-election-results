import {
  loadElection,
  loadGeometry,
  loadManifest,
} from "../features/election-results/election-repository";
import { topologyToBoundaries } from "../features/election-results/locality-boundaries";
import type { ElectionResultsDependencies } from "../features/election-results/state/election-results-store.types";
import { LOCALE_STORAGE_KEY, type LocaleStorage } from "../i18n/storage";
import { downloadBlob, downloadText, pngFromSvg } from "./browser-export-adapters";
import { THEME_STORAGE_KEY, type ThemeStorage } from "./theme";

/** Binds browser APIs and static-data adapters at the application boundary. */
export function createBrowserDependencies(): Omit<ElectionResultsDependencies, "i18n"> {
  return {
    repository: { loadManifest, loadElection, loadGeometry, topologyToBoundaries },
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

export function createThemeStorage(): ThemeStorage {
  return {
    read: () => {
      try {
        return window.localStorage.getItem(THEME_STORAGE_KEY);
      } catch {
        return null;
      }
    },
    write: (value) => {
      try {
        window.localStorage.setItem(THEME_STORAGE_KEY, value);
      } catch {
        // A session-only theme choice is a better outcome than a thrown error.
      }
    },
  };
}
