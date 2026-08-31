import { type Flatten, flatten, resolveTemplate, translator } from "@solid-primitives/i18n";
import en from "./dictionaries/en";
import he, { type Dictionary } from "./dictionaries/he";
import ru from "./dictionaries/ru";
import type { Locale } from "./locales";

type FlatDictionary = Flatten<Dictionary>;

/**
 * Flattening also keeps the intermediate objects — "table.count" is the plural record, not a
 * string — so keys are narrowed to the leaves a caller can actually render.
 */
export type TranslationKey = {
  [K in keyof FlatDictionary]: FlatDictionary[K] extends string ? K : never;
}[keyof FlatDictionary];

export type TemplateArgs = Record<string, string | number>;

export type Translate = (key: TranslationKey, args?: TemplateArgs) => string;

/** Chooses the CLDR plural form for a count and fills its {{ count }} placeholder. */
export type Pluralize = (
  key: PluralKey,
  count: number,
  type?: Intl.PluralRuleType,
  args?: TemplateArgs,
) => string;

/** Keys whose value is a plural record, addressed without the trailing form. */
export type PluralKey = {
  [K in keyof FlatDictionary]: FlatDictionary[K] extends { other: string } ? K : never;
}[keyof FlatDictionary];

/**
 * All three dictionaries are bundled rather than fetched. Together they are a few kilobytes
 * next to the megabyte of election data the app already loads, and being synchronous means
 * switching language never shows a frame of untranslated text.
 */
const DICTIONARIES: Record<Locale, FlatDictionary> = {
  he: flatten(he) as FlatDictionary,
  en: flatten(en) as FlatDictionary,
  ru: flatten(ru) as FlatDictionary,
};

export type Translator = {
  locale: Locale;
  t: Translate;
  plural: Pluralize;
};

export function createTranslator(locale: Locale): Translator {
  const lookup = translator(() => DICTIONARIES[locale], resolveTemplate);
  // A missing key is a build-time error via the Dictionary type, so showing the key itself
  // is only a last-resort guard rather than a user-facing state worth designing for.
  const t: Translate = (key, args) => lookup(key, args) ?? key;

  const plural: Pluralize = (key, count, type = "cardinal", args) => {
    const form = new Intl.PluralRules(locale, { type }).select(count);
    // A language need not define every form Intl can return, and "other" always exists.
    const exact = lookup(`${key}.${form}` as TranslationKey, { count, ...args });
    return exact ?? t(`${key}.other` as TranslationKey, { count, ...args });
  };

  return { locale, t, plural };
}
