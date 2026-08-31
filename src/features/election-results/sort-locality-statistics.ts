import type { LocalitySortKey, LocalityStatistic, LocalityTextPolicy } from "./locality-statistics";

export function sortLocalityStatistics(
  statistics: readonly LocalityStatistic[],
  key: LocalitySortKey,
  direction: "asc" | "desc",
  text: Pick<LocalityTextPolicy, "compare" | "localityName">,
): LocalityStatistic[] {
  const multiplier = direction === "asc" ? 1 : -1;
  return [...statistics].sort((left, right) => {
    const leftValue = sortableValue(left, key, text.localityName);
    const rightValue = sortableValue(right, key, text.localityName);
    if (typeof leftValue === "string" && typeof rightValue === "string") {
      return text.compare(leftValue, rightValue) * multiplier;
    }
    return (Number(leftValue) - Number(rightValue)) * multiplier;
  });
}

function sortableValue(
  item: LocalityStatistic,
  key: LocalitySortKey,
  localityName: LocalityTextPolicy["localityName"],
) {
  if (key === "name") return localityName(item.locality);
  if (key === "valid") return item.locality.valid;
  if (key === "rank") return item.locality.partyRanks[item.partyId] ?? Number.POSITIVE_INFINITY;
  if (key === "delta") return item.delta ?? Number.NEGATIVE_INFINITY;
  return item[key];
}

export function mergeComparisonLocalities(
  first: readonly import("../../domain/contracts").LocalityResult[],
  second: readonly import("../../domain/contracts").LocalityResult[],
) {
  return [...new Map([...first, ...second].map((item) => [item.localityId, item])).values()];
}
