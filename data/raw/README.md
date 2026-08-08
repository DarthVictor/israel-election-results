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
