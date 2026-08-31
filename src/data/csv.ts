import { type LocalityResult, MANIFEST_SCHEMA_VERSION } from "../domain/contracts.ts";
import { assert } from "./assert.ts";
import { localityIdsWhere, rankLocalities } from "./locality-ranking.ts";
import { count, readCsv, readOfficialElectionTable } from "./official-csv.ts";
import type { ElectionSource } from "./sources.ts";

export { readCsv };

/** Reads one election export into its generated results file. */
export const readElection = async (
  source: ElectionSource,
  path: string,
  englishNames: ReadonlyMap<number, string | null>,
) => {
  const {
    headers,
    rows,
    indexes: at,
    partyColumns: parties,
    declared,
  } = await readOfficialElectionTable(source, path);

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

  rankLocalities(localities, declared);
  return {
    schemaVersion: MANIFEST_SCHEMA_VERSION,
    electionId: source.id,
    localities,
    unmatchedLocalityIds: localityIdsWhere(localities, "unmatchedBoundary"),
    nonGeographicLocalityIds: localityIdsWhere(localities, "nonGeographic"),
  };
};
