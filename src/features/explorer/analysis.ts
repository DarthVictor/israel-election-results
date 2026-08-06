import type { LocalityResult, PartyList, VoteTotals } from "../../domain/contracts";

export type ThresholdScale = {
  thresholds: number[];
  colors: readonly string[];
};

/** Light-blue scale inspired by the Israeli flag, from low to high vote share. */
export const EXPLORER_COLORS = ["#edf6fd", "#cfe7f8", "#95c8eb", "#4a98d0", "#0b5ea8"] as const;
export const COMPARISON_COLORS = {
  negative: "#b54a4a",
  neutral: "#eef5fb",
  positive: "#0b5ea8",
} as const;

export const percentage = (numerator: number, denominator: number): number =>
  denominator > 0 ? (numerator / denominator) * 100 : 0;

export const partyShare = (locality: LocalityResult, partyId: string): number =>
  percentage(locality.partyVotes[partyId] ?? 0, locality.valid);

export const turnout = (totals: VoteTotals): number => percentage(totals.voters, totals.eligible);

/** Creates a compact, data-derived five-step scale from mappable locality shares. */
export function createThresholdScale(
  rows: readonly LocalityResult[],
  partyId: string,
): ThresholdScale {
  const shares = rows
    .filter((row) => row.geography === "mappable" && row.valid > 0)
    .map((row) => partyShare(row, partyId))
    .sort((left, right) => left - right);

  if (shares.length === 0) return { thresholds: [0, 0, 0, 0], colors: EXPLORER_COLORS };

  const quantile = (fraction: number) =>
    shares[Math.min(shares.length - 1, Math.floor((shares.length - 1) * fraction))];
  return {
    thresholds: [quantile(0.2), quantile(0.4), quantile(0.6), quantile(0.8)],
    colors: EXPLORER_COLORS,
  };
}

export function colorForShare(share: number | undefined, scale: ThresholdScale): string {
  if (share === undefined) return "#d9e7f3";
  const colorIndex = scale.thresholds.filter((threshold) => share >= threshold).length;
  return scale.colors[Math.min(colorIndex, scale.colors.length - 1)];
}

export function displayParty(party: PartyList | undefined): string {
  if (!party) return "Selected list";
  return party.nameEn ? `${party.nameEn} · ${party.nameHe}` : party.nameHe;
}

export function displayLocality(locality: LocalityResult | undefined): string {
  if (!locality) return "";
  return locality.nameEn ? `${locality.nameEn} · ${locality.nameHe}` : locality.nameHe;
}

export function strongestLocality(
  rows: readonly LocalityResult[],
  partyId: string,
): LocalityResult | undefined {
  return rows
    .filter((row) => row.geography === "mappable" && row.valid > 0)
    .reduce<LocalityResult | undefined>((best, row) => {
      if (!best || partyShare(row, partyId) > partyShare(best, partyId)) return row;
      return best;
    }, undefined);
}

export function rankedPartyBreakdown(locality: LocalityResult, parties: readonly PartyList[]) {
  return parties
    .map((party) => ({
      party,
      votes: locality.partyVotes[party.id] ?? 0,
      share: partyShare(locality, party.id),
    }))
    .sort((left, right) => right.votes - left.votes);
}

/** Difference in percentage points: B share minus A share. */
export function comparisonDelta(
  first: LocalityResult | undefined,
  firstPartyId: string,
  second: LocalityResult | undefined,
  secondPartyId: string,
): number | undefined {
  if (!first || !second || first.valid <= 0 || second.valid <= 0) return undefined;
  return partyShare(second, secondPartyId) - partyShare(first, firstPartyId);
}

export function colorForComparison(delta: number | undefined): string {
  if (delta === undefined) return "#d9e7f3";
  if (delta > 0.1) return COMPARISON_COLORS.positive;
  if (delta < -0.1) return COMPARISON_COLORS.negative;
  return COMPARISON_COLORS.neutral;
}

export type TableRow = {
  locality: LocalityResult;
  partyId: string;
  votes: number;
  share: number;
  turnout: number;
  delta?: number;
  /** Present in comparison views, including one-sided locality records. */
  first?: LocalityResult;
  second?: LocalityResult;
};

export type TableSortKey = "name" | "votes" | "share" | "turnout" | "valid" | "rank" | "delta";

export function tableRows(
  rows: readonly LocalityResult[],
  partyId: string,
  filters: { query?: string; turnoutMin?: number; shareMin?: number; minValidVotes?: number },
  comparison?: { rows: readonly LocalityResult[]; partyId: string },
): TableRow[] {
  const comparisonById = new Map(comparison?.rows.map((row) => [row.localityId, row]));
  const firstById = new Map(rows.map((row) => [row.localityId, row]));
  const allRows = comparison
    ? [...new Map([...rows, ...comparison.rows].map((row) => [row.localityId, row])).values()]
    : rows;
  const needle = filters.query?.trim().toLocaleLowerCase();
  return allRows
    .filter((locality) => locality.geography === "mappable")
    .map((locality) => ({
      locality,
      partyId,
      first: firstById.get(locality.localityId),
      second: comparisonById.get(locality.localityId),
      votes: (firstById.get(locality.localityId) ?? locality).partyVotes[partyId] ?? 0,
      share: partyShare(firstById.get(locality.localityId) ?? locality, partyId),
      turnout: turnout(firstById.get(locality.localityId) ?? locality),
      ...(comparison
        ? {
            delta: comparisonDelta(
              firstById.get(locality.localityId),
              partyId,
              comparisonById.get(locality.localityId),
              comparison.partyId,
            ),
          }
        : {}),
    }))
    .filter((row) => {
      const name = `${row.locality.nameHe} ${row.locality.nameEn ?? ""}`.toLocaleLowerCase();
      return (
        (!needle || name.includes(needle)) &&
        (filters.turnoutMin === undefined || row.turnout >= filters.turnoutMin) &&
        (filters.shareMin === undefined || row.share >= filters.shareMin) &&
        (filters.minValidVotes === undefined || row.locality.valid >= filters.minValidVotes)
      );
    });
}

export function comparisonLocalities(
  first: readonly LocalityResult[],
  second: readonly LocalityResult[],
): LocalityResult[] {
  return [...new Map([...first, ...second].map((row) => [row.localityId, row])).values()];
}

export function sortTableRows(
  rows: readonly TableRow[],
  key: TableSortKey,
  direction: "asc" | "desc",
): TableRow[] {
  const multiplier = direction === "asc" ? 1 : -1;
  return [...rows].sort((left, right) => {
    const leftValue =
      key === "name"
        ? displayLocality(left.locality)
        : key === "valid"
          ? left.locality.valid
          : key === "rank"
            ? (left.locality.partyRanks[left.partyId] ?? Infinity)
            : key === "delta"
              ? (left.delta ?? -Infinity)
              : left[key];
    const rightValue =
      key === "name"
        ? displayLocality(right.locality)
        : key === "valid"
          ? right.locality.valid
          : key === "rank"
            ? (right.locality.partyRanks[right.partyId] ?? Infinity)
            : key === "delta"
              ? (right.delta ?? -Infinity)
              : right[key];
    if (typeof leftValue === "string" && typeof rightValue === "string")
      return leftValue.localeCompare(rightValue) * multiplier;
    return (Number(leftValue) - Number(rightValue)) * multiplier;
  });
}
