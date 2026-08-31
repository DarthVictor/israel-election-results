import { describe, expect, it } from "vitest";
import { englishNamesFrom, readLocalities, toTopology } from "../localities.ts";
import { fixtureFile } from "./data-build-fixtures.ts";

describe("readLocalities", () => {
  it("keeps only client fields, sorts by locality ID, and builds simplified TopoJSON", async () => {
    const path = await fixtureFile(
      JSON.stringify({
        type: "FeatureCollection",
        features: [
          {
            properties: { SEMEL_YISHUV: 9, SHEM_YISHUV: "בית", SHEM_YISHUV_ENGLISH: "" },
            geometry: {
              type: "Polygon",
              coordinates: [
                [
                  [1, 1],
                  [2, 1],
                  [2, 2],
                  [1, 1],
                ],
              ],
            },
          },
          {
            properties: {
              SEMEL_YISHUV: 7,
              SHEM_YISHUV: "שחר",
              SHEM_YISHUV_ENGLISH: "SHAHAR",
              x: 1,
            },
            geometry: {
              type: "Polygon",
              coordinates: [
                [
                  [0, 0],
                  [1, 0],
                  [1, 1],
                  [0, 0],
                ],
              ],
            },
          },
        ],
      }),
      "localities.json",
    );
    const localities = await readLocalities(path);
    expect(localities.features.map((feature) => feature.properties)).toEqual([
      { localityId: 7, nameHe: "שחר", nameEn: "SHAHAR" },
      { localityId: 9, nameHe: "בית", nameEn: null },
    ]);
    expect(englishNamesFrom(localities).get(7)).toBe("SHAHAR");

    const topology = toTopology(localities);
    expect(topology.objects.localities.type).toBe("GeometryCollection");
    expect(topology.arcs.length).toBeGreaterThan(0);
  });
});
