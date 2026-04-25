/**
 * ChunkManager — owns the streamed 2D grid of `ChunkActor`s around the
 * player. Wave 9 turns Wave 7's single fixed chunk into an infinite
 * patchwork: chunks within `activeRadius` of the player are live; chunks
 * outside `bufferRadius` are unloaded; the band between the two is
 * "hot" — for RC we treat it as fully active too (no LOD swap yet).
 *
 * Streaming algorithm (called every frame from the runtime tick):
 *   1. Compute the player's current chunk: `floor(pos / chunkSize)`.
 *   2. Walk the active disc; spawn any chunk that doesn't yet exist,
 *      capped at `spawnsPerFrame` to avoid GPU upload hitches.
 *   3. Walk every live chunk; despawn anything that drifted outside
 *      the buffer disc, capped at `despawnsPerFrame`.
 *
 * Determinism: biome assignment is delegated to `assignBiome`, which
 * keys off `(worldSeed, chunkX, chunkZ)` via `scopedRNG`. Same seed +
 * same chunk coord ⇒ same biome forever.
 *
 * The pattern is engine-level identical to voxel-realms'
 * `TerrainBehavior` (one `VoxelRenderer` per chunk actor); the
 * high-level "what to keep loaded" logic is Grovekeeper-specific
 * because voxel-realms streams a vertical platform stack, not a 2D
 * grid.
 */

import { assignBiome } from "./biomeAssigner";
import type { BiomeId } from "./biomes";
import { ChunkActor } from "./ChunkActor";
import { CHUNK_TUNING } from "./chunkGenerator";

/**
 * Minimal subset of the JP engine `World` API the manager actually
 * needs. Pinning to a structural subset keeps the manager easy to
 * unit-test (we hand it a POJO) and decoupled from engine type
 * surface changes.
 */
interface ChunkManagerWorld {
  // biome-ignore lint/suspicious/noExplicitAny: Actor has many type params we don't care about.
  createActor(name: string): any;
}

/** Tunables for one streaming density tier (desktop vs mobile). */
export interface StreamingDensityConfig {
  activeRadius: number;
  bufferRadius: number;
}

/** Full streaming tunables, including per-frame budget caps. */
export interface ChunkManagerStreamingConfig extends StreamingDensityConfig {
  /** Max chunks we'll spawn this frame. Soft cap, prevents GPU hitches. */
  spawnsPerFrame: number;
  /** Max chunks we'll despawn this frame. */
  despawnsPerFrame: number;
}

/**
 * Anything with `{ x, y, z }` works — caller passes either a
 * `THREE.Vector3` or the `PlayerActor.position` accessor's plain
 * object. Y is ignored; streaming is 2D.
 */
export interface PlayerPositionRef {
  x: number;
  y: number;
  z: number;
}

/**
 * Lifecycle callbacks fired by the streamer as it spawns / despawns
 * chunks. Wave 10 uses `onChunkSpawned` to drape the grove glow over
 * grove biome chunks; future waves can hook the same edge for NPC
 * spawns, lighting tweaks, etc.
 */
export interface ChunkManagerHooks {
  /**
   * Fired right after a chunk is spawned and registered with the
   * manager. The actor's load is in flight (async) when this fires —
   * callers wanting to mutate the rendered mesh should `await
   * actor.whenLoaded()` before walking its scene graph.
   */
  onChunkSpawned?: (info: {
    chunkX: number;
    chunkZ: number;
    biome: BiomeId;
    actor: ChunkActor;
  }) => void;
  /**
   * Fired immediately *before* a chunk's actor is disposed, so the
   * caller can release any side-channel resources (Wave 10: grove
   * glow handles, firefly buffers).
   */
  onChunkDespawned?: (info: { chunkX: number; chunkZ: number }) => void;
}

export interface ChunkManagerOptions {
  /** Engine world handle, used to spawn child Actors per chunk. */
  world: ChunkManagerWorld;
  /** Mutable position the manager polls each frame. */
  playerPosition: PlayerPositionRef;
  /** World seed forwarded to biome assigner + chunk generator. */
  worldSeed: number;
  /** Streaming radii + per-frame caps. */
  streaming: ChunkManagerStreamingConfig;
  /** Optional spawn/despawn hooks (Wave 10). */
  hooks?: ChunkManagerHooks;
  /**
   * Optional source of player block modifications per chunk. Forwarded
   * to each `ChunkActor` so reloads restore player builds. Wave 12
   * plumbs `chunksRepo.getModifiedBlocks` in here.
   */
  modProvider?: (
    chunkX: number,
    chunkZ: number,
  ) => readonly import("./ChunkActor").ChunkBlockMod[];
}

interface ChunkSlot {
  actor: ChunkActor;
  chunkX: number;
  chunkZ: number;
}

/** Stable string key for `(chunkX, chunkZ)` map lookups. */
function chunkKey(chunkX: number, chunkZ: number): string {
  return `${chunkX},${chunkZ}`;
}

