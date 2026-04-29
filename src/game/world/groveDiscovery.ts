/**
 * Grove discovery.
 *
 * Tracks which chunk the player Actor is currently inside. On every
 * chunk transition, asks two questions:
 *
 *   1. Did the player just *enter* a grove chunk?
 *      → Persist `discoverGrove(...)` (idempotent — the repo no-ops on
 *        already-discovered groves) and crossfade the audio coordinator
 *        to the grove music bed.
 *
 *   2. Did the player just *leave* a grove chunk?
 *      → Crossfade the audio coordinator back to the surrounding
 *        wilderness biome's music. (Discovery state is permanent.)
 *
 * The "surrounding biome" question is delegated to a caller-supplied
 * resolver (see `biomeAssigner.ts`) to keep this module decoupled.
 *
 * Discovery is *idempotent at the system level*: walking out of a
 * grove and back in does NOT re-trigger the discovery beat. The
 * SQLite write is also idempotent on its own (the repo guards), but
 * we additionally short-circuit at the system level so the audio
 * transition isn't spammed on every step across the chunk boundary.
 */

import { type BiomeId as AudioBiomeId, setBiomeMusic } from "@/audio";
import type { AppDatabase } from "@/db/client";
import { discoverGrove } from "@/db/repos/grovesRepo";
import type { BiomeId } from "./biomes";
import { isGroveChunk } from "./grovePlacement";

export interface GroveDiscoverySystemDeps {
  /** SQLite handle. The system owns NO writes outside this DB. */
  db: AppDatabase;
  /** World id (string PK in the `worlds` table). */
  worldId: string;
  /** World seed used by `isGroveChunk`. */
  worldSeed: number;
  /** Chunk extent in voxels (== CHUNK_TUNING.size, e.g. 16). */
  chunkSize: number;
  /**
   * Resolves the surrounding wilderness biome for a chunk coordinate.
   * Called when the player *leaves* a grove so we know which biome
   * music bed to crossfade back to. `biomeAssigner` is the production
   * source; tests can pass a stub.
   *
   * The function MUST NOT return `"grove"` — the assigner excludes grove
   * from its random distribution. If it ever does, we fall through to
   * `"meadow"` defensively.
   */
  resolveSurroundingBiome: (chunkX: number, chunkZ: number) => BiomeId;
  /**
   * Mintable id for a freshly-discovered grove row. Defaults to a
   * stable string built from the chunk coords; tests can override.
   */
  groveIdFor?: (chunkX: number, chunkZ: number) => string;
}

/** Snapshot of the chunk a player is in. `null` = not yet computed. */
interface ChunkPos {
  chunkX: number;
  chunkZ: number;
}

function defaultGroveId(chunkX: number, chunkZ: number): string {
  // Stable, human-readable, collision-free across a single world.
  // Worlds are namespaced separately by the worldId column.
  return `grove-${chunkX}-${chunkZ}`;
}

/**
 * Build the discovery system. Returns a controller with an
 * `update(playerPos)` you call every frame and a `dispose()` for
 * teardown. The controller is intentionally a closure rather than a
 * class because there's no per-instance lifecycle beyond the cached
 * "last chunk" and "currently-in-grove" flags.
 */
export function createGroveDiscoverySystem(deps: GroveDiscoverySystemDeps) {
  const {
    db,
    worldId,
    worldSeed,
    chunkSize,
    resolveSurroundingBiome,
    groveIdFor = defaultGroveId,
  } = deps;

  let lastChunk: ChunkPos | null = null;
  let lastInGrove = false;

  function chunkOf(x: number, z: number): ChunkPos {
    // Floor-divide is the right operator: world coordinates can be
    // fractional, and negative coords still need to bucket correctly.
    return {
      chunkX: Math.floor(x / chunkSize),
      chunkZ: Math.floor(z / chunkSize),
    };
  }

  function audioBiomeFor(chunkX: number, chunkZ: number): AudioBiomeId {
    const id = resolveSurroundingBiome(chunkX, chunkZ);
    if (id === "grove") {
      // Defensive: assigner contract says it excludes grove, but if
      // it ever leaks one through we don't want to swap to grove
      // music when the player has *left* grove territory.
      return "meadow";
    }
    return id;
  }

  function fireBiomeMusic(biome: AudioBiomeId): void {
    void setBiomeMusic(biome).catch((error) => {
      // eslint-disable-next-line no-console
      console.warn(
        "[grovekeeper] grove discovery: setBiomeMusic failed",
        error,
      );
    });
  }

  function update(playerPos: { x: number; z: number }): void {
    const next = chunkOf(playerPos.x, playerPos.z);
    if (
      lastChunk !== null &&
      lastChunk.chunkX === next.chunkX &&
      lastChunk.chunkZ === next.chunkZ
    ) {
      return; // same chunk, no transition.
    }

    const wasInGrove = lastInGrove;
    const nowInGrove = isGroveChunk(worldSeed, next.chunkX, next.chunkZ);

    if (nowInGrove && !wasInGrove) {
      // ENTER grove. Persist discovery (idempotent at the repo level)
      // and swap the audio bed.
      try {
        discoverGrove(db, {
          id: groveIdFor(next.chunkX, next.chunkZ),
          worldId,
          chunkX: next.chunkX,
          chunkZ: next.chunkZ,
          // Surrounding biome flavor is captured for journal flavor
          // text. We resolve it relative to a neighbor so we don't
          // recurse into "grove flavor for a grove".
          biome: resolveSurroundingBiome(next.chunkX + 1, next.chunkZ),
        });
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error("[grovekeeper] grove discovery: persist failed", error);
      }
      fireBiomeMusic("grove");
    } else if (!nowInGrove && wasInGrove) {
      // LEAVE grove. Restore wilderness music for the new chunk.
      fireBiomeMusic(audioBiomeFor(next.chunkX, next.chunkZ));
    }

    lastChunk = next;
    lastInGrove = nowInGrove;
  }

  /** Reset internal state. Used by tests; benign in production. */
  function reset(): void {
    lastChunk = null;
    lastInGrove = false;
  }

  return { update, reset };
}

export type GroveDiscoverySystem = ReturnType<
  typeof createGroveDiscoverySystem
>;
