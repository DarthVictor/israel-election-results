import { createHash } from "node:crypto";
import { mkdir, readdir, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { MANIFEST_SCHEMA_VERSION } from "../domain/contracts.ts";
import { readElection } from "./csv.ts";
import { englishNamesFrom, readLocalities, toTopology } from "./localities.ts";
import { ELECTION_SOURCES } from "./sources.ts";

const repoRoot = resolve(fileURLToPath(new URL("../..", import.meta.url)));
const outputDir = resolve(repoRoot, "public/data/generated");
const generatedName = /^(localities|election-\d+|unmatched-localities)\.[0-9a-f]{12}\.json$/;

const json = (value: unknown) => `${JSON.stringify(value)}\n`;
/** Content-addressed names let the generated files be cached immutably. */
const hashedName = (prefix: string, value: unknown) =>
  `${prefix}.${createHash("sha256").update(json(value)).digest("hex").slice(0, 12)}.json`;

const sum = (rows: { eligible: number; voters: number; valid: number; invalid: number }[]) => ({
  eligible: rows.reduce((total, row) => total + row.eligible, 0),
  voters: rows.reduce((total, row) => total + row.voters, 0),
  valid: rows.reduce((total, row) => total + row.valid, 0),
  invalid: rows.reduce((total, row) => total + row.invalid, 0),
});

export const build = async () => {
  const localities = await readLocalities(resolve(repoRoot, "data/raw/localities.json"));
  const englishNames = englishNamesFrom(localities);
  const results = await Promise.all(
    ELECTION_SOURCES.map((source) =>
      readElection(source, resolve(repoRoot, source.rawPath), englishNames),
    ),
  );
  return {
    geometry: toTopology(localities),
    results,
    elections: ELECTION_SOURCES.map((source, index) => ({
      id: source.id,
      date: source.date,
      label: source.label,
      sourceUrl: source.sourceUrl,
      sourceCsvUrl: source.sourceCsvUrl,
      parties: [...source.parties],
      nationalTotals: sum(results[index].localities),
    })),
    unmatchedReport: {
      schemaVersion: MANIFEST_SCHEMA_VERSION,
      geometryLocalityCount: localities.features.length,
      elections: results.map(({ electionId, unmatchedLocalityIds, nonGeographicLocalityIds }) => ({
        electionId,
        unmatchedLocalityIds,
        nonGeographicLocalityIds,
      })),
    },
  };
};

const write = async () => {
  const output = await build();
  const geometryFile = hashedName("localities", output.geometry);
  const unmatchedFile = hashedName("unmatched-localities", output.unmatchedReport);
  // Results and manifest entries are both built from ELECTION_SOURCES, so they share
  // an index; pairing by position avoids a lookup that could not fail anyway.
  const electionFiles = output.results.map((result) =>
    hashedName(`election-${result.electionId}`, result),
  );
  const manifest = {
    schemaVersion: MANIFEST_SCHEMA_VERSION,
    geometryUrl: `/data/generated/${geometryFile}`,
    // dataUrl sits between the source links and the party list, as the client contract declares.
    elections: output.elections.map(({ parties, nationalTotals, ...election }, index) => ({
      ...election,
      dataUrl: `/data/generated/${electionFiles[index]}`,
      parties,
      nationalTotals,
    })),
  };

  await mkdir(outputDir, { recursive: true });
  // Hashed names change with the data. Without this sweep the superseded files stay
  // behind, get committed, and are copied into dist/ — payload nothing references.
  const keep = new Set(["manifest.json", geometryFile, unmatchedFile, ...electionFiles]);
  for (const name of await readdir(outputDir)) {
    if (!keep.has(name) && generatedName.test(name)) await rm(resolve(outputDir, name));
  }

  const files: [string, unknown][] = [
    ["manifest.json", manifest],
    [geometryFile, output.geometry],
    [unmatchedFile, output.unmatchedReport],
    ...output.results.map((result, index): [string, unknown] => [electionFiles[index], result]),
  ];
  await Promise.all(
    files.map(([name, value]) => writeFile(resolve(outputDir, name), json(value), "utf8")),
  );
  console.log(
    `Generated ${output.results.length} elections and ${output.unmatchedReport.geometryLocalityCount} locality boundaries in public/data/generated.`,
  );
};

/** Checks the preserved raw sources without touching public/data/generated. */
const validate = async () => {
  const output = await build();
  console.log(
    `Validated ${output.results.length} elections and ${output.unmatchedReport.geometryLocalityCount} locality boundaries.`,
  );
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await (process.argv.includes("--validate-only") ? validate() : write());
}
