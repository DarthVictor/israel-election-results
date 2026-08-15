/** Hebrew leads because the data, the localities, and the ballot names are Hebrew first. */
export const LOCALES = ["he", "en", "ru"] as const;

export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "he";

/** Each language names itself, so the switcher is readable whichever locale is active. */
export const LOCALE_LABELS: Record<Locale, string> = {
  he: "עברית",
  en: "English",
  ru: "Русский",
};

export const LOCALE_DIRECTIONS: Record<Locale, "rtl" | "ltr"> = {
  he: "rtl",
  en: "ltr",
  ru: "ltr",
};

export const isLocale = (value: unknown): value is Locale =>
  typeof value === "string" && (LOCALES as readonly string[]).includes(value);
