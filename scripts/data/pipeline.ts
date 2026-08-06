import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { presimplify, simplify } from "topojson-simplify";
import { topology } from "topojson-server";
import type { Topology } from "topojson-specification";
import type {
  ElectionManifest,
  ElectionResultsFile,
  LocalityResult,
  VoteTotals,
} from "../../src/domain/contracts.ts";
import { MANIFEST_SCHEMA_VERSION } from "../../src/domain/contracts.ts";
import { ELECTION_SOURCES, partiesFor, type ElectionSource } from "./sources.ts";

export type ValidationIssue = {
  electionId: number;
  sourcePath: string;
  message: string;
  line?: number;
  field?: string;
};

export class DataValidationError extends Error {
  readonly issues: readonly ValidationIssue[];

  constructor(issues: readonly ValidationIssue[]) {
    super(
      `Election data validation failed:\n${issues.map((issue) => formatIssue(issue)).join("\n")}`,
    );
    this.name = "DataValidationError";
    this.issues = issues;
  }
}

export class CsvSyntaxError extends Error {
  readonly line: number;

  constructor(message: string, line: number) {
    super(message);
    this.name = "CsvSyntaxError";
    this.line = line;
  }
}

export type CompactGeometry = {
  type: "FeatureCollection";
  features: Array<{
    type: "Feature";
    properties: {
      localityId: number;
      nameHe: string;
      nameEn: string | null;
    };
    geometry: unknown;
  }>;
};

export type CompactTopology = Topology<{
  localities: CompactGeometry;
}>;

export type PipelineOutput = {
  manifest: ElectionManifest;
  geometry: CompactTopology;
  results: ElectionResultsFile[];
  unmatchedReport: {
    schemaVersion: typeof MANIFEST_SCHEMA_VERSION;
    geometryLocalityCount: number;
    elections: Array<{
      electionId: number;
      unmatchedLocalityIds: number[];
      nonGeographicLocalityIds: number[];
    }>;
  };
};

const HebrewHeaders = {
  name: ["שם ישוב", "שם יישוב"],
  localityId: ["סמל ישוב", "סמל יישוב"],
  eligible: ["בזב"],
  voters: ["מצביעים"],
  invalid: ["פסולים"],
  valid: ["כשרים"],
} as const;

const absolutePath = (repoRoot: string, relativePath: string): string =>
  resolve(repoRoot, relativePath);

const formatIssue = (issue: ValidationIssue): string => {
  const line = issue.line === undefined ? "" : ` line ${issue.line}`;
  const field = issue.field === undefined ? "" : ` (${issue.field})`;
  return `- election ${issue.electionId}, ${issue.sourcePath}${line}${field}: ${issue.message}`;
};

/** CSV reader supporting UTF-8 BOM, CRLF/LF, quotes, and escaped quotes. */
export const parseCsv = (contents: string): string[][] => {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  let line = 1;

  for (let index = 0; index < contents.length; index += 1) {
    const character = contents[index];
    const next = contents[index + 1];

    // Some official locality names use a literal Hebrew abbreviation quote
    // (for example ח"ן) without CSV quoting. A quote only opens a CSV field
    // when it is its first character; otherwise preserve it as locality text.
    if (character === '"' && (quoted || cell.length === 0)) {
      if (quoted && next === '"') {
        cell += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
      continue;
    }
    if (character === "," && !quoted) {
      row.push(cell);
      cell = "";
      continue;
    }
    if ((character === "\n" || character === "\r") && !quoted) {
      if (character === "\r" && next === "\n") index += 1;
      row.push(cell);
      if (row.some((value) => value.length > 0)) rows.push(row);
      row = [];
      cell = "";
      line += 1;
      continue;
    }
    if (character === "\n" || character === "\r") {
      if (character === "\r" && next === "\n") index += 1;
      line += 1;
    }
    cell += character;
  }

  if (quoted) {
    throw new CsvSyntaxError("unterminated quoted CSV field", line);
  }

  row.push(cell);
  if (row.some((value) => value.length > 0)) rows.push(row);
  return rows;
};

const decodeOfficialCsv = (contents: Buffer): string => {
  const utf8 = contents.toString("utf8");
  // The official 24th-election export is Windows-1255. Keep UTF-8 as the
  // default for the historic artifacts and only use the legacy decoder when
  // UTF-8 decoding proves invalid.
  return utf8.includes("\uFFFD") ? new TextDecoder("windows-1255").decode(contents) : utf8;
};

const headerIndex = (
  headers: readonly string[],
  aliases: readonly string[],
  source: ElectionSource,
  sourcePath: string,
): number => {
  const index = headers.findIndex((header) => aliases.includes(header));
  if (index >= 0) return index;
  throw new DataValidationError([
    {
      electionId: source.id,
      sourcePath,
      field: aliases.join(" / "),
      message: "required official column is missing",
    },
  ]);
};

const parseCount = (
  rawValue: string | undefined,
  context: Omit<ValidationIssue, "message">,
  issues: ValidationIssue[],
): number => {
  const value = rawValue?.trim() ?? "";
  if (!/^(0|[1-9]\d*)$/.test(value)) {
    issues.push({
      ...context,
      message: `expected a non-negative integer, received ${JSON.stringify(value)}`,
    });
    return 0;
  }
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed)) {
    issues.push({ ...context, message: `integer is outside JavaScript's safe range: ${value}` });
    return 0;
  }
  return parsed;
};

