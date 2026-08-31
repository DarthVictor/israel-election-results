import type { LocalityResult } from "../domain/contracts.ts";

export function rankLocalities(localities: LocalityResult[], partyIds: readonly string[]) {
  for (const partyId of partyIds) {
    localities
      .filter(
        (locality) =>
          locality.geography === "mappable" &&
          locality.valid > 0 &&
          locality.partyVotes[partyId] > 0,
      )
      .sort(
        (left, right) =>
          right.partyVotes[partyId] * left.valid - left.partyVotes[partyId] * right.valid ||
          left.localityId - right.localityId,
      )
      .forEach((locality, index) => {
        locality.partyRanks[partyId] = index + 1;
      });
  }
}

export function localityIdsWhere(
  localities: readonly LocalityResult[],
  geography: LocalityResult["geography"],
) {
  return localities
    .filter((locality) => locality.geography === geography)
    .map((locality) => locality.localityId)
    .sort((left, right) => left - right);
}
