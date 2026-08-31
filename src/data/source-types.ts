import type { ElectionId, PartyList } from "../domain/contracts.ts";

/** Curated, officially verified metadata. Russian names are merged in from Wikipedia at build time. */
export type PartyMetadata = Omit<PartyList, "nameRu">;

export type ElectionSource = {
  id: ElectionId;
  date: string;
  label: string;
  /** Official Central Elections Committee results page used to verify this metadata. */
  sourceUrl: string;
  /** Official Central Elections Committee locality-level export used as the raw input. */
  sourceCsvUrl: string;
  /** Immutable locally preserved official locality-results file. */
  rawPath: string;
  parties: readonly PartyMetadata[];
};

export const party = (id: string, nameHe: string, nameEn: string | null = null): PartyMetadata => ({
  id,
  nameHe,
  nameEn,
});
