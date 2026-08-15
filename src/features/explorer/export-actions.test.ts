import { describe, expect, it } from "vitest";
import type { ExportBrowser, ExportSnapshot } from "./export-actions";
import { exportCsv, exportPng } from "./export-actions";
import { createStaticI18n } from "../../i18n/create-i18n";

const i18n = createStaticI18n("en");

const snapshot: ExportSnapshot = {
  i18n,
  rows: [],
  state: { mode: "explore", election: 25, party: "LIKUD" },
  localityRows: [],
  geometry: [],
  comparisonRows: [],
  comparisonReady: false,
};
const browser: ExportBrowser = {
  downloadText: () => undefined,
  pngFromSvg: async () => new Blob(),
  downloadBlob: () => undefined,
};

describe("export actions", () => {
  it("rejects PNG export until geometry and active locality results are ready", async () => {
    await expect(exportPng(snapshot, browser)).rejects.toThrow("Wait for geometry");
  });
  it("creates CSV through the injected download boundary", () => {
    let contents = "";
    exportCsv(snapshot, {
      ...browser,
      downloadText: (_filename, value) => {
        contents = value;
      },
    });
    expect(contents).toContain("Analysis mode");
  });

  it("reports a failed CSV download through the export action boundary", () => {
    const completed = exportCsv(snapshot, {
      ...browser,
      downloadText: () => {
        throw new Error("Download unavailable");
      },
    });

    expect(completed).toBe(false);
  });
});