const sourceFileFor = (source: ElectionSource, repoRoot: string): string =>
  absolutePath(repoRoot, source.rawPath);

const NON_GEOGRAPHIC_LOCALITY_IDS = new Set([0, 99999]);

const geographyFor = (
  localityId: number,
  nameHe: string,
  geometryIds: ReadonlySet<number>,
): LocalityResult["geography"] => {
  if (NON_GEOGRAPHIC_LOCALITY_IDS.has(localityId) || nameHe.includes("מעטפות חיצוניות")) {
    return "nonGeographic";
  }
  return geometryIds.has(localityId) ? "mappable" : "unmatchedBoundary";
};

const total = (rows: readonly LocalityResult[]): VoteTotals =>
  rows.reduce<VoteTotals>(
    (accumulator, row) => ({
      eligible: accumulator.eligible + row.eligible,
      voters: accumulator.voters + row.voters,
      valid: accumulator.valid + row.valid,
      invalid: accumulator.invalid + row.invalid,
    }),
    { eligible: 0, voters: 0, valid: 0, invalid: 0 },
  );

const assignRanks = (rows: LocalityResult[], partyCodes: readonly string[]): void => {
  for (const partyCode of partyCodes) {
    const ranked = rows
      .filter(
        (row) => row.geography === "mappable" && row.valid > 0 && row.partyVotes[partyCode] > 0,
      )
      .sort((left, right) => {
        // Cross multiplication ranks exact shares without floating-point ties.
        const shareOrder =
          right.partyVotes[partyCode] * left.valid - left.partyVotes[partyCode] * right.valid;
        return shareOrder || left.localityId - right.localityId;
      });
    ranked.forEach((row, index) => {
      row.partyRanks[partyCode] = index + 1;
    });
  }
};

const windows1252Bytes = new Map<number, number>([
  [0x20ac, 0x80],
  [0x201a, 0x82],
  [0x0192, 0x83],
  [0x201e, 0x84],
  [0x2026, 0x85],
  [0x2020, 0x86],
  [0x2021, 0x87],
  [0x02c6, 0x88],
  [0x2030, 0x89],
  [0x0160, 0x8a],
  [0x2039, 0x8b],
  [0x0152, 0x8c],
  [0x017d, 0x8e],
  [0x2018, 0x91],
  [0x2019, 0x92],
  [0x201c, 0x93],
  [0x201d, 0x94],
  [0x2022, 0x95],
  [0x2013, 0x96],
  [0x2014, 0x97],
  [0x02dc, 0x98],
  [0x2122, 0x99],
  [0x0161, 0x9a],
  [0x203a, 0x9b],
  [0x0153, 0x9c],
  [0x017e, 0x9e],
  [0x0178, 0x9f],
]);

const decodeLegacyText = (value: string): string => {
  if (!value.includes("×")) return value;
  const bytes = Array.from(value, (character) => {
    const codePoint = character.codePointAt(0) ?? 0;
    return codePoint <= 0xff ? codePoint : windows1252Bytes.get(codePoint);
  });
  if (bytes.some((byte) => byte === undefined)) return value;
  const decoded = Buffer.from(bytes as number[]).toString("utf8");
  return decoded.includes("�") ? value : decoded;
};

type LegacyFeature = {
  properties?: Record<string, unknown>;
  geometry?: unknown;
};

type LegacyFeatureCollection = { features?: LegacyFeature[] };

/**
 * The legacy geometry is a local JS object, not an imported runtime module.
 * The transform retains only fields the client needs and is deterministic.
 */
