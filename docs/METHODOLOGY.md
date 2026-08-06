# Methodology and data sources

## What this explorer shows

The explorer visualizes final, locality-level results for Knesset elections 21–25:

| Election     | Date              |
| ------------ | ----------------- |
| 21st Knesset | 9 April 2019      |
| 22nd Knesset | 17 September 2019 |
| 23rd Knesset | 2 March 2020      |
| 24th Knesset | 23 March 2021     |
| 25th Knesset | 1 November 2022   |

Results, list names, and ballot-letter codes originate with Israel's Central Elections Committee. The app links directly to the corresponding official results page for every selected election. The election 24 raw export is documented in [data/raw/README.md](../data/raw/README.md); the other preserved source files and normalizer are described in [scripts/README.md](../scripts/README.md).

## How figures are calculated

- **Turnout** is voters divided by eligible voters.
- **List share** is a list's votes divided by valid ballots in the locality.
- **Comparison change** is the B list's share minus the A list's share, in percentage points.
- **Rank** is a locality's rank by list share among mapped localities in the selected election.

The browser loads normalized, static data. The import pipeline checks non-negative counts, duplicate locality identifiers, known ballot codes, the valid-plus-invalid total, and list votes against the declared valid-ballot total before publishing generated assets.

## Limits and careful interpretation

- This is a visualization of final official results, not polling, forecasting, or an endorsement of any list.
- Elections and party lists are selected independently in comparison mode. A comparison does **not** assert continuity between differently named historic lists.
- Some official records have no matching locality boundary or are non-geographic. They remain in national totals where applicable but are excluded from the default locality map and table.
- Boundary matching is based on locality identifiers. Boundary changes, spelling/translation variation, and unavailable English translations can affect display and direct historical comparison.
- The map is designed for exploration. Use the Central Elections Committee as the authoritative reference for legal or official reporting.

## Map and software attribution

The interactive map uses [Leaflet](https://leafletjs.com/). Its optional background tiles use [OpenStreetMap](https://www.openstreetmap.org/copyright), whose attribution remains visible in the app. PNG exports intentionally render the project's local vector geometry rather than tile imagery.
