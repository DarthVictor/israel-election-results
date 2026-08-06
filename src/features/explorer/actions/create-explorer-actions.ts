import { createSignal, type Accessor } from "solid-js";
import type {
  AnalysisState,
  ElectionManifest,
  ElectionMetadata,
  LocalityResult,
  PartyList,
} from "../../../domain/contracts";
import type { TableRow } from "../analysis";
import { exportCsv, exportPng, type ExportBrowser, type ExportSnapshot } from "../export-actions";
import type { ExplorerFeature } from "../topology";

export type ExplorerActionBrowser = {
  clipboard?: { writeText(value: string): Promise<void> };
  exports?: ExportBrowser;
};

/** Browser-capability adapter. The feature supplies data, browser code supplies effects. */
export function createExplorerActions(dependencies: {
  manifest: Accessor<ElectionManifest | undefined>;
  state: Accessor<AnalysisState>;
  writeState(next: AnalysisState, replace?: boolean): void;
  currentUrl(): string;
  filteredTable: Accessor<TableRow[]>;
  election: Accessor<ElectionMetadata | undefined>;
  party: Accessor<PartyList | undefined>;
  compareElection: Accessor<ElectionMetadata | undefined>;
  compareParty: Accessor<PartyList | undefined>;
  comparisonRows: Accessor<LocalityResult[]>;
  comparisonReady: Accessor<boolean>;
  geometry: Accessor<ExplorerFeature[]>;
  localityRows: Accessor<LocalityResult[]>;
  browser?: ExplorerActionBrowser;
}) {
  const [status, setStatus] = createSignal("");
  const snapshot = (): ExportSnapshot => ({
    rows: dependencies.filteredTable(),
    state: dependencies.state(),
    election: dependencies.election(),
    party: dependencies.party(),
    compareElection: dependencies.compareElection(),
    compareParty: dependencies.compareParty(),
    comparisonRows: dependencies.comparisonRows(),
    comparisonReady: dependencies.comparisonReady(),
    geometry: dependencies.geometry(),
    localityRows: dependencies.localityRows(),
  });
  const copyLink = async () => {
    if (dependencies.manifest()) dependencies.writeState(dependencies.state(), true);
    try {
      if (!dependencies.browser?.clipboard) throw new Error("Clipboard is unavailable.");
      await dependencies.browser.clipboard.writeText(dependencies.currentUrl());
      setStatus("Analysis link copied to your clipboard.");
    } catch {
      setStatus("Copy this analysis link from your browser address bar.");
    }
  };
  const downloadCsv = () => {
    const browser = dependencies.browser?.exports;
    setStatus(
      browser && exportCsv(snapshot(), browser) ? "CSV download started." : "CSV export failed.",
    );
  };
  const downloadPng = async () => {
    try {
      const browser = dependencies.browser?.exports;
      if (!browser) throw new Error("PNG export is unavailable.");
      await exportPng(snapshot(), browser);
      setStatus("PNG download started.");
    } catch (error) {
      setStatus(`PNG export failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  };

  return { status, setStatus, copyLink, downloadCsv, downloadPng };
}