export const compactLegacyGeometry = (legacySource: string): CompactGeometry => {
  const expression = legacySource.replace(/^\s*const\s+AREAS_DATA\s*=\s*/, "");
  const parsed = Function(
    `"use strict"; return (${expression.replace(/;\s*$/, "")});`,
  )() as LegacyFeatureCollection;
  if (!Array.isArray(parsed.features)) {
    throw new Error("Legacy boundary source does not contain a FeatureCollection.features array");
  }

  const features = parsed.features
    .map((feature) => {
      const properties = feature.properties ?? {};
      const localityId = Number(properties.SEMEL_YISHUV);
      if (!Number.isSafeInteger(localityId)) return null;
      const nameHe = decodeLegacyText(String(properties.SHEM_YISHUV ?? ""));
      const rawNameEn = properties.SHEM_YISHUV_ENGLISH;
      return {
        type: "Feature" as const,
        properties: {
          localityId,
          nameHe,
          nameEn: typeof rawNameEn === "string" && rawNameEn.length > 0 ? rawNameEn : null,
        },
        geometry: feature.geometry ?? null,
      };
    })
    .filter((feature): feature is NonNullable<typeof feature> => feature !== null)
    .sort((left, right) => left.properties.localityId - right.properties.localityId);

  const duplicateIds = features
    .map((feature) => feature.properties.localityId)
    .filter((id, index, ids) => index > 0 && ids[index - 1] === id);
  if (duplicateIds.length > 0) {
    throw new Error(
      `Legacy boundary source contains duplicate locality IDs: ${duplicateIds.join(", ")}`,
    );
  }

  return { type: "FeatureCollection", features };
};

export const topologyFor = (geometry: CompactGeometry): CompactTopology => {
  const quantized = topology({ localities: geometry }, 100_000) as CompactTopology;
  // A low Visvalingam threshold reduces repeated boundary detail while retaining
  // locality shape at map inspection zoom levels.
  return simplify(presimplify(quantized), 0.000_001) as CompactTopology;
};

export const importElection = (
  source: ElectionSource,
  contents: string,
  sourcePath: string,
  geometryIds: ReadonlySet<number>,
): ElectionResultsFile => {
  let rows: string[][];
  try {
    rows = parseCsv(contents.replace(/^\uFEFF/, ""));
  } catch (error) {
    if (error instanceof CsvSyntaxError) {
      throw new DataValidationError([
        {
          electionId: source.id,
          sourcePath,
          line: error.line,
          message: error.message,
        },
      ]);
    }
    throw error;
  }
  if (rows.length < 2) {
    throw new DataValidationError([
      { electionId: source.id, sourcePath, message: "CSV has no data rows" },
    ]);
  }

  const headers = rows[0].map((header) => header.trim());
  const localityIdIndex = headerIndex(headers, HebrewHeaders.localityId, source, sourcePath);
  const nameIndex = headerIndex(headers, HebrewHeaders.name, source, sourcePath);
  const eligibleIndex = headerIndex(headers, HebrewHeaders.eligible, source, sourcePath);
  const votersIndex = headerIndex(headers, HebrewHeaders.voters, source, sourcePath);
  const invalidIndex = headerIndex(headers, HebrewHeaders.invalid, source, sourcePath);
  const validIndex = headerIndex(headers, HebrewHeaders.valid, source, sourcePath);
  const partyColumns = headers
    .map((header, index) => ({ header, index }))
    .filter(({ index, header }) => index > validIndex && header.length > 0);
  const expectedCodes = new Set(source.parties.map((party) => party.id));
  const issues: ValidationIssue[] = [];
  const observedCodes = new Set<string>();

  for (const column of partyColumns) {
    if (!expectedCodes.has(column.header)) {
      issues.push({
        electionId: source.id,
        sourcePath,
        line: 1,
        field: column.header,
        message: "unknown party list code; add verified metadata before importing",
      });
    }
    if (observedCodes.has(column.header)) {
      issues.push({
        electionId: source.id,
        sourcePath,
        line: 1,
        field: column.header,
        message: "duplicate party list column",
      });
    }
    observedCodes.add(column.header);
  }
  for (const partyCode of expectedCodes) {
    if (!observedCodes.has(partyCode)) {
      issues.push({
        electionId: source.id,
        sourcePath,
        line: 1,
        field: partyCode,
        message: "verified party list code is missing from CSV",
      });
    }
  }

  const seenLocalityIds = new Set<number>();
  const localities: LocalityResult[] = [];
  for (let rowIndex = 1; rowIndex < rows.length; rowIndex += 1) {
    const row = rows[rowIndex];
    const line = rowIndex + 1;
    if (row.length !== headers.length) {
      issues.push({
        electionId: source.id,
        sourcePath,
        line,
        message: `expected ${headers.length} CSV fields, received ${row.length}`,
      });
      continue;
    }
    const numberContext = (field: string): Omit<ValidationIssue, "message"> => ({
      electionId: source.id,
      sourcePath,
      line,
      field,
    });
    const localityId = parseCount(
      row[localityIdIndex],
      numberContext(headers[localityIdIndex]),
      issues,
    );
    const eligible = parseCount(row[eligibleIndex], numberContext(headers[eligibleIndex]), issues);
    const voters = parseCount(row[votersIndex], numberContext(headers[votersIndex]), issues);
    const invalid = parseCount(row[invalidIndex], numberContext(headers[invalidIndex]), issues);
    const valid = parseCount(row[validIndex], numberContext(headers[validIndex]), issues);
    const partyVotes: Record<string, number> = {};
    for (const column of partyColumns) {
      partyVotes[column.header] = parseCount(
        row[column.index],
        numberContext(column.header),
        issues,
      );
    }

    if (seenLocalityIds.has(localityId)) {
      issues.push({
        ...numberContext(headers[localityIdIndex]),
        message: `duplicate locality ID ${localityId}`,
      });
    }
    seenLocalityIds.add(localityId);
    if (voters !== valid + invalid) {
      issues.push({
        ...numberContext(headers[votersIndex]),
        message: `voters (${voters}) must equal valid (${valid}) + invalid (${invalid})`,
      });
    }
    const partyVoteTotal = Object.values(partyVotes).reduce((sum, value) => sum + value, 0);
    if (partyVoteTotal !== valid) {
      issues.push({
        ...numberContext(headers[validIndex]),
        message: `party votes (${partyVoteTotal}) must equal valid ballots (${valid})`,
      });
    }

    const nameHe = row[nameIndex]?.trim() ?? "";
    const geography = geographyFor(localityId, nameHe, geometryIds);
    localities.push({
      localityId,
      nameHe,
      nameEn: null,
      eligible,
      voters,
      valid,
      invalid,
      partyVotes,
      partyRanks: {},
      geography,
      hasGeometry: geography === "mappable",
    });
  }

  if (issues.length > 0) throw new DataValidationError(issues);
  assignRanks(
    localities,
    source.parties.map((party) => party.id),
  );
  const unmatchedLocalityIds = localities
    .filter((locality) => locality.geography === "unmatchedBoundary")
    .map((locality) => locality.localityId)
    .sort((left, right) => left - right);
  const nonGeographicLocalityIds = localities
    .filter((locality) => locality.geography === "nonGeographic")
    .map((locality) => locality.localityId)
    .sort((left, right) => left - right);
  return {
    schemaVersion: MANIFEST_SCHEMA_VERSION,
    electionId: source.id,
    localities,
    unmatchedLocalityIds,
    nonGeographicLocalityIds,
  };
};

