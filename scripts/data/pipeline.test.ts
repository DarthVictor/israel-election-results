import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import {
  buildPipeline,
  compactLegacyGeometry,
  DataValidationError,
  importElection,
  parseCsv,
  topologyFor,
} from "./pipeline.ts";
import type { ElectionSource } from "./sources.ts";

const fixtureSource: ElectionSource = {
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

const fixtureCsv =
  '\uFEFFשם ישוב,סמל ישוב,בזב,מצביעים,פסולים,כשרים,א,ב\r\n"אבג",1,10,8,1,7,4,3\r\n';

describe("parseCsv", () => {
  it("supports BOM-adjacent UTF-8, quoted cells, escaped quotes, and Hebrew literal quotes", () => {
    expect(parseCsv('"שם",ערך\n"א""ב",1\nח"ן,2\n')).toEqual([
      ["שם", "ערך"],
      ['א"ב', "1"],
      ['ח"ן', "2"],
    ]);
  });

  it("rejects unterminated quoted fields", () => {
    expect(() => parseCsv('שם,ערך\n"אבג,1\n')).toThrow("unterminated quoted CSV field");
  });
});

describe("importElection", () => {
  it("normalizes a valid official-style row and assigns party ranks", () => {
    const result = importElection(fixtureSource, fixtureCsv, "fixture.csv", new Set([1]));
    expect(result.unmatchedLocalityIds).toEqual([]);
    expect(result.localities).toEqual([
      expect.objectContaining({
        localityId: 1,
        nameHe: "אבג",
        hasGeometry: true,
        partyVotes: { א: 4, ב: 3 },
        partyRanks: { א: 1, ב: 1 },
      }),
    ]);
  });

  it("reports unknown party codes and invalid vote totals with actionable context", () => {
    const invalid = "שם ישוב,סמל ישוב,בזב,מצביעים,פסולים,כשרים,א,ג\nאבג,1,10,8,1,7,4,1\n";
    expect(() => importElection(fixtureSource, invalid, "fixture.csv", new Set())).toThrow(
      DataValidationError,
    );
    try {
      importElection(fixtureSource, invalid, "fixture.csv", new Set());
    } catch (error) {
      expect(error).toBeInstanceOf(DataValidationError);
      const validationError = error as DataValidationError;
      expect(validationError.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: "ג",
            message: expect.stringContaining("unknown party"),
          }),
          expect.objectContaining({ message: expect.stringContaining("party votes") }),
        ]),
      );
    }
  });

  it("rejects duplicate locality IDs and malformed non-negative counts", () => {
    const invalid =
      "שם ישוב,סמל ישוב,בזב,מצביעים,פסולים,כשרים,א,ב\nאבג,1,10,8,1,7,4,3\nדהו,1,-1,8,1,7,4,3\n";
    try {
      importElection(fixtureSource, invalid, "fixture.csv", new Set());
      throw new Error("Expected validation to fail");
    } catch (error) {
      expect(error).toBeInstanceOf(DataValidationError);
      const validationError = error as DataValidationError;
      expect(validationError.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ message: expect.stringContaining("duplicate locality") }),
          expect.objectContaining({
            field: "בזב",
            message: expect.stringContaining("non-negative"),
          }),
        ]),
      );
    }
  });

  it("rejects CSV rows with missing or extra fields", () => {
    const invalid = "שם ישוב,סמל ישוב,בזב,מצביעים,פסולים,כשרים,א,ב\nאבג,1,10,8,1,7,4\n";
    expect(() => importElection(fixtureSource, invalid, "fixture.csv", new Set([1]))).toThrow(
      DataValidationError,
    );
    try {
      importElection(fixtureSource, invalid, "fixture.csv", new Set([1]));
    } catch (error) {
      expect(error).toBeInstanceOf(DataValidationError);
      expect((error as DataValidationError).issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ message: expect.stringContaining("CSV fields") }),
        ]),
      );
    }
  });

  it("ranks mapped localities by party share and excludes external envelopes", () => {
    const csv = [
      "שם ישוב,סמל ישוב,בזב,מצביעים,פסולים,כשרים,א,ב",
      "גדול,1,1000,1000,0,1000,600,400",
      "קטן,2,10,10,0,10,7,3",
      "אותו שיעור,3,10,10,0,10,7,3",
      "מעטפות חיצוניות,99999,0,100,0,100,100,0",
    ].join("\n");
    const result = importElection(fixtureSource, csv, "fixture.csv", new Set([1, 2, 3]));
    expect(
      result.localities.map((locality) => [locality.localityId, locality.partyRanks.א]),
    ).toEqual([
      [1, 3],
      [2, 1],
      [3, 2],
      [99999, undefined],
    ]);
    expect(result.localities.at(-1)).toEqual(
      expect.objectContaining({ geography: "nonGeographic", hasGeometry: false }),
    );
    expect(result.nonGeographicLocalityIds).toEqual([99999]);
    expect(result.unmatchedLocalityIds).toEqual([]);
  });
});

