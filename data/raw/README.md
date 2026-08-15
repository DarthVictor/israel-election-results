# Raw election sources

Keep source CSV/XLS files here without manual edits. The normalization script in
`src/data/` reads these artifacts and produces versioned browser data files.

All five election CSVs in this directory are final locality-level exports retrieved
from the Central Elections Committee on 2026-08-05 and are preserved byte for byte.
The pipeline uses these files as its only election input.

`localities.json` is the boundary source used to generate the compact TopoJSON map
asset. It is derived from the Central Bureau of Statistics statistical-areas layer,
re-serialized as GeoJSON with Hebrew locality names decoded and unused properties
removed; unlike the election CSVs it is not a byte-preserved original.

## Official locality exports

| Election | Official results page                                  | Official locality CSV                            | Encoding     |
| -------- | ------------------------------------------------------ | ------------------------------------------------ | ------------ |
| 21       | <https://votes21.bechirot.gov.il/cityresults?cityID=0> | <https://media21.bechirot.gov.il/files/expc.csv> | UTF-8        |
| 22       | <https://votes22.bechirot.gov.il/cityresults?cityID=0> | <https://media22.bechirot.gov.il/files/expc.csv> | UTF-8        |
| 23       | <https://votes23.bechirot.gov.il/cityresults?cityID=0> | <https://media23.bechirot.gov.il/files/expc.csv> | UTF-8        |
| 24       | <https://votes24.bechirot.gov.il/cityresults?cityID=0> | <https://media24.bechirot.gov.il/files/expc.csv> | Windows-1255 |
| 25       | <https://votes25.bechirot.gov.il/cityresults?cityID=0> | <https://media25.bechirot.gov.il/files/expc.csv> | UTF-8        |

## Election 24

`polls_24.csv` is decoded explicitly as Windows-1255:

- Results page: <https://votes24.bechirot.gov.il/cityresults?cityID=0>
- Direct official export: <https://media24.bechirot.gov.il/files/expc.csv>

All election list names and ballot codes are verified against each election's
official Central Elections Committee national-results page in
`src/data/sources.ts`.

## List name translations

`party-wikipedia.json` and `party-names.json` are **not** Central Elections Committee
sources and carry none of the verification the files above do.

`party-wikipedia.json` is hand-curated: one Hebrew Wikipedia article title, or `null`,
for every list in every election. It is keyed by election and ballot code together,
because codes are reused between elections by unrelated lists — `פה` is Blue and White
in elections 21–23 and Yesh Atid in 24–25 — and a translation must never imply that two
differently named lists are the same political entity. For the same reason elections
21–23 point at the Blue and White _alliance_ article while election 24 points at the
_party_ article.

`party-names.json` is generated from those titles by `pnpm data:translations`, which
reads the English and Russian interlanguage links of each article. It is committed so
that `pnpm data:build` stays offline and deterministic; rerun it only when the curated
titles change. The fetch resolves redirects and strips article disambiguators, and it
fails rather than guessing when a curated title matches no article — but a title that
resolves to the wrong subject cannot be detected automatically, so review the fetched
names before committing them.

The build treats these names as a fallback, not a correction: the verified `nameEn`
values in `src/data/sources.ts` always win, and Wikipedia only fills lists that have no
verified English name and supplies Russian, which is never curated by hand.
