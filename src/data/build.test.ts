import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { build } from "./build.ts";
import { readCsv, readElection } from "./csv.ts";
import { englishNamesFrom, readLocalities, toTopology } from "./localities.ts";
import type { ElectionSource } from "./sources.ts";

const fixture: ElectionSource = {
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

const fixtureFile = async (contents: string, name = "fixture.csv") => {
  const directory = await mkdtemp(resolve(tmpdir(), "election-fixture-"));
  const path = resolve(directory, name);
  await writeFile(path, contents, "utf8");
  return path;
};

const HEADER = "שם ישוב,סמל ישוב,בזב,מצביעים,פסולים,כשרים,א,ב";
const names = (...ids: number[]) => new Map(ids.map((id) => [id, null]));

describe("readCsv", () => {
  it("strips a BOM, handles CRLF, and keeps Hebrew abbreviation quotes literal", async () => {
    const path = await fixtureFile('\uFEFFשם,ערך\r\nניר ח"ן,2\r\n\r\n');
    expect(await readCsv(path)).toEqual([
      ["שם", "ערך"],
      ['ניר ח"ן', "2"],
    ]);
  });
});

describe("readElection", () => {
  it("normalizes a row and ranks mapped localities by vote share", async () => {
    const path = await fixtureFile(
      [
        HEADER,
        "גדול,1,1000,1000,0,1000,600,400",
        "קטן,2,10,10,0,10,7,3",
        "אותו שיעור,3,10,10,0,10,7,3",
        "מעטפות חיצוניות,99999,0,100,0,100,100,0",
      ].join("\n"),
    );
    const result = await readElection(fixture, path, names(1, 2, 3));
    expect(result.localities.map((row) => [row.localityId, row.partyRanks.א])).toEqual([
      [1, 3],
      [2, 1],
      [3, 2],
      [99999, undefined],
    ]);
    expect(result.localities.at(-1)).toMatchObject({
      geography: "nonGeographic",
      hasGeometry: false,
    });
    expect(result.nonGeographicLocalityIds).toEqual([99999]);
    expect(result.unmatchedLocalityIds).toEqual([]);
  });

  it("rejects unverified party columns", async () => {
    const path = await fixtureFile(
      `שם ישוב,סמל ישוב,בזב,מצביעים,פסולים,כשרים,א,ג\nאבג,1,10,8,1,7,4,3\n`,
    );
    await expect(readElection(fixture, path, names(1))).rejects.toThrow("unverified party list");
  });

  it("rejects vote totals that do not reconcile", async () => {
    const path = await fixtureFile(`${HEADER}\nאבג,1,10,8,1,7,4,1\n`);
    await expect(readElection(fixture, path, names(1))).rejects.toThrow("party votes");
  });

  it("rejects duplicate locality IDs and malformed counts", async () => {
    const duplicate = await fixtureFile(`${HEADER}\nאבג,1,10,8,1,7,4,3\nדהו,1,10,8,1,7,4,3\n`);
    await expect(readElection(fixture, duplicate, names(1))).rejects.toThrow(
      "duplicate locality ID",
    );
    const negative = await fixtureFile(`${HEADER}\nאבג,1,-1,8,1,7,4,3\n`);
    await expect(readElection(fixture, negative, names(1))).rejects.toThrow("non-negative integer");
  });

  it("rejects rows whose field count does not match the header", async () => {
    const path = await fixtureFile(`${HEADER}\nאבג,1,10,8,1,7,4\n`);
    await expect(readElection(fixture, path, names(1))).rejects.toThrow("expected 8 fields");
  });
});

describe("readLocalities", () => {
  it("keeps only client fields, sorts by locality ID, and builds simplified TopoJSON", async () => {
    const path = await fixtureFile(
      JSON.stringify({
        type: "FeatureCollection",
        features: [
          {
            properties: { SEMEL_YISHUV: 9, SHEM_YISHUV: "בית", SHEM_YISHUV_ENGLISH: "" },
            geometry: {
              type: "Polygon",
              coordinates: [
                [
                  [1, 1],
                  [2, 1],
                  [2, 2],
                  [1, 1],
                ],
              ],
            },
          },
          {
            properties: {
              SEMEL_YISHUV: 7,
              SHEM_YISHUV: "שחר",
              SHEM_YISHUV_ENGLISH: "SHAHAR",
              x: 1,
            },
            geometry: {
              type: "Polygon",
              coordinates: [
                [
                  [0, 0],
                  [1, 0],
                  [1, 1],
                  [0, 0],
                ],
              ],
            },
          },
        ],
      }),
      "localities.json",
    );
    const localities = await readLocalities(path);
    expect(localities.features.map((feature) => feature.properties)).toEqual([
      { localityId: 7, nameHe: "שחר", nameEn: "SHAHAR" },
      { localityId: 9, nameHe: "בית", nameEn: null },
    ]);
    expect(englishNamesFrom(localities).get(7)).toBe("SHAHAR");

    const topology = toTopology(localities);
    expect(topology.objects.localities.type).toBe("GeometryCollection");
    expect(topology.arcs.length).toBeGreaterThan(0);
  });
});

describe("build", () => {
  it("imports the five verified sources deterministically", async () => {
    const [first, second] = [await build(), await build()];
    expect(first.elections.map((election) => election.id)).toEqual([21, 22, 23, 24, 25]);
    expect(first.results.map((result) => result.localities.length)).toEqual([
      1214, 1214, 1214, 1215, 1216,
    ]);
    expect(first.unmatchedReport.geometryLocalityCount).toBeGreaterThan(1200);
    // Byte-identical across runs is what makes the content-addressed names stable.
    expect(JSON.stringify(second)).toBe(JSON.stringify(first));
  });
});
