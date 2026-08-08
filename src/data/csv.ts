import { readFile } from "node:fs/promises";
import { MANIFEST_SCHEMA_VERSION, type LocalityResult } from "../domain/contracts.ts";
import { assert } from "./assert.ts";
import type { ElectionSource } from "./sources.ts";

/** Official exports differ in header spelling; election 21 omits the committee column. */
const COLUMN = {
  localityId: ["סמל ישוב", "סמל יישוב"],
  nameHe: ["שם ישוב", "שם יישוב"],
  eligible: ["בזב"],
  voters: ["מצביעים"],
  invalid: ["פסולים"],
  valid: ["כשרים"],
};

const count = (text = "", where: string) => {
  const value = Number(text.trim());
  assert(
    /^(0|[1-9]\d*)$/.test(text.trim()) && Number.isSafeInteger(value),
    `${where}: expected a non-negative integer, received ${JSON.stringify(text)}`,
  );
  return value;
};

/**
 * The official exports never quote a field: their only quote characters are Hebrew
 * abbreviations such as ניר ח"ן, which RFC-4180 parsers corrupt. Splitting is exact
 * for them, and the field-count check in readElection is what would catch a future
 * export that genuinely needs quoting.
 */
export const readCsv = async (path: string) => {
  const bytes = await readFile(path);
  const utf8 = bytes.toString("utf8");
  // The 24th-election export is Windows-1255; every other one is UTF-8.
  const text = utf8.includes("\uFFFD") ? new TextDecoder("windows-1255").decode(bytes) : utf8;
  return text
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .map((line: string) => line.split(","))
    .filter((cells: string[]) => cells.some((cell) => cell !== ""));
};

/** Reads one election export into its generated results file. */
export const readElection = async (
  source: ElectionSource,
  path: string,
  englishNames: ReadonlyMap<number, string | null>,
) => {
  const [header, ...rows] = await readCsv(path);
  assert(rows.length > 0, `election ${source.id}: no data rows`);

  const headers = header.map((name) => name.trim());
  const indexOf = (aliases: string[]) => {
    const index = headers.findIndex((name) => aliases.includes(name));
    assert(index >= 0, `election ${source.id}: missing official column ${aliases.join(" / ")}`);
    return index;
  };
  const at = {
    localityId: indexOf(COLUMN.localityId),
    nameHe: indexOf(COLUMN.nameHe),
    eligible: indexOf(COLUMN.eligible),
    voters: indexOf(COLUMN.voters),
    invalid: indexOf(COLUMN.invalid),
    valid: indexOf(COLUMN.valid),
  };

  // Every column after the valid-ballot count is a party list, keyed by ballot code.
  const parties = headers
    .map((code, index) => ({ code, index }))
    .filter(({ code, index }) => index > at.valid && code !== "");
  const declared = source.parties.map((party) => party.id);
  const codes = parties.map((party) => party.code);
  for (const code of codes) {
    assert(declared.includes(code), `election ${source.id}: unverified party list column ${code}`);
    assert(
      codes.indexOf(code) === codes.lastIndexOf(code),
      `election ${source.id}: duplicate party list column ${code}`,
    );
  }
  for (const code of declared) {
    assert(codes.includes(code), `election ${source.id}: verified party list ${code} is absent`);
  }

  const localities = rows.map((row, rowIndex): LocalityResult => {
    const where = `election ${source.id} line ${rowIndex + 2}`;
    assert(
      row.length === headers.length,
      `${where}: expected ${headers.length} fields, received ${row.length}`,
    );
    const localityId = count(row[at.localityId], where);
    const nameHe = row[at.nameHe].trim();
    const voters = count(row[at.voters], where);
    const valid = count(row[at.valid], where);
    const invalid = count(row[at.invalid], where);
    const partyVotes = Object.fromEntries(
      parties.map(({ code, index }) => [code, count(row[index], `${where} (${code})`)]),
    );
    const partyTotal = Object.values(partyVotes).reduce((sum, votes) => sum + votes, 0);
    assert(
      voters === valid + invalid,
      `${where}: voters ${voters} ≠ valid ${valid} + invalid ${invalid}`,
    );
    assert(partyTotal === valid, `${where}: party votes ${partyTotal} ≠ valid ballots ${valid}`);

    // National-only records (external envelopes) are kept for totals but never mapped.
    const geography =
      localityId === 0 || localityId === 99999 || nameHe.includes("מעטפות חיצוניות")
        ? "nonGeographic"
        : englishNames.has(localityId)
          ? "mappable"
          : "unmatchedBoundary";
    return {
      localityId,
      nameHe,
      nameEn: englishNames.get(localityId) ?? null,
      eligible: count(row[at.eligible], where),
      voters,
      valid,
      invalid,
      partyVotes,
      partyRanks: {},
      geography,
      hasGeometry: geography === "mappable",
    };
  });

  const ids = localities.map((locality) => locality.localityId);
  const duplicate = ids.find((id, index) => ids.indexOf(id) !== index);
  assert(duplicate === undefined, `election ${source.id}: duplicate locality ID ${duplicate}`);

  for (const code of declared) {
    localities
      .filter((row) => row.geography === "mappable" && row.valid > 0 && row.partyVotes[code] > 0)
      // Cross multiplication ranks exact vote shares without floating-point ties.
      .sort(
        (left, right) =>
          right.partyVotes[code] * left.valid - left.partyVotes[code] * right.valid ||
          left.localityId - right.localityId,
      )
      .forEach((row, index) => {
        row.partyRanks[code] = index + 1;
      });
  }

  const idsWhere = (geography: LocalityResult["geography"]) =>
    localities
      .filter((row) => row.geography === geography)
      .map((row) => row.localityId)
      .sort((left, right) => left - right);
  return {
    schemaVersion: MANIFEST_SCHEMA_VERSION,
    electionId: source.id,
    localities,
    unmatchedLocalityIds: idsWhere("unmatchedBoundary"),
    nonGeographicLocalityIds: idsWhere("nonGeographic"),
  };
};
