import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import type { ElectionSource } from "../sources.ts";

export const fixture: ElectionSource = {
  id: 99,
  date: "2099-01-01",
  label: "Fixture election",
  sourceUrl: "https://example.test/election",
  sourceCsvUrl: "https://example.test/election.csv",
  rawPath: "fixture.csv",
  parties: [
    { id: "א", nameHe: "רשימת א", nameEn: null },
    { id: "ב", nameHe: "רשימת ב", nameEn: null },
  ],
};

export const fixtureFile = async (contents: string, name = "fixture.csv") => {
  const directory = await mkdtemp(resolve(tmpdir(), "election-fixture-"));
  const path = resolve(directory, name);
  await writeFile(path, contents, "utf8");
  return path;
};

export const HEADER = "שם ישוב,סמל ישוב,בזב,מצביעים,פסולים,כשרים,א,ב";
export const names = (...ids: number[]) => new Map(ids.map((id) => [id, null]));
