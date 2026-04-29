/**
 * EncounterTable — Wave 14/15.
 *
 * Pure deterministic mapping from `(biome, chunkX, chunkZ, worldSeed)`
 * → list of creature spawns. The populator (separate file) takes that
 * list and builds `CreatureActor`s.
 *
 * Tables are intentionally cozy-floor:
 *   - Meadow daytime: 2-3 rabbits, 0-1 deer, rare 0-1 wolf-pup.
 *   - Forest daytime: 1-2 rabbits, 1-2 deer, occasional 1 wolf-pup.
 *   - Coast daytime: 1-2 rabbits, rare 0-1 deer, rare wolf-pup.
 *   - Grove biome: ALWAYS empty. Sacred. Spec invariant.
 *
 * Hostile rolls use independent thresholds so a hostile encounter
 * feels exceptional, not routine.
 *
 * Spec ref: `docs/superpowers/specs/2026-04-24-grovekeeper-rc-redesign-design.md`
 *   §"Combat and encounters" — encounters biome- and time-of-day-driven.
 *   §"Outer-world chunks vs grove chunks" — groves are sanctuaries.
 */

import type { BiomeId } from "@/game/world/biomes";
import { scopedRNG } from "@/shared/utils/seedRNG";

/** A single creature to spawn at the listed offset within the chunk. */
export interface EncounterSpawn {
  species: string;
  /** Local offset within the chunk in world units (0..chunkSize). */
  localX: number;
  localZ: number;
}

export type TimeOfDay = "day" | "night";

export interface EncounterRollContext {
  biome: BiomeId;
  worldSeed: number;
  chunkX: number;
  chunkZ: number;
  timeOfDay: TimeOfDay;
  /** Chunk size in world units. Used to clamp spawn offsets. */
  chunkSize: number;
}

/**
 * Roll an encounter list for a chunk. Same inputs always produce the
 * same list (deterministic via `scopedRNG('encounter', ...)`).
 */
export function rollEncounters(ctx: EncounterRollContext): EncounterSpawn[] {
  // Grove is the most important rule — sanctuary. No rolls, no override.
  if (ctx.biome === "grove") return [];

  const rng = scopedRNG(
    "encounter",
    ctx.worldSeed,
    ctx.chunkX,
    ctx.chunkZ,
    ctx.timeOfDay,
  );

  const spawns: EncounterSpawn[] = [];
  const placeAt = (species: string) => {
    spawns.push({
      species,
      localX: rng() * ctx.chunkSize,
      localZ: rng() * ctx.chunkSize,
    });
  };

  if (ctx.biome === "meadow") {
    // 2-3 rabbits.
    const rabbits = 2 + Math.floor(rng() * 2);
    for (let i = 0; i < rabbits; i++) placeAt("rabbit");
    // 0-1 deer.
    if (rng() < 0.5) placeAt("deer");
    // Rare wolf-pup (~10% chance).
    if (rng() < 0.1) placeAt("wolf-pup");
  } else if (ctx.biome === "forest") {
    // 1-2 rabbits.
    const rabbits = 1 + Math.floor(rng() * 2);
    for (let i = 0; i < rabbits; i++) placeAt("rabbit");
    // 1-2 deer.
    const deer = 1 + Math.floor(rng() * 2);
    for (let i = 0; i < deer; i++) placeAt("deer");
    // Occasional wolf-pup (~20% chance — denser forest, more wolves).
    if (rng() < 0.2) placeAt("wolf-pup");
  } else if (ctx.biome === "coast") {
    // 1-2 rabbits foraging at the shoreline.
    const rabbits = 1 + Math.floor(rng() * 2);
    for (let i = 0; i < rabbits; i++) placeAt("rabbit");
    // Rare deer (~30% chance — visits coast occasionally).
    if (rng() < 0.3) placeAt("deer");
    // Rare wolf-pup (~8% chance — thinner than forest).
    if (rng() < 0.08) placeAt("wolf-pup");
  }
  // Night-time variant could shift toward more hostile spawns; deferred.

  return spawns;
}
