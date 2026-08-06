import type {
  AnalysisState,
  ElectionMetadata,
  LocalityResult,
  PartyList,
} from "../../domain/contracts";
import { displayLocality, displayParty, strongestLocality, type TableRow } from "./analysis";
import { analysisCsv, analysisSvg } from "./exports";
import type { ExplorerFeature } from "./topology";

export type ExportBrowser = {
  downloadText(filename: string, contents: string): void;
  pngFromSvg(svg: string): Promise<Blob>;
  downloadBlob(filename: string, blob: Blob): void;
};

export type ExportSnapshot = {
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
  const isCompare = snapshot.comparisonReady;
  if (
    !snapshot.geometry.length ||
    !snapshot.localityRows.length ||
    (snapshot.state.mode === "compare" && !isCompare)
  ) {
    throw new Error("Wait for geometry and active comparison data before exporting PNG.");
  }
  const svg = analysisSvg({
    features: snapshot.geometry,
    rows: snapshot.localityRows,
    partyId: snapshot.state.party,
    title: isCompare
      ? "Locality comparison"
      : (snapshot.party?.nameEn ?? snapshot.party?.nameHe ?? "Election results"),
    context: isCompare
      ? `${snapshot.election?.label}: ${displayParty(snapshot.party)}  |  ${snapshot.compareElection?.label}: ${displayParty(snapshot.compareParty)}`
      : `${snapshot.election?.label} · ${displayParty(snapshot.party)}`,
    insight: strongestLocality(snapshot.localityRows, snapshot.state.party)
      ? `Strongest locality: ${displayLocality(strongestLocality(snapshot.localityRows, snapshot.state.party))}`
      : "No mappable locality data",
    source: snapshot.election?.sourceUrl ?? "Official Central Elections Committee data",
    ...(isCompare
      ? { comparison: { rows: snapshot.comparisonRows, partyId: snapshot.compareParty!.id } }
      : {}),
  });
  browser.downloadBlob("israel-election-analysis.png", await browser.pngFromSvg(svg));
}