export class ChunkManager {
  private readonly world: ChunkManagerWorld;
  private readonly playerPosition: PlayerPositionRef;
  private readonly worldSeed: number;
  private readonly streaming: ChunkManagerStreamingConfig;
  private readonly hooks: ChunkManagerHooks;

  private chunks = new Map<string, ChunkSlot>();
  private disposed = false;
  private readonly modProvider:
    | ((
        chunkX: number,
        chunkZ: number,
      ) => readonly import("./ChunkActor").ChunkBlockMod[])
    | undefined;

  constructor(options: ChunkManagerOptions) {
    this.world = options.world;
    this.playerPosition = options.playerPosition;
    this.worldSeed = options.worldSeed;
    this.streaming = { ...options.streaming };
    this.hooks = options.hooks ?? {};
    this.modProvider = options.modProvider;
  }

  /** Total chunks currently live. Useful for tests + perf overlays. */
  get loadedChunkCount(): number {
    return this.chunks.size;
  }

  /** All currently-live chunk coordinates as `[chunkX, chunkZ]` tuples. */
  loadedChunkCoords(): Array<[number, number]> {
    const out: Array<[number, number]> = [];
    for (const slot of this.chunks.values()) {
      out.push([slot.chunkX, slot.chunkZ]);
    }
    return out;
  }

  /** Look up a single live chunk by its grid coords. */
  getChunk(chunkX: number, chunkZ: number): ChunkActor | null {
    return this.chunks.get(chunkKey(chunkX, chunkZ))?.actor ?? null;
  }

  /**
   * Run one streaming frame. Idempotent — calling twice with no
   * player movement spawns/despawns nothing the second time.
   */
  update(): void {
    if (this.disposed) return;

    const size = CHUNK_TUNING.size;
    const px = Math.floor(this.playerPosition.x / size);
    const pz = Math.floor(this.playerPosition.z / size);

    // ---- spawn pass ----
    let spawnsRemaining = this.streaming.spawnsPerFrame;
    const r = this.streaming.activeRadius;
    // Walk the disc nearest-first so closer-to-player chunks always
    // win the per-frame spawn budget over distant ones.
    for (let ring = 0; ring <= r && spawnsRemaining > 0; ring++) {
      for (let dz = -ring; dz <= ring && spawnsRemaining > 0; dz++) {
        for (let dx = -ring; dx <= ring && spawnsRemaining > 0; dx++) {
          // Only emit cells *on* the current ring, not the whole filled
          // square (which we already covered on prior rings).
          if (Math.max(Math.abs(dx), Math.abs(dz)) !== ring) continue;
          const cx = px + dx;
          const cz = pz + dz;
          if (this.chunks.has(chunkKey(cx, cz))) continue;
          this.spawnChunk(cx, cz);
          spawnsRemaining--;
        }
      }
    }

    // ---- despawn pass ----
    let despawnsRemaining = this.streaming.despawnsPerFrame;
    const buf = this.streaming.bufferRadius;
    // Iterate a snapshot so we can mutate `this.chunks` mid-loop.
    for (const [key, slot] of Array.from(this.chunks.entries())) {
      if (despawnsRemaining <= 0) break;
      const dx = slot.chunkX - px;
      const dz = slot.chunkZ - pz;
      // Chebyshev distance — same metric we used to pick the active
      // square — so the buffer ring is a square of side `2*buf+1`.
      if (Math.max(Math.abs(dx), Math.abs(dz)) > buf) {
        try {
          this.hooks.onChunkDespawned?.({
            chunkX: slot.chunkX,
            chunkZ: slot.chunkZ,
          });
        } catch (error) {
          // eslint-disable-next-line no-console
          console.error("[grovekeeper] onChunkDespawned hook threw", error);
        }
        slot.actor.dispose();
        this.chunks.delete(key);
        despawnsRemaining--;
      }
    }
  }

  /** Tear everything down. Idempotent. */
  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    for (const slot of this.chunks.values()) {
      try {
        slot.actor.dispose();
      } catch {
        /* idempotent */
      }
    }
    this.chunks.clear();
  }

  // ---- internals ----

  private spawnChunk(chunkX: number, chunkZ: number): void {
    const biome = assignBiome(this.worldSeed, chunkX, chunkZ);
    const actor = this.world.createActor(`chunk:${chunkX},${chunkZ}`);
    const component = actor.addComponentAndGet(ChunkActor, {
      biome,
      worldSeed: this.worldSeed,
      chunkX,
      chunkZ,
      modProvider: this.modProvider,
    });
    this.chunks.set(chunkKey(chunkX, chunkZ), {
      actor: component,
      chunkX,
      chunkZ,
    });
    try {
      this.hooks.onChunkSpawned?.({
        chunkX,
        chunkZ,
        biome,
        actor: component,
      });
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("[grovekeeper] onChunkSpawned hook threw", error);
    }
  }
}
