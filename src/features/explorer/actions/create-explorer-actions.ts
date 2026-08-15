import { createSignal, type Accessor } from "solid-js";
import type {
  AnalysisState,
  ElectionManifest,
  ElectionMetadata,
  LocalityResult,
  PartyList,
} from "../../../domain/contracts";
import type { I18n } from "../../../i18n/create-i18n";
import type { TableRow } from "../analysis";
import { exportCsv, exportPng, type ExportBrowser, type ExportSnapshot } from "../export-actions";
import type { ExplorerFeature } from "../topology";

export type ExplorerActionBrowser = {
  clipboard?: { writeText(value: string): Promise<void> };
  exports?: ExportBrowser;
};

/** Browser-capability adapter. The feature supplies data, browser code supplies effects. */
export function createExplorerActions(dependencies: {
  i18n: I18n;
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
  const { t } = dependencies.i18n;
  const [status, setStatus] = createSignal("");
  const snapshot = (): ExportSnapshot => ({
    i18n: dependencies.i18n,
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
      if (!dependencies.browser?.clipboard) throw new Error(t("actions.clipboardUnavailable"));
      await dependencies.browser.clipboard.writeText(dependencies.currentUrl());
      setStatus(t("actions.linkCopied"));
    } catch {
      setStatus(t("actions.copyFromAddressBar"));
    }
  };
  const downloadCsv = () => {
    const browser = dependencies.browser?.exports;
    setStatus(
      browser && exportCsv(snapshot(), browser) ? t("actions.csvStarted") : t("actions.csvFailed"),
    );
  };
  const downloadPng = async () => {
    try {
      const browser = dependencies.browser?.exports;
      if (!browser) throw new Error(t("actions.pngUnavailable"));
      await exportPng(snapshot(), browser);
      setStatus(t("actions.pngStarted"));
    } catch (error) {
      setStatus(
        t("actions.pngFailed", {
          reason: error instanceof Error ? error.message : t("actions.unknownError"),
        }),
      );
    }
  };

  return { status, setStatus, copyLink, downloadCsv, downloadPng };
}
