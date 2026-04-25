/**
 * EncounterPopulator — Wave 14/15.
 *
 * When `ChunkManager` activates a non-grove chunk, the populator asks
 * `rollEncounters` what to spawn and instantiates `CreatureActor`s
 * for each. On chunk deactivation, the handle's `dispose()` tears
 * them down.
 *
 * Mirrors `GrovePopulator`'s shape exactly — a pure function returning
 * a handle, no internal map, factory injected for testability.
 *
 * Spec ref: `docs/superpowers/specs/2026-04-24-grovekeeper-rc-redesign-design.md`
 *   §"Combat and encounters" — encounter triggers biome- and
 *   time-of-day-driven.
 *   §"Outer-world chunks vs grove chunks" — groves get NO encounters.
 */

import type { Actor } from "@jolly-pixel/engine";
import { getCreatureDef } from "@/content/creatures";
import type { BiomeId } from "@/game/world/biomes";
import worldConfig from "@/game/world/world.config.json";
import { scopedRNG } from "@/shared/utils/seedRNG";
import { CreatureActor } from "./CreatureActor";
import {
  type EncounterSpawn,
  rollEncounters,
  type TimeOfDay,
} from "./EncounterTable";

/** Public handle returned by `populateEncounters`. */
export interface PopulatedEncounters {
  chunkX: number;
  chunkZ: number;
  biome: BiomeId;
  /** All actors spawned for this chunk. */
  creatures: readonly CreatureActor[];
  /** Tear down all spawned actors. Idempotent. */
  dispose(): void;
}

/** Factory the host wires to engine `world.spawnActor()` semantics. */
export interface ActorFactory {
  createActor(): Actor;
}

export interface PopulateEncountersOptions {
  worldSeed: number;
  chunkX: number;
  chunkZ: number;
  biome: BiomeId;
  /** World-Y the creatures stand on (chunk surface + 1). */
  surfaceY: number;
  factory: ActorFactory;
  timeOfDay?: TimeOfDay;
  /**
   * Optional callback for hostile-creature attacks landing on the
   * player. Production wires this to the combat system. Tests can
   * record calls.
   */
  onPlayerHit?: (damage: number, creatureId: string) => void;
}

const SIZE = worldConfig.chunkSize;

/** Stable id for a creature spawned in a chunk. */
export function creatureId(
  chunkX: number,
  chunkZ: number,
  index: number,
  species: string,
): string {
  return `creature-${chunkX}-${chunkZ}-${index}-${species}`;
}

/**
 * Spawn the rolled encounters for a chunk. Returns a handle the
 * caller must `dispose()` on chunk deactivate.
 */
export function populateEncounters(
  options: PopulateEncountersOptions,
): PopulatedEncounters {
  const { worldSeed, chunkX, chunkZ, biome, surfaceY, factory } = options;
  const timeOfDay = options.timeOfDay ?? "day";

  const spawns: EncounterSpawn[] = rollEncounters({
    biome,
    worldSeed,
    chunkX,
    chunkZ,
    timeOfDay,
    chunkSize: SIZE,
  });

  const creatures: CreatureActor[] = [];
  const chunkOriginX = chunkX * SIZE;
  const chunkOriginZ = chunkZ * SIZE;

  for (let i = 0; i < spawns.length; i++) {
    const sp = spawns[i];
    const def = getCreatureDef(sp.species);
    if (!def) {
      // Unknown species in the table — skip rather than crash. This
      // path is hard to hit in production (table is curated), but
      // robustness here keeps a stale config from crashing the loader.
      continue;
    }

    const actor = factory.createActor();
    const id = creatureId(chunkX, chunkZ, i, sp.species);
    const creature = new CreatureActor(actor, {
      spawn: {
        x: chunkOriginX + sp.localX,
        y: surfaceY,
        z: chunkOriginZ + sp.localZ,
      },
      creatureId: id,
      def,
      // Per-creature wander RNG — independent of the encounter roll
      // so wander variation doesn't reshuffle the spawn map.
      random: scopedRNG("creature-wander", worldSeed, chunkX, chunkZ, i),
      onPlayerHit: options.onPlayerHit,
    });
    creature.awake();
    creatures.push(creature);
  }

  let disposed = false;
  return {
    chunkX,
    chunkZ,
    biome,
    creatures,
    dispose() {
      if (disposed) return;
      disposed = true;
      // Production: each ActorComponent's host actor is torn down by
      // the engine when the chunk is disposed; we just mark the
      // handle so double-dispose is a no-op (matches GrovePopulator).
    },
  };
}
