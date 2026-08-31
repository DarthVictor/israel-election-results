import { describe, expect, it } from "vitest";
import { readCsv, readElection } from "../csv.ts";
import { fixture, fixtureFile, HEADER, names } from "./data-build-fixtures.ts";

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
