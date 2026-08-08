import { expect, test } from "@playwright/test";

const LOCALITY_ID = 3000;

test("keyboard skip link moves focus to the explorer content", async ({ page }) => {
  await page.goto("/");
  const skipLink = page.getByRole("link", { name: "Skip to election explorer" });

  await page.keyboard.press("Tab");
  await expect(skipLink).toBeFocused();
  await expect(skipLink).toBeVisible();
  await page.keyboard.press("Enter");

  await expect(page.locator("#explorer-content")).toBeFocused();
});

test("search selection updates the shareable URL", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByTestId("election-select")).toHaveValue("25");
  await expect(page.getByTestId("party-select")).toHaveValue("");
  await expect(page.getByTestId("no-party-selected")).toBeVisible();

  await page.getByTestId("locality-search").fill("Jerusalem");
  const match = page.getByTestId(`locality-match-${LOCALITY_ID}`);
  await expect(match).toBeVisible();
  await match.click();

  await expect(page.getByTestId("selected-locality")).toBeVisible();
  const breakdown = page.getByTestId("party-breakdown");
  await expect(breakdown.getByRole("listitem")).toHaveCount(40);
  await expect(breakdown.locator(".party-name").first()).toHaveAttribute("title", / · /);
  expect(await breakdown.evaluate((list) => list.scrollWidth <= list.clientWidth)).toBe(true);
  await expect(page).toHaveURL(new RegExp(`locality=${LOCALITY_ID}`));
});

test("shows source attribution", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("contentinfo")).toContainText("Central Elections Committee");
  await expect(page.getByRole("link", { name: "Official results" })).toHaveAttribute(
    "href",
    "https://votes25.bechirot.gov.il/nationalresults",
  );
  await expect(page.getByRole("link", { name: "Download locality CSV" })).toHaveAttribute(
    "href",
    "https://media25.bechirot.gov.il/files/expc.csv",
  );
});

test("a map locality click selects that locality", async ({ page }) => {
  await page.goto("/");
  const localityPath = page.getByTestId(`map-locality-${LOCALITY_ID}`);
  await expect(localityPath).toBeVisible();
  await localityPath.click({ force: true });

  await expect(page.getByTestId("selected-locality")).toBeVisible();
  await expect(page).toHaveURL(new RegExp(`locality=${LOCALITY_ID}`));
});

test("a failed selected-election request clears stale output and can retry", async ({ page }) => {
  let attempts = 0;
  await page.route(/\/data\/generated\/election-25\.[a-f0-9]+\.json$/, async (route) => {
    attempts += 1;
    if (attempts === 1) {
      await route.fulfill({ status: 503, contentType: "application/json", body: "{}" });
      return;
    }
    await route.continue();
  });

  await page.goto("/");
  await expect(page.getByTestId("load-error")).toBeVisible();
  await expect(page.getByTestId("map-unavailable")).toContainText("unavailable");
  await page.getByTestId("retry-load").click();
  await expect(page.getByTestId("leaflet-map")).toBeVisible();
  await expect(page.getByTestId("map-unavailable")).toHaveCount(0);
  expect(attempts).toBe(2);
});

test("a shared explore URL restores election, list, and locality", async ({ page }) => {
  await page.goto(`/?mode=explore&election=25&party=%D7%9E%D7%97%D7%9C&locality=${LOCALITY_ID}`);

  await expect(page.getByTestId("election-select")).toHaveValue("25");
  await expect(page.getByTestId("party-select")).toHaveValue("מחל");
  await expect(page.getByTestId("no-party-selected")).toHaveCount(0);
  await expect(page.getByTestId("selected-locality")).toBeVisible();
  await expect(page.getByTestId("party-breakdown")).toBeVisible();
});

test("compare mode loads independent A and B list controls and encodes them in the link", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByTestId("party-select")).toHaveValue("");
  await page.getByTestId("mode-compare").click();
  await expect(page.getByTestId("comparison-controls")).toBeVisible();
  await expect(page.getByTestId("compare-election-select")).toBeVisible();
  await expect(page.getByTestId("compare-party-select")).toBeVisible();
  await expect(page.getByTestId("party-select")).not.toHaveValue("");
  const comparisonParams = new URL(page.url()).searchParams;
  expect(comparisonParams.get("mode")).toBe("compare");
  expect(comparisonParams.get("party")).not.toBeFalsy();
  expect(comparisonParams.get("compareElection")).not.toBeFalsy();
  expect(comparisonParams.get("compareParty")).not.toBeFalsy();
  await page.getByTestId("locality-search").fill("Jerusalem");
  await page.getByTestId(`locality-match-${LOCALITY_ID}`).click();
  await expect(page.getByTestId("selected-locality")).toContainText("Independent A / B");
});

test("leaving party-less Explore for Table chooses and serializes a valid party", async ({
  page,
}) => {
  await page.goto("/?mode=explore&election=25");
  await expect(page.getByTestId("party-select")).toHaveValue("");

  await page.getByTestId("mode-table").click();

  await expect(page.getByTestId("party-select")).not.toHaveValue("");
  await expect(page).toHaveURL(/mode=table/);
  await expect(page).toHaveURL(/party=/);
});

test("a shared comparison URL restores the comparison table and delta column", async ({ page }) => {
  await page.goto(
    "/?mode=compare&election=25&party=%D7%9E%D7%97%D7%9C&compareElection=24&compareParty=%D7%A4%D7%94",
  );
  await expect(page.getByTestId("comparison-controls")).toBeVisible();
  const table = page.getByTestId("table-panel");
  await expect(table).toBeVisible();
  await expect(table.getByRole("columnheader", { name: /pp/ })).toBeVisible();
});

test("table filters select a locality and exports the current analysis", async ({ page }) => {
  await page.goto("/");
  await page.getByTestId("mode-table").click();
  const table = page.getByTestId("table-panel");
  await expect(table).toBeVisible();
  await table.getByLabel("Min valid ballots").fill("1000");
  await expect(table).toContainText("mapped localities");
  const download = page.waitForEvent("download");
  await page.getByTestId("export-csv").click();
  await expect((await download).suggestedFilename()).toBe("israel-election-analysis.csv");
  await table.locator("tbody button").first().click();
  await expect(page).toHaveURL(/locality=\d+/);
});

test.describe("mobile explorer", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("keeps the map visible behind a collapsed, expandable analysis sheet", async ({ page }) => {
    await page.goto("/");
    const sheet = page.getByTestId("analysis-panel");
    const map = page.getByTestId("leaflet-map");

    await expect(page.getByTestId("bottom-sheet-toggle")).toHaveAttribute("aria-expanded", "false");
    await expect(map).toBeVisible();
    const mapBox = await map.boundingBox();
    expect(mapBox?.height).toBeGreaterThan(500);

    await page.getByTestId("bottom-sheet-toggle").click();
    await expect(page.getByTestId("bottom-sheet-toggle")).toHaveAttribute("aria-expanded", "true");
    await expect(sheet.getByTestId("election-select")).toBeVisible();
  });
});
