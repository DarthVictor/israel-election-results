import { describe, expect, it } from "vitest";
import { createStaticI18n } from "../create-i18n";
import { isLocale, LOCALES } from "../locales";
import { readStoredLocale } from "../storage";

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
