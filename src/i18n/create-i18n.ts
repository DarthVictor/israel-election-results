import type { Accessor } from "solid-js";
import { createFormatters, formatIsoDate, type Formatters } from "./format";
import { DEFAULT_LOCALE, LOCALE_DIRECTIONS, type Locale } from "./locales";
import { displayLocalityName, displayPartyName, displayShortPartyName } from "./names";
import { createTranslator, type Pluralize, type Translate, type Translator } from "./translate";

/**
 * Everything locale-dependent in one injectable object. Components reach it through the
 * context; the pure view, action, and export modules take it as a dependency instead, which
 * keeps them free of any Solid component tree and testable in the Node environment.
 */
export type I18n = {
  locale: Accessor<Locale>;
  setLocale(locale: Locale): void;
  direction: Accessor<"rtl" | "ltr">;
  t: Translate;
  plural: Pluralize;
  formatters: Accessor<Formatters>;
  formatDate(iso: string): string;
  partyName(party: Parameters<typeof displayPartyName>[0]): string;
  /** For compact controls such as the list pickers, where the pairing does not fit. */
  shortPartyName(party: Parameters<typeof displayShortPartyName>[0]): string;
  localityName(locality: Parameters<typeof displayLocalityName>[0]): string;
  /** Locale-aware collation, replacing the host-default localeCompare in table sorting. */
  compare(left: string, right: string): number;
  /** Locale-aware case folding, replacing the host-default toLocaleLowerCase in search. */
  fold(value: string): string;
};

/**
 * Translators, formatters, and collators are pure functions of the locale, so they are cached
 * per locale rather than memoised. That keeps this factory free of reactive primitives — it
 * can be built outside a root — while every accessor still reads locale() at call time and so
 * stays reactive wherever a component does use it.
 */
const translators = new Map<Locale, Translator>();
const formatters = new Map<Locale, Formatters>();
const collators = new Map<Locale, Intl.Collator>();

const cached = <T>(store: Map<Locale, T>, locale: Locale, create: () => T): T => {
  const existing = store.get(locale);
  if (existing) return existing;
  const created = create();
  store.set(locale, created);
  return created;
};

export function createI18n(locale: Accessor<Locale>, setLocale: (next: Locale) => void): I18n {
  const translator = () => cached(translators, locale(), () => createTranslator(locale()));
  const formatter = () => cached(formatters, locale(), () => createFormatters(locale()));
  const collator = () => cached(collators, locale(), () => new Intl.Collator(locale()));

  const i18n: I18n = {
    locale,
    setLocale,
    direction: () => LOCALE_DIRECTIONS[locale()],
    t: (key, args) => translator().t(key, args),
    plural: (key, count, type, args) => translator().plural(key, count, type, args),
    formatters: formatter,
    formatDate: (iso) => formatIsoDate(formatter(), iso),
    partyName: (party) => displayPartyName(party, locale(), i18n.t("party.selected")),
    shortPartyName: (party) => displayShortPartyName(party, locale(), i18n.t("party.selected")),
    localityName: (locality) => displayLocalityName(locality, locale()),
    compare: (left, right) => collator().compare(left, right),
    fold: (value) => value.toLocaleLowerCase(locale()),
  };

  return i18n;
}

/** A fixed-locale instance for tests and for any caller with no locale signal of its own. */
export const createStaticI18n = (locale: Locale = DEFAULT_LOCALE): I18n =>
  createI18n(
    () => locale,
    () => {},
  );
