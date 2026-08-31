import type { AnalysisState, ElectionMetadata, PartyList } from "../../domain/contracts";
import type { LocalityStatistic } from "./locality-statistics";

const csvCell = (value: string | number | null | undefined) =>
  `"${String(value ?? "").replaceAll('"', '""')}"`;

export function electionResultsCsv(
  statistics: readonly LocalityStatistic[],
  state: AnalysisState,
  election: ElectionMetadata | undefined,
  party: PartyList | undefined,
  comparison?: { election?: ElectionMetadata; party?: PartyList },
): string {
  const hasComparison = state.mode === "compare" && !!comparison?.election && !!comparison.party;
  const context = [
    ["Analysis mode", state.mode],
    ["Election A", election?.label],
    ["List A", party?.nameEn ?? party?.nameHe],
    ...(hasComparison
      ? [
          ["Election B", comparison?.election?.label],
          ["List B", comparison?.party?.nameEn ?? comparison?.party?.nameHe],
        ]
      : []),
    ["Minimum turnout", state.turnoutMin],
    ["Minimum share", state.shareMin],
    ["Minimum valid ballots", state.minValidVotes],
    [],
  ];
  const header = [
    "Locality ID",
    "Locality (Hebrew)",
    "Locality (English)",
    "Votes",
    "Share (%)",
    "Turnout (%)",
    "Valid ballots",
    "Rank",
    ...(hasComparison ? ["Delta (pp)"] : []),
  ];
  const data = statistics.map((item) => [
    item.locality.localityId,
    item.locality.nameHe,
    item.locality.nameEn,
    item.votes,
    item.share.toFixed(2),
    item.turnout.toFixed(2),
    item.locality.valid,
    item.locality.partyRanks[state.party],
    ...(hasComparison ? [item.delta?.toFixed(2)] : []),
  ]);
  return `\uFEFF${[...context, header, ...data]
    .map((row) => row.map(csvCell).join(","))
    .join("\r\n")}`;
}
