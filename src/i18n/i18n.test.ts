import { describe, expect, it } from "vitest";
import type { PartyList } from "../domain/contracts";
import { createStaticI18n } from "./create-i18n";
import en from "./dictionaries/en";
import he from "./dictionaries/he";
import ru from "./dictionaries/ru";
import { LOCALES, isLocale } from "./locales";
import { displayLocalityName, displayPartyName, displayShortPartyName } from "./names";
import { readStoredLocale } from "./storage";

/** Walks to the leaves so a plural record counts as one key set, not one key. */
const leafKeys = (value: unknown, path = ""): string[] =>
  typeof value === "object" && value !== null
    ? Object.entries(value).flatMap(([key, child]) =>
        leafKeys(child, path ? `${path}.${key}` : key),
      )
    : [path];

describe("dictionaries", () => {
  it("gives English and Russian a key for every Hebrew key", () => {
    const hebrew = leafKeys(he).sort();
    // Plural categories legitimately differ per language, so those keys are compared by
    // their parent record rather than by form.
    const withoutForms = (keys: string[]) =>
      [...new Set(keys.map((key) => key.replace(/\.(one|two|few|many|other)$/, "")))].sort();

    expect(withoutForms(leafKeys(en))).toEqual(withoutForms(hebrew));
    expect(withoutForms(leafKeys(ru))).toEqual(withoutForms(hebrew));
  });

  it("never leaves a translated string empty", () => {
    for (const dictionary of [he, en, ru]) {
      for (const key of leafKeys(dictionary)) {
        const value = key
          .split(".")
          .reduce<unknown>((node, part) => (node as Record<string, unknown>)[part], dictionary);
        expect(typeof value === "string" && value.length > 0, key).toBe(true);
      }
    }
  });
});

describe("plural resolution", () => {
  it("uses each language's own categories for counts", () => {
    expect(createStaticI18n("en").plural("table.count", 1)).toBe("1 mapped locality");
    expect(createStaticI18n("en").plural("table.count", 5)).toContain("mapped localities");
    // Russian distinguishes one / few / many, and 2 and 5 must not read the same.
    const russian = createStaticI18n("ru");
    expect(russian.plural("table.count", 2)).not.toBe(russian.plural("table.count", 5));
    expect(russian.plural("details.votes", 1)).toContain("голос за");
    // Hebrew has a dual form, which the dictionary supplies for exactly two.
    expect(createStaticI18n("he").plural("table.count", 2)).toBe("שני יישובים ממופים");
  });

  it("falls back to the other form when a language omits a category", () => {
    // Hebrew has no ordinal categories, so every Knesset number takes the same phrasing.
    expect(createStaticI18n("he").plural("controls.knesset", 21, "ordinal")).toBe(
      "הבחירות לכנסת ה־21",
    );
  });

  it("applies English ordinal suffixes to Knesset numbers", () => {
    const english = createStaticI18n("en");
    expect(english.plural("controls.knesset", 21, "ordinal")).toBe("21st Knesset election");
    expect(english.plural("controls.knesset", 22, "ordinal")).toBe("22nd Knesset election");
    expect(english.plural("controls.knesset", 23, "ordinal")).toBe("23rd Knesset election");
    expect(english.plural("controls.knesset", 25, "ordinal")).toBe("25th Knesset election");
  });
});

