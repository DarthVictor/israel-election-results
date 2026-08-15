import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { assert } from "./assert.ts";
import type { TranslatedNames, WikipediaTitles } from "./party-names.ts";

const repoRoot = resolve(fileURLToPath(new URL("../..", import.meta.url)));
const titlesPath = resolve(repoRoot, "data/raw/party-wikipedia.json");
const namesPath = resolve(repoRoot, "data/raw/party-names.json");

const API = "https://he.wikipedia.org/w/api.php";
// Wikimedia asks automated clients to identify themselves and a way to be contacted.
const USER_AGENT =
  "israel-election-results/1.0 (https://github.com/DarthVictor/israel-election-results)";
/** The API caps prop=langlinks queries at 50 titles per request for unprivileged clients. */
const BATCH = 50;
const TARGET_LANGUAGES = ["en", "ru"] as const;

type Language = (typeof TARGET_LANGUAGES)[number];

type LangLinksResponse = {
  query?: {
    normalized?: { from: string; to: string }[];
    redirects?: { from: string; to: string }[];
    pages?: { title: string; missing?: boolean; langlinks?: { lang: string; title: string }[] }[];
  };
};

/**
 * Article titles carry disambiguators the ballot never does — "Tzomet (political party)",
 * "צומת (מפלגה)", "Авода (партия)" — which read as noise beside an official list name.
 */
const stripDisambiguator = (title: string) => title.replace(/\s*\([^()]*\)\s*$/u, "").trim();

const chunk = <T>(items: readonly T[], size: number): T[][] =>
  items.reduce<T[][]>((batches, item, index) => {
    if (index % size === 0) batches.push([]);
    batches[batches.length - 1].push(item);
    return batches;
  }, []);

const fetchBatch = async (titles: string[], language: Language) => {
  const url = new URL(API);
  url.search = new URLSearchParams({
    action: "query",
    format: "json",
    formatversion: "2",
    prop: "langlinks",
    lllang: language,
    lllimit: "500",
    redirects: "1",
    titles: titles.join("|"),
  }).toString();

  const response = await fetch(url, { headers: { "user-agent": USER_AGENT } });
  assert(response.ok, `he.wikipedia responded ${response.status} for ${titles.length} titles`);
  return (await response.json()) as LangLinksResponse;
};

/**
 * Requested titles reach the response through normalisation and redirects, so the reply
 * is keyed by the final article title. Following both hops back is what lets the curated
 * map hold the name a reader would recognise rather than the canonical article title.
 */
const resolveByRequestedTitle = (titles: string[], response: LangLinksResponse) => {
  const forward = new Map<string, string>();
  for (const { from, to } of [
    ...(response.query?.normalized ?? []),
    ...(response.query?.redirects ?? []),
  ]) {
    forward.set(from, to);
  }
  const finalTitle = (title: string) => {
    let current = title;
    // Normalisation and redirect are at most one hop each, and the cap stops a redirect loop.
    for (let hop = 0; hop < 4 && forward.has(current); hop += 1) current = forward.get(current)!;
    return current;
  };

  const pages = new Map((response.query?.pages ?? []).map((page) => [page.title, page]));
  return new Map(
    titles.map((title) => {
      const page = pages.get(finalTitle(title));
      assert(page !== undefined, `he.wikipedia returned no page for ${title}`);
      return [title, page];
    }),
  );
};

export const fetchTranslations = async (titles: WikipediaTitles): Promise<TranslatedNames> => {
  const wanted = [...new Set(Object.values(titles).filter((title) => title !== null))].sort();
  const byTitle = new Map(wanted.map((title) => [title, {} as Record<Language, string | null>]));
  const missing = new Set<string>();
  const untranslated: string[] = [];

  for (const language of TARGET_LANGUAGES) {
    for (const batch of chunk(wanted, BATCH)) {
      const pages = resolveByRequestedTitle(batch, await fetchBatch(batch, language));
      for (const [title, page] of pages) {
        if (page.missing) {
          missing.add(title);
          continue;
        }
        const link = page.langlinks?.find((entry) => entry.lang === language);
        if (!link) untranslated.push(`${title} (${language})`);
        byTitle.get(title)![language] = link ? stripDisambiguator(link.title) : null;
      }
    }
  }

  assert(
    missing.size === 0,
    `he.wikipedia has no article titled: ${[...missing].join(", ")}. Correct data/raw/party-wikipedia.json.`,
  );
  if (untranslated.length > 0) {
    console.warn(`No interlanguage link for: ${untranslated.join(", ")}`);
  }

  // Sorted keys keep the generated file's diff readable and its bytes stable across runs.
  return Object.fromEntries(
    Object.entries(titles)
      .filter(([, title]) => title !== null)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, title]) => [
        key,
        { en: byTitle.get(title!)!.en ?? null, ru: byTitle.get(title!)!.ru ?? null },
      ]),
  );
};

const run = async () => {
  const titles = JSON.parse(await readFile(titlesPath, "utf8")) as WikipediaTitles;
  const names = await fetchTranslations(titles);
  await writeFile(namesPath, `${JSON.stringify(names, null, 2)}\n`, "utf8");
  const translated = Object.values(names).filter((name) => name.en ?? name.ru).length;
  console.log(
    `Fetched interlanguage names for ${translated} of ${Object.keys(titles).length} party lists into data/raw/party-names.json.`,
  );
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await run();
}
