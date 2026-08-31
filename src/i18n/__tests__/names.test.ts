import { describe, expect, it } from "vitest";
import type { PartyList } from "../../domain/contracts";
import { LOCALES } from "../locales";
import { displayLocalityName, displayPartyName, displayShortPartyName } from "../names";

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
