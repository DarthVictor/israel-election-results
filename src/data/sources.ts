import { election21 } from "./source-21.ts";
import { election22 } from "./source-22.ts";
import { election23 } from "./source-23.ts";
import { election24 } from "./source-24.ts";
import { election25 } from "./source-25.ts";
import type { ElectionSource } from "./source-types.ts";

export type { ElectionSource } from "./source-types.ts";

export const ELECTION_SOURCES: readonly ElectionSource[] = [
  election21,
  election22,
  election23,
  election24,
  election25,
];
