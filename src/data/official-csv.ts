import { readFile } from "node:fs/promises";
import { assert } from "./assert.ts";
import type { ElectionSource } from "./sources.ts";

const COLUMN = {
  localityId: ["סמל ישוב", "סמל יישוב"],
  nameHe: ["שם ישוב", "שם יישוב"],
  eligible: ["בזב"],
  voters: ["מצביעים"],
  invalid: ["פסולים"],
  valid: ["כשרים"],
};

export const count = (text = "", where: string) => {
  const value = Number(text.trim());
  assert(
    /^(0|[1-9]\d*)$/.test(text.trim()) && Number.isSafeInteger(value),
    `${where}: expected a non-negative integer, received ${JSON.stringify(text)}`,
  );
  return value;
};

export const readCsv = async (path: string) => {
  const bytes = await readFile(path);
  const utf8 = bytes.toString("utf8");
  const text = utf8.includes("\uFFFD") ? new TextDecoder("windows-1255").decode(bytes) : utf8;
  return text
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .map((line: string) => line.split(","))
    .filter((cells: string[]) => cells.some((cell) => cell !== ""));
};

export async function readOfficialElectionTable(source: ElectionSource, path: string) {
  const [header, ...rows] = await readCsv(path);
  assert(rows.length > 0, `election ${source.id}: no data rows`);
  const headers = header.map((name) => name.trim());
  const indexOf = (aliases: string[]) => {
    const index = headers.findIndex((name) => aliases.includes(name));
    assert(index >= 0, `election ${source.id}: missing official column ${aliases.join(" / ")}`);
    return index;
  };
  const indexes = {
    localityId: indexOf(COLUMN.localityId),
    nameHe: indexOf(COLUMN.nameHe),
    eligible: indexOf(COLUMN.eligible),
    voters: indexOf(COLUMN.voters),
    invalid: indexOf(COLUMN.invalid),
    valid: indexOf(COLUMN.valid),
  };
  const partyColumns = headers
    .map((code, index) => ({ code, index }))
    .filter(({ code, index }) => index > indexes.valid && code !== "");
  const declared = source.parties.map((party) => party.id);
  const codes = partyColumns.map((party) => party.code);
  for (const code of codes) {
    assert(declared.includes(code), `election ${source.id}: unverified party list column ${code}`);
    assert(
      codes.indexOf(code) === codes.lastIndexOf(code),
      `election ${source.id}: duplicate ${code}`,
    );
  }
  for (const code of declared) {
    assert(codes.includes(code), `election ${source.id}: verified party list ${code} is absent`);
  }
  return { headers, rows, indexes, partyColumns, declared };
}
