import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
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
  writeJson("manifest.json", manifest);
  writeJson(geometryFilename, output.geometry);
  writeJson(contentName("unmatched-localities", output.unmatchedReport), output.unmatchedReport);
  for (const result of output.results) {
    writeJson(resultsByElection.get(result.electionId)!, result);
  }
  console.log(
    `Generated ${output.results.length} elections and ${output.unmatchedReport.geometryLocalityCount} locality boundaries in public/data/generated.`,
  );
}
