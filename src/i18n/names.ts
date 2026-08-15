import type { LocalityProperties, PartyList } from "../domain/contracts";
import type { Locale } from "./locales";

/** The official Hebrew name is never dropped, so a translated label stays checkable. */
const SEPARATOR = " · ";

const pair = (translated: string | null | undefined, nameHe: string) =>
  translated ? `${translated}${SEPARATOR}${nameHe}` : nameHe;

type NamedParty = Pick<PartyList, "nameHe" | "nameEn" | "nameRu">;

/**
 * The list's name in the reader's own language. Russian falls back through English rather
 * than straight to Hebrew, because a Latin name is still more use to a Russian reader than
 * none; a list with no translation at all keeps its official Hebrew name.
 */
export function displayShortPartyName(
  party: NamedParty | undefined,
  locale: Locale,
  fallback: string,
): string {
  if (!party) return fallback;
  if (locale === "he") return party.nameHe;
  if (locale === "ru") return party.nameRu ?? party.nameEn ?? party.nameHe;
  return party.nameEn ?? party.nameHe;
}

/**
 * The same name with the official ballot name beside it, so a translation stays checkable
 * against the ballot. Hebrew readers already have the official name, so it is not doubled.
 */
export function displayPartyName(
  party: NamedParty | undefined,
  locale: Locale,
  fallback: string,
): string {
  if (!party) return fallback;
  if (locale === "he") return party.nameHe;
  if (locale === "ru") return pair(party.nameRu ?? party.nameEn, party.nameHe);
  return pair(party.nameEn, party.nameHe);
}

/**
 * Localities carry only the Central Bureau of Statistics transliteration, so Russian shares
 * the English pairing until a Russian locality dictionary exists.
 */
export function displayLocalityName(
  locality: Pick<LocalityProperties, "nameHe" | "nameEn"> | undefined,
  locale: Locale,
): string {
  if (!locality) return "";
  return locale === "he" ? locality.nameHe : pair(locality.nameEn, locality.nameHe);
}
