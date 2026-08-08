import { createHash } from "node:crypto";
import { mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildPipeline } from "./pipeline.ts";

const repoRoot = resolve(fileURLToPath(new URL("../..", import.meta.url)));
const outputDirectory = resolve(repoRoot, "public/data/generated");
const validateOnly = process.argv.includes("--validate-only");
const output = buildPipeline(repoRoot);

if (validateOnly) {
  console.log(
    `Validated ${output.results.length} elections and ${output.unmatchedReport.geometryLocalityCount} locality boundaries.`,
  );
} else {
  mkdirSync(outputDirectory, { recursive: true });
  const json = (value: unknown): string => `${JSON.stringify(value)}\n`;
  const contentName = (prefix: string, value: unknown): string => {
    const digest = createHash("sha256").update(json(value)).digest("hex").slice(0, 12);
    return `${prefix}.${digest}.json`;
  };
  const writeJson = (filename: string, value: unknown): void => {
    writeFileSync(resolve(outputDirectory, filename), json(value), "utf8");
  };
  const geometryFilename = contentName("localities", output.geometry);
  const resultsByElection = new Map(
    output.results.map((result) => [
      result.electionId,
      contentName(`election-${result.electionId}`, result),
    ]),
  );
  const manifest = {
    ...output.manifest,
    geometryUrl: `/data/generated/${geometryFilename}`,
    elections: output.manifest.elections.map((election) => ({
      ...election,
      dataUrl: `/data/generated/${resultsByElection.get(election.id)}`,
    })),
  };
  const unmatchedFilename = contentName("unmatched-localities", output.unmatchedReport);

  // Content-addressed names change whenever the data does. Without this sweep the
  // superseded files stay behind, get committed, and are copied into dist/ by
  // Vite's public directory — shipping payload nothing references.
  const written = new Set([
    "manifest.json",
    geometryFilename,
    unmatchedFilename,
    ...resultsByElection.values(),
  ]);
  const generatedName = /^(localities|election-\d+|unmatched-localities)\.[0-9a-f]{12}\.json$/;
  for (const entry of readdirSync(outputDirectory)) {
    if (!written.has(entry) && generatedName.test(entry)) {
      rmSync(resolve(outputDirectory, entry));
    }
  }

  writeJson("manifest.json", manifest);
  writeJson(geometryFilename, output.geometry);
  writeJson(unmatchedFilename, output.unmatchedReport);
  for (const result of output.results) {
    writeJson(resultsByElection.get(result.electionId)!, result);
  }
  console.log(
    `Generated ${output.results.length} elections and ${output.unmatchedReport.geometryLocalityCount} locality boundaries in public/data/generated.`,
  );
}
