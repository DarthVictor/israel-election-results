import type {
  AnalysisState,
  ElectionMetadata,
  LocalityResult,
  PartyList,
} from "../../domain/contracts";
import type { I18n } from "../../i18n/create-i18n";
import { strongestLocality, type TableRow } from "./analysis";
import { analysisCsv, analysisSvg } from "./exports";
import type { ExplorerFeature } from "./topology";

export type ExportBrowser = {
  downloadText(filename: string, contents: string): void;
  pngFromSvg(svg: string): Promise<Blob>;
  downloadBlob(filename: string, blob: Blob): void;
};

export type ExportSnapshot = {
  i18n: I18n;
  rows: readonly TableRow[];
  state: AnalysisState;
  election?: ElectionMetadata;
  party?: PartyList;
  compareElection?: ElectionMetadata;
  compareParty?: PartyList;
  comparisonRows: readonly LocalityResult[];
  comparisonReady: boolean;
  geometry: readonly ExplorerFeature[];
  localityRows: readonly LocalityResult[];
};

export function exportCsv(snapshot: ExportSnapshot, browser: ExportBrowser): boolean {
  try {
    browser.downloadText(
      "israel-election-analysis.csv",
      analysisCsv(
        snapshot.rows,
        snapshot.state,
        snapshot.election,
        snapshot.party,
        snapshot.comparisonReady
          ? { election: snapshot.compareElection, party: snapshot.compareParty }
          : undefined,
      ),
    );
    return true;
  } catch {
    return false;
  }
}

export async function exportPng(snapshot: ExportSnapshot, browser: ExportBrowser): Promise<void> {
  const { t, plural, partyName, localityName } = snapshot.i18n;
  const isCompare = snapshot.comparisonReady;
  if (
    !snapshot.geometry.length ||
    !snapshot.localityRows.length ||
    (snapshot.state.mode === "compare" && !isCompare)
  ) {
    throw new Error(t("actions.pngWaitForData"));
  }
  const strongest = strongestLocality(snapshot.localityRows, snapshot.state.party);
  // The manifest label is English-only, so the poster names each election by Knesset number.
  const electionLabel = (id?: number) =>
    id === undefined ? "" : plural("controls.knesset", id, "ordinal");
  const svg = analysisSvg({
    i18n: snapshot.i18n,
    features: snapshot.geometry,
    rows: snapshot.localityRows,
    partyId: snapshot.state.party,
    title: isCompare
      ? t("poster.comparisonTitle")
      : partyName(snapshot.party) || t("poster.resultsTitle"),
    context: isCompare
      ? `${electionLabel(snapshot.election?.id)}: ${partyName(snapshot.party)}  |  ${electionLabel(snapshot.compareElection?.id)}: ${partyName(snapshot.compareParty)}`
      : `${electionLabel(snapshot.election?.id)} · ${partyName(snapshot.party)}`,
    insight: strongest
      ? t("poster.strongest", { locality: localityName(strongest) })
      : t("poster.noData"),
    source: snapshot.election?.sourceUrl ?? t("poster.source"),
    ...(isCompare
      ? { comparison: { rows: snapshot.comparisonRows, partyId: snapshot.compareParty!.id } }
      : {}),
  });
  browser.downloadBlob("israel-election-analysis.png", await browser.pngFromSvg(svg));
}