describe("compactLegacyGeometry", () => {
  it("keeps only client fields and repairs legacy mojibake names", () => {
    const geometry = compactLegacyGeometry(`const AREAS_DATA = {
      type: "FeatureCollection",
      features: [{
        type: "Feature",
        properties: { SEMEL_YISHUV: 7, SHEM_YISHUV: String.fromCodePoint(0xd7, 0xa9, 0xd7, 0x2014, 0xd7, 0xa8), SHEM_YISHUV_ENGLISH: "SHAHAR", unused: true },
        geometry: { type: "Point", coordinates: [1, 2] }
      }]
    };`);
    expect(geometry).toEqual({
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          properties: { localityId: 7, nameHe: "שחר", nameEn: "SHAHAR" },
          geometry: { type: "Point", coordinates: [1, 2] },
        },
      ],
    });
  });

  it("converts geometry to simplified TopoJSON while preserving locality IDs and names", () => {
    const featureCollection = compactLegacyGeometry(`const AREAS_DATA = {
      type: "FeatureCollection",
      features: [{
        type: "Feature",
        properties: { SEMEL_YISHUV: 7, SHEM_YISHUV: "שחר", SHEM_YISHUV_ENGLISH: "SHAHAR" },
        geometry: { type: "Polygon", coordinates: [[[0, 0], [1, 0], [1, 1], [0, 0]]] }
      }]
    };`);
    const topology = topologyFor(featureCollection);
    expect(topology.type).toBe("Topology");
    expect(topology.objects.localities.type).toBe("GeometryCollection");
    expect(topology.objects.localities.geometries).toEqual([
      expect.objectContaining({ properties: { localityId: 7, nameHe: "שחר", nameEn: "SHAHAR" } }),
    ]);
    expect(topology.arcs.length).toBeGreaterThan(0);
  });
});

describe("buildPipeline", () => {
  it("imports five verified election sources deterministically and meets the geometry gzip budget", () => {
    const repoRoot = resolve(fileURLToPath(new URL("../..", import.meta.url)));
    const output = buildPipeline(repoRoot);
    expect(output.manifest.schemaVersion).toBe(1);
    expect(output.manifest.elections.map((election) => election.id)).toEqual([21, 22, 23, 24, 25]);
    expect(output.results.map((result) => result.localities.length)).toEqual([
      1214, 1214, 1214, 1215, 1216,
    ]);
    expect(output.unmatchedReport.geometryLocalityCount).toBeGreaterThan(1200);
    expect(
      output.manifest.elections.every((election) =>
        election.parties.every((party) => party.nameHe.length > 0),
      ),
    ).toBe(true);
    const geometries = output.geometry.objects.localities.geometries;
    expect(geometries).toHaveLength(output.unmatchedReport.geometryLocalityCount);
    expect(
      geometries.every((geometry) => typeof geometry.properties?.localityId === "number"),
    ).toBe(true);
    expect(gzipSync(JSON.stringify(output.geometry)).byteLength).toBeLessThan(1.5 * 1024 * 1024);
    expect(Buffer.byteLength(JSON.stringify(output.geometry))).toBeLessThan(
      readFileSync(resolve(repoRoot, "data/raw/localities.js")).byteLength,
    );
  });
});
