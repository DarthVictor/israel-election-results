import { isLocale, type Locale } from "./locales";

export const LOCALE_STORAGE_KEY = "iere.locale";

/**
 * Narrow enough to stub in the Node test environment, and to survive a browser that throws
 * on storage access in private mode or with third-party cookies blocked.
 */
export type LocaleStorage = {
  read(): string | null;
  write(value: string): void;
};

export const readStoredLocale = (storage?: LocaleStorage): Locale | undefined => {
  const stored = storage?.read();
  return isLocale(stored) ? stored : undefined;
};
