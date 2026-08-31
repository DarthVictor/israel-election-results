import type { LocalityResult, PartyList, VoteTotals } from "../../domain/contracts";

export type ThresholdScale = { thresholds: number[]; colors: readonly string[] };

export const RESULT_SHARE_COLORS = ["#edf6fd", "#cfe7f8", "#95c8eb", "#4a98d0", "#0b5ea8"] as const;
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

export function createThresholdScale(
  localities: readonly LocalityResult[],
  partyId: string,
): ThresholdScale {
  const shares = localities
    .filter((locality) => locality.geography === "mappable" && locality.valid > 0)
    .map((locality) => partyShare(locality, partyId))
    .sort((left, right) => left - right);
  if (shares.length === 0) return { thresholds: [0, 0, 0, 0], colors: RESULT_SHARE_COLORS };
  const quantile = (fraction: number) =>
    shares[Math.min(shares.length - 1, Math.floor((shares.length - 1) * fraction))];
  return {
    thresholds: [quantile(0.2), quantile(0.4), quantile(0.6), quantile(0.8)],
    colors: RESULT_SHARE_COLORS,
  };
}

export function colorForShare(share: number | undefined, scale: ThresholdScale): string {
  if (share === undefined) return "#d9e7f3";
  const index = scale.thresholds.filter((threshold) => share >= threshold).length;
  return scale.colors[Math.min(index, scale.colors.length - 1)];
}

export function strongestLocality(localities: readonly LocalityResult[], partyId: string) {
  return localities
    .filter((locality) => locality.geography === "mappable" && locality.valid > 0)
    .reduce<LocalityResult | undefined>((best, locality) => {
      return !best || partyShare(locality, partyId) > partyShare(best, partyId) ? locality : best;
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
