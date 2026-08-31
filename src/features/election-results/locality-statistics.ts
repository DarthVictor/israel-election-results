import type { LocalityResult } from "../../domain/contracts";
import { comparisonDelta, partyShare, turnout } from "./metrics";

export type LocalityStatistic = {
  locality: LocalityResult;
  partyId: string;
  votes: number;
  share: number;
  turnout: number;
  delta?: number;
  first?: LocalityResult;
  second?: LocalityResult;
};

export type LocalitySortKey = "name" | "votes" | "share" | "turnout" | "valid" | "rank" | "delta";

export type LocalityTextPolicy = {
  fold(value: string): string;
  compare(left: string, right: string): number;
  localityName(locality: LocalityResult): string;
};

export type LocalityFilters = {
  query?: string;
  turnoutMin?: number;
  shareMin?: number;
  minValidVotes?: number;
};

export function buildLocalityStatistics(
  localities: readonly LocalityResult[],
  partyId: string,
  filters: LocalityFilters,
  text: Pick<LocalityTextPolicy, "fold">,
  comparison?: { localities: readonly LocalityResult[]; partyId: string },
): LocalityStatistic[] {
  const secondById = new Map(comparison?.localities.map((item) => [item.localityId, item]));
  const firstById = new Map(localities.map((item) => [item.localityId, item]));
  const candidates = comparison
    ? [
        ...new Map(
          [...localities, ...comparison.localities].map((item) => [item.localityId, item]),
        ).values(),
      ]
    : localities;
  const needle = filters.query?.trim() ? text.fold(filters.query.trim()) : undefined;
  return candidates
    .filter((locality) => locality.geography === "mappable")
    .map((locality) => toStatistic(locality, partyId, firstById, secondById, comparison?.partyId))
    .filter((statistic) => matchesFilters(statistic, filters, needle, text.fold));
}

function toStatistic(
  locality: LocalityResult,
  partyId: string,
  firstById: Map<number, LocalityResult>,
  secondById: Map<number, LocalityResult>,
  secondPartyId?: string,
): LocalityStatistic {
  const first = firstById.get(locality.localityId);
  const second = secondById.get(locality.localityId);
  const basis = first ?? locality;
  return {
    locality,
    partyId,
    first,
    second,
    votes: basis.partyVotes[partyId] ?? 0,
    share: partyShare(basis, partyId),
    turnout: turnout(basis),
    ...(secondPartyId ? { delta: comparisonDelta(first, partyId, second, secondPartyId) } : {}),
  };
}

function matchesFilters(
  item: LocalityStatistic,
  filters: LocalityFilters,
  needle: string | undefined,
  fold: (value: string) => string,
) {
  const name = fold(`${item.locality.nameHe} ${item.locality.nameEn ?? ""}`);
  return (
    (!needle || name.includes(needle)) &&
    (filters.turnoutMin === undefined || item.turnout >= filters.turnoutMin) &&
    (filters.shareMin === undefined || item.share >= filters.shareMin) &&
    (filters.minValidVotes === undefined || item.locality.valid >= filters.minValidVotes)
  );
}