export const buildPipeline = (repoRoot: string): PipelineOutput => {
  const geometryPath = absolutePath(repoRoot, "data/raw/localities.js");
  const compactGeometry = compactLegacyGeometry(readFileSync(geometryPath, "utf8"));
  const geometry = topologyFor(compactGeometry);
  const compactBytes = Buffer.byteLength(JSON.stringify(geometry));
  const legacyBytes = readFileSync(geometryPath).byteLength;
  if (compactBytes > legacyBytes) {
    throw new Error(
      `Compact geometry is larger than its legacy source (${compactBytes} > ${legacyBytes} bytes)`,
    );
  }
  const geometryById = new Map(
    compactGeometry.features.map((feature) => [feature.properties.localityId, feature.properties]),
  );
  const geometryIds = new Set(geometryById.keys());
  const results = ELECTION_SOURCES.map((source) => {
    const inputPath = sourceFileFor(source, repoRoot);
    const imported = importElection(
      source,
      decodeOfficialCsv(readFileSync(inputPath)),
      inputPath,
      geometryIds,
    );
    return {
      ...imported,
      localities: imported.localities.map((locality) => ({
        ...locality,
        nameEn: geometryById.get(locality.localityId)?.nameEn ?? null,
      })),
    };
  });
  const manifest: ElectionManifest = {
    schemaVersion: MANIFEST_SCHEMA_VERSION,
    geometryUrl: "/data/generated/localities.topojson",
    elections: ELECTION_SOURCES.map((source, index) => ({
      id: source.id,
      date: source.date,
      label: source.label,
      sourceUrl: source.sourceUrl,
      sourceCsvUrl: source.sourceCsvUrl,
      dataUrl: `/data/generated/election-${source.id}.json`,
      parties: partiesFor(source),
      nationalTotals: total(results[index].localities),
    })),
  };
  return {
    manifest,
    geometry,
    results,
    unmatchedReport: {
      schemaVersion: MANIFEST_SCHEMA_VERSION,
      geometryLocalityCount: compactGeometry.features.length,
      elections: results.map((result) => ({
        electionId: result.electionId,
        unmatchedLocalityIds: result.unmatchedLocalityIds,
        nonGeographicLocalityIds: result.nonGeographicLocalityIds,
      })),
    },
  };
};
