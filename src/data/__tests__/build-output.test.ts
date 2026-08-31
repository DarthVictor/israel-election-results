import { describe, expect, it } from "vitest";
import { build } from "../build.ts";

describe("build", () => {
  it("imports the five verified sources deterministically", async () => {
    const [first, second] = [await build(), await build()];
    expect(first.elections.map((election) => election.id)).toEqual([21, 22, 23, 24, 25]);
    expect(first.results.map((result) => result.localities.length)).toEqual([
      1214, 1214, 1214, 1215, 1216,
    ]);
    expect(first.unmatchedReport.geometryLocalityCount).toBeGreaterThan(1200);
    // Byte-identical across runs is what makes the content-addressed names stable.
    expect(JSON.stringify(second)).toBe(JSON.stringify(first));
  });

  it("keeps the verified English name authoritative over the Wikipedia one", async () => {
    const parties = (await build()).elections;
    const raam = parties.find((election) => election.id === 24)?.parties.find((p) => p.id === "עם");
    // The article is titled "United Arab List"; sources.ts verifies it as "Ra'am".
    expect(raam?.nameEn).toBe("Ra'am");
    expect(raam?.nameRu).toBe("Объединённый арабский список");
  });

  it("scopes translations to one election, so a reused ballot code cannot leak across", async () => {
    const elections = (await build()).elections;
    const nameFor = (id: number, code: string) =>
      elections.find((election) => election.id === id)?.parties.find((p) => p.id === code);
    // פה is Blue and White in 21-23 and Yesh Atid in 24-25 — two unrelated lists.
    expect(nameFor(21, "פה")?.nameEn).toBe("Blue and White");
    expect(nameFor(25, "פה")?.nameEn).toBe("Yesh Atid");
    expect(nameFor(21, "פה")?.nameRu).not.toBe(nameFor(25, "פה")?.nameRu);
    // 24's ת is New Hope; 25's ת is an unrelated minor list with no article at all.
    expect(nameFor(24, "ת")?.nameRu).toBe("Тиква Хадаша");
    expect(nameFor(25, "ת")?.nameRu).toBeNull();
  });

  it("leaves lists without a curated article untranslated rather than guessing", async () => {
    const untranslated = (await build()).elections
      .flatMap((election) => election.parties)
      .filter((party) => party.nameRu === null);
    expect(untranslated.length).toBeGreaterThan(0);
    // Every list still carries its official Hebrew name, so nothing renders empty.
    expect(untranslated.every((party) => party.nameHe.length > 0)).toBe(true);
  });
});
