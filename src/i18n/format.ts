import type { Locale } from "./locales";

export type Formatters = {
  /** Whole counts: votes, ballots, locality totals. */
  number: Intl.NumberFormat;
  /** Shares, given a 0–1 fraction. */
  percent: Intl.NumberFormat;
  /** Percentage points, always signed, as a change only reads correctly with its direction. */
  points: Intl.NumberFormat;
  /** Unsigned percentage points, for table cells that sit under a Δ heading. */
  magnitude: Intl.NumberFormat;
  date: Intl.DateTimeFormat;
};

/**
 * Every formatter is built from the active locale. The previous single "en" set produced
 * Latin digits and English month names regardless of the interface language.
 */
export function createFormatters(locale: Locale): Formatters {
  return {
    number: new Intl.NumberFormat(locale),
    percent: new Intl.NumberFormat(locale, {
      style: "percent",
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    }),
    points: new Intl.NumberFormat(locale, {
      signDisplay: "exceptZero",
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    }),
    magnitude: new Intl.NumberFormat(locale, {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    }),
    date: new Intl.DateTimeFormat(locale, { dateStyle: "long" }),
  };
}

/** Election dates arrive as ISO strings and are rendered rather than parsed for arithmetic. */
export const formatIsoDate = (formatters: Formatters, iso: string): string => {
  const date = new Date(`${iso}T00:00:00Z`);
  return Number.isNaN(date.getTime()) ? iso : formatters.date.format(date);
};
