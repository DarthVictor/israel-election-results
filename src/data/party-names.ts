import { readFile } from "node:fs/promises";
import type { PartyList } from "../domain/contracts.ts";
import { assert } from "./assert.ts";
import { ELECTION_SOURCES } from "./sources.ts";

/**
 * Ballot codes are reused across elections for unrelated lists — פה is Blue and White in
 * 21–23 and Yesh Atid in 24–25 — so every translation is keyed by the election as well.
 */
export const partyKey = (electionId: number, ballotCode: string) => `${electionId}:${ballotCode}`;

/** Hand-curated he.wikipedia article title per party list, or null where no article fits. */
export type WikipediaTitles = Record<string, string | null>;

/** Interlanguage names fetched from those articles by fetch-party-translations.ts. */
export type TranslatedNames = Record<string, { en?: string | null; ru?: string | null }>;

const declaredKeys = () =>
  new Set(
    ELECTION_SOURCES.flatMap((source) =>
      source.parties.map((party) => partyKey(source.id, party.id)),
    ),
  );

const readJson = async (path: string): Promise<unknown> =>
  JSON.parse(await readFile(path, "utf8")) as unknown;

/**
 * Reads the curated title map and the fetched translations, checking both against the
 * verified party lists in the same bidirectional way readElection checks CSV columns:
 * an unknown key is a stale entry, a missing key is an uncurated list.
 */
export const readPartyNames = async (titlesPath: string, namesPath: string) => {
  const titles = (await readJson(titlesPath)) as WikipediaTitles;
  const names = (await readJson(namesPath)) as TranslatedNames;
  const declared = declaredKeys();

  for (const key of Object.keys(titles)) {
    assert(declared.has(key), `party titles: ${key} is not a verified party list`);
  }
  for (const key of declared) {
    assert(key in titles, `party titles: verified party list ${key} is absent`);
  }
  for (const key of Object.keys(names)) {
    assert(declared.has(key), `party names: ${key} is not a verified party list`);
    assert(titles[key] != null, `party names: ${key} has no curated Wikipedia title`);
  }

  return names;
};

/**
 * Completes one election's party lists. The curated English names stay authoritative
 * because they are verified against the official results pages; Wikipedia only fills
 * the gaps, and supplies Russian, which is never curated by hand.
 */
export const withTranslations = (
  electionId: number,
  parties: readonly Omit<PartyList, "nameRu">[],
  names: TranslatedNames,
): PartyList[] =>
  parties.map((party) => {
    const translated = names[partyKey(electionId, party.id)];
    return {
      ...party,
      nameEn: party.nameEn ?? translated?.en ?? null,
      nameRu: translated?.ru ?? null,
    };
  });
