import { type ExportSnapshot, exportCsv, exportPng } from "../export-actions";
import type { LocalityStatistic } from "../locality-statistics";
import type { createElectionResultsSelectors } from "./election-results-selectors";
import type { ElectionResultsDependencies, ElectionState } from "./election-results-store.types";
import type { createSelectionActions } from "./selection-actions";

export function createExportActions(
  state: ElectionState,
  selectors: ReturnType<typeof createElectionResultsSelectors>,
  selection: ReturnType<typeof createSelectionActions>,
  dependencies: ElectionResultsDependencies,
) {
  const snapshot = (statistics: readonly LocalityStatistic[]): ExportSnapshot => ({
    i18n: dependencies.i18n,
    statistics,
    state: state.analysis,
    election: selectors.election(),
    party: selectors.party(),
    compareElection: selectors.comparisonElection(),
    compareParty: selectors.comparisonParty(),
    comparisonLocalities: selectors.comparisonLocalities(),
    comparisonReady: selectors.comparisonReady(),
    boundaries: state.boundaries,
    localities: selectors.localities(),
  });
  const copyLink = async () => {
    if (state.manifest) selection.write(state.analysis, true);
    try {
      if (!dependencies.browser?.clipboard) {
        throw new Error(dependencies.i18n.t("actions.clipboardUnavailable"));
      }
      await dependencies.browser.clipboard.writeText(dependencies.history.href());
      return dependencies.i18n.t("actions.linkCopied");
    } catch {
      return dependencies.i18n.t("actions.copyFromAddressBar");
    }
  };
  const downloadCsv = (statistics: readonly LocalityStatistic[]) => {
    const browser = dependencies.browser?.exports;
    return browser && exportCsv(snapshot(statistics), browser)
      ? dependencies.i18n.t("actions.csvStarted")
      : dependencies.i18n.t("actions.csvFailed");
  };
  const downloadPng = async (statistics: readonly LocalityStatistic[]) => {
    try {
      const browser = dependencies.browser?.exports;
      if (!browser) throw new Error(dependencies.i18n.t("actions.pngUnavailable"));
      await exportPng(snapshot(statistics), browser);
      return dependencies.i18n.t("actions.pngStarted");
    } catch (error) {
      return dependencies.i18n.t("actions.pngFailed", {
        reason:
          error instanceof Error ? error.message : dependencies.i18n.t("actions.unknownError"),
      });
    }
  };
  return { copyLink, downloadCsv, downloadPng };
}
