/**
 * Creature catalog — loaded from `creatures.json`.
 *
 * `getCreatureDef(species)` is the single read path; everything else
 * (CreatureActor, EncounterTable, EncounterPopulator) flows through it
 * so swapping JSON entries doesn't ripple into code. Returns
 * `undefined` for unknown species — call sites should treat that as a
 * hard error since species ids come from `EncounterTable`'s curated
 * list, not user input.
 */

import raw from "./creatures.json";
import type { CreatureDef } from "./types";

const TABLE: Record<string, CreatureDef> = raw as Record<string, CreatureDef>;

/** Return the `CreatureDef` for a species id, or `undefined` if unknown. */
export function getCreatureDef(species: string): CreatureDef | undefined {
  return TABLE[species];
}

/** All known species ids in the catalog. Stable across calls. */
export function listCreatureSpecies(): readonly string[] {
  return Object.keys(TABLE);
}

export type { CreatureDef, Hostility } from "./types";