describe("name display", () => {
  const party: PartyList = {
    id: "מחל",
    nameHe: "הליכוד בהנהגת בנימין נתניהו",
    nameEn: "Likud",
    nameRu: "Ликуд",
  };

  it("shows Hebrew alone in Hebrew and a translation beside it elsewhere", () => {
    expect(displayPartyName(party, "he", "—")).toBe("הליכוד בהנהגת בנימין נתניהו");
    expect(displayPartyName(party, "en", "—")).toBe("Likud · הליכוד בהנהגת בנימין נתניהו");
    expect(displayPartyName(party, "ru", "—")).toBe("Ликуд · הליכוד בהנהגת בנימין נתניהו");
  });

  it("falls back through English when a list has no Russian name", () => {
    const noRussian = { ...party, nameRu: null };
    expect(displayPartyName(noRussian, "ru", "—")).toBe("Likud · הליכוד בהנהגת בנימין נתניהו");
  });

  it("shows the official Hebrew name alone when nothing is translated", () => {
    const untranslated = { ...party, nameEn: null, nameRu: null };
    for (const locale of LOCALES) {
      expect(displayPartyName(untranslated, locale, "—")).toBe("הליכוד בהנהגת בנימין נתניהו");
    }
  });

  it("uses the supplied fallback when no list is selected", () => {
    expect(displayPartyName(undefined, "he", "הרשימה הנבחרת")).toBe("הרשימה הנבחרת");
    expect(displayShortPartyName(undefined, "he", "הרשימה הנבחרת")).toBe("הרשימה הנבחרת");
  });

  it("gives the pickers one language only, never a mixed-direction pairing", () => {
    expect(displayShortPartyName(party, "he", "—")).toBe("הליכוד בהנהגת בנימין נתניהו");
    expect(displayShortPartyName(party, "en", "—")).toBe("Likud");
    expect(displayShortPartyName(party, "ru", "—")).toBe("Ликуд");
    for (const locale of LOCALES) {
      expect(displayShortPartyName(party, locale, "—")).not.toContain(" · ");
    }
  });

  it("falls back through English then Hebrew for an untranslated list", () => {
    expect(displayShortPartyName({ ...party, nameRu: null }, "ru", "—")).toBe("Likud");
    const untranslated = { ...party, nameEn: null, nameRu: null };
    expect(displayShortPartyName(untranslated, "ru", "—")).toBe("הליכוד בהנהגת בנימין נתניהו");
    expect(displayShortPartyName(untranslated, "en", "—")).toBe("הליכוד בהנהגת בנימין נתניהו");
  });

  it("pairs localities with their transliteration outside Hebrew", () => {
    const locality = { nameHe: "ירושלים", nameEn: "YERUSHALAYIM" };
    expect(displayLocalityName(locality, "he")).toBe("ירושלים");
    expect(displayLocalityName(locality, "en")).toBe("YERUSHALAYIM · ירושלים");
    // No Russian locality names exist yet, so Russian shares the English pairing.
    expect(displayLocalityName(locality, "ru")).toBe("YERUSHALAYIM · ירושלים");
    expect(displayLocalityName({ nameHe: "ברכה", nameEn: null }, "en")).toBe("ברכה");
    expect(displayLocalityName(undefined, "en")).toBe("");
  });
});

describe("locale selection", () => {
  it("accepts only the three supported locales", () => {
    expect(LOCALES.every(isLocale)).toBe(true);
    expect(isLocale("fr")).toBe(false);
    expect(isLocale(null)).toBe(false);
  });

  it("ignores a stored value that is not a supported locale", () => {
    expect(readStoredLocale({ read: () => "ru", write: () => {} })).toBe("ru");
    expect(readStoredLocale({ read: () => "klingon", write: () => {} })).toBeUndefined();
    expect(readStoredLocale({ read: () => null, write: () => {} })).toBeUndefined();
    expect(readStoredLocale(undefined)).toBeUndefined();
  });
});

describe("formatters", () => {
  it("formats dates and directions per locale", () => {
    expect(createStaticI18n("he").direction()).toBe("rtl");
    expect(createStaticI18n("en").direction()).toBe("ltr");
    expect(createStaticI18n("ru").direction()).toBe("ltr");
    expect(createStaticI18n("en").formatDate("2022-11-01")).toBe("November 1, 2022");
    // A value that is not a date is shown as-is rather than as "Invalid Date".
    expect(createStaticI18n("en").formatDate("not-a-date")).toBe("not-a-date");
  });

  it("always signs percentage-point changes", () => {
    const { formatters } = createStaticI18n("en");
    expect(formatters().points.format(1.24)).toBe("+1.2");
    expect(formatters().points.format(-3)).toBe("-3.0");
    expect(formatters().points.format(0)).toBe("0.0");
  });
});
