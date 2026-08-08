/** Minimal declarations for the two untyped build-time TopoJSON packages. */
declare module "topojson-server" {
  import type { GeometryCollection, Topology } from "topojson-specification";

  type LocalityProperties = { localityId: number; nameHe: string; nameEn: string | null };

  export function topology(
    objects: Record<string, unknown>,
    quantization?: number,
  ): Topology<{ localities: GeometryCollection<LocalityProperties> }>;
}

declare module "topojson-simplify" {
  export function presimplify<T>(topology: T): T;
  export function simplify<T>(topology: T, minWeight?: number): T;
}
