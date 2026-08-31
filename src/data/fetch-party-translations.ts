import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { assert } from "./assert.ts";
import type { TranslatedNames, WikipediaTitles } from "./party-names.ts";
import {
  chunk,
  fetchTranslationBatch,
  type Language,
  stripDisambiguator,
  TARGET_LANGUAGES,
} from "./wikipedia-translation-api.ts";

const repoRoot = resolve(fileURLToPath(new URL("../..", import.meta.url)));
const titlesPath = resolve(repoRoot, "data/raw/party-wikipedia.json");
const namesPath = resolve(repoRoot, "data/raw/party-names.json");

const BATCH = 50;

export const fetchTranslations = async (titles: WikipediaTitles): Promise<TranslatedNames> => {
  const wanted = [...new Set(Object.values(titles).filter((title) => title !== null))].sort();
  const byTitle = new Map(wanted.map((title) => [title, {} as Record<Language, string | null>]));
  const missing = new Set<string>();
  const untranslated: string[] = [];

  for (const language of TARGET_LANGUAGES) {
    for (const batch of chunk(wanted, BATCH)) {
      const pages = await fetchTranslationBatch(batch, language);
      for (const [title, page] of pages) {
        if (page.missing) {
          missing.add(title);
          continue;
        }
        const link = page.langlinks?.find((entry) => entry.lang === language);
        if (!link) untranslated.push(`${title} (${language})`);
        const names = byTitle.get(title);
        assert(names !== undefined, `Missing translation entry for ${title}`);
        names[language] = link ? stripDisambiguator(link.title) : null;
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
      .sort(([left], [right]) => left.localeCompare(right))
      .flatMap(([key, title]) => {
        if (title === null) return [];
        const names = byTitle.get(title);
        return [[key, { en: names?.en ?? null, ru: names?.ru ?? null }]];
      }),
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
