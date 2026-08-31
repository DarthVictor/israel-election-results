import { assert } from "./assert.ts";

const API = "https://he.wikipedia.org/w/api.php";
const USER_AGENT =
  "israel-election-results/1.0 (https://github.com/DarthVictor/israel-election-results)";
export const TARGET_LANGUAGES = ["en", "ru"] as const;
export type Language = (typeof TARGET_LANGUAGES)[number];

type LangLinksResponse = {
  query?: {
    normalized?: { from: string; to: string }[];
    redirects?: { from: string; to: string }[];
    pages?: { title: string; missing?: boolean; langlinks?: { lang: string; title: string }[] }[];
  };
};

export const stripDisambiguator = (title: string) => title.replace(/\s*\([^()]*\)\s*$/u, "").trim();

export const chunk = <T>(items: readonly T[], size: number): T[][] =>
  items.reduce<T[][]>((batches, item, index) => {
    if (index % size === 0) batches.push([]);
    batches[batches.length - 1].push(item);
    return batches;
  }, []);

export async function fetchTranslationBatch(titles: string[], language: Language) {
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
  const result = (await response.json()) as LangLinksResponse;
  return resolveByRequestedTitle(titles, result);
}

function resolveByRequestedTitle(titles: string[], response: LangLinksResponse) {
  const forward = new Map<string, string>();
  for (const { from, to } of [
    ...(response.query?.normalized ?? []),
    ...(response.query?.redirects ?? []),
  ]) {
    forward.set(from, to);
  }
  const finalTitle = (title: string) => {
    let current = title;
    for (let hop = 0; hop < 4; hop += 1) {
      const next = forward.get(current);
      if (!next) break;
      current = next;
    }
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
}
