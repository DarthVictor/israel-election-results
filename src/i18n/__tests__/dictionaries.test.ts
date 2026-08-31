import { describe, expect, it } from "vitest";
import { createStaticI18n } from "../create-i18n";
import en from "../dictionaries/en";
import he from "../dictionaries/he";
import ru from "../dictionaries/ru";

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
