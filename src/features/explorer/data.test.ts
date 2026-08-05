import { afterEach, describe, expect, it, vi } from "vitest";
import type { ElectionResultsFile } from "../../domain/contracts";
import { loadElection } from "./data";

const resultFile: ElectionResultsFile = {
  schemaVersion: 1,
  electionId: 25,
  localities: [],
  unmatchedLocalityIds: [],
  nonGeographicLocalityIds: [],
};

afterEach(() => vi.unstubAllGlobals());

describe("loadElection", () => {
  it("shares and reuses successful content-addressed result loads", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(resultFile)));
    vi.stubGlobal("fetch", fetchMock);

    const url = "/data/generated/election-25.abc123.json";
    const [first, second] = await Promise.all([loadElection(url), loadElection(url)]);
    const third = await loadElection(url);

    expect(first).toEqual(resultFile);
    expect(second).toEqual(resultFile);
    expect(third).toEqual(resultFile);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("evicts rejected loads so retrying the same URL issues a fresh request", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response("unavailable", { status: 503 }))
      .mockResolvedValueOnce(new Response(JSON.stringify(resultFile)));
    vi.stubGlobal("fetch", fetchMock);

    const url = "/data/generated/election-25.retry.json";
    await expect(loadElection(url)).rejects.toThrow("Could not load data (503).");
    await expect(loadElection(url)).resolves.toEqual(resultFile);

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
