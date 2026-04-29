/**
 * ChunkActor — owns a `VoxelRenderer` ActorComponent and feeds it a
 * single biome chunk on `awake`, positioned at world-space
 * `(chunkX * size, 0, chunkZ * size)`.
 *
 * Wave 9 generalises Wave 7's `SingleChunkActor` so the streaming
 * `ChunkManager` can spawn many of these — one per live chunk — and
 * each lands in the right place in the contiguous 2D grid. The chunk
 * generator (Wave 8) is still authoritative for content; this actor
 * just orchestrates the load and places the resulting mesh.
 *
 * Mirrors voxel-realms' `TerrainBehavior` (see
 * `voxel-realms/src/scene/terrain-behavior.ts`):
 *   - Add a `VoxelRenderer` component with `chunkSize: 16` and Lambert
 *     material.
 *   - Register every block from the biome's definition on the
 *     renderer's `blockRegistry`.
 *   - Load the biome tileset PNG, then push the chunk JSON into
 *     `renderer.load(...)`.
 *
 * Difference from `SingleChunkActor`:
 *   - Always offsets the actor's `object3D` to the chunk's world origin
 *     so multiple chunks tile cleanly without overlapping voxels at
 *     local-coord (0, *, 0).
 *   - `dispose()` removes the actor from the world, which is how the
 *     manager unloads off-screen chunks.
 */

import { type Actor, ActorComponent } from "@jolly-pixel/engine";
import { VoxelRenderer } from "@jolly-pixel/voxel.renderer";
import type { Object3D } from "three";
import { actorObject3D } from "@/shared/utils/actorUtils";
import { loadBiomeTileset } from "./BiomeTilesetLoader";
import {
  type BiomeDefinition,
  type BiomeId,
  DEFAULT_BIOME_ID,
  getBiome,
} from "./biomes";
import { registerBiomeBlocks } from "./blockRegistry";
import { buildChunkJSON, CHUNK_TUNING } from "./chunkGenerator";

/**
 * A single player modification — either set a named block or remove it.
 * Local coordinates (0..chunkSize-1 on x/z, surface-relative on y).
 *
 * Wave 12 introduces this to layer player-placed blocks on top of
 * deterministic procgen. The chunks repo speaks the same shape; the
 * `modProvider` callback below adapts repo rows to this shape.
 */
export interface ChunkBlockMod {
  /** Local X (0..chunkSize-1). */
  localX: number;
  /** World Y. */
  y: number;
  /** Local Z (0..chunkSize-1). */
  localZ: number;
  op: "set" | "remove";
  /** Block name (e.g. "meadow.stone"). Required for `set`, ignored for `remove`. */
  blockId?: string;
}

export interface ChunkActorOptions {
  /** Biome to render. Defaults to `DEFAULT_BIOME_ID` (meadow). */
  biome?: BiomeId | BiomeDefinition;
  /** World seed for deterministic decoration. Default 0. */
  worldSeed?: number;
  /** Chunk grid X coord. Defaults to 0. */
  chunkX?: number;
  /** Chunk grid Z coord. Defaults to 0. */
  chunkZ?: number;
  /**
   * Optional source of player modifications to layer on top of the
   * procgen output. Called once on chunk load. The default returns an
   * empty list — the chunk renders pure procgen.
   *
   * Wave 12 (crafting + building) plugs `chunksRepo.getModifiedBlocks`
   * in here so reloads restore player builds.
   */
  modProvider?: (chunkX: number, chunkZ: number) => readonly ChunkBlockMod[];
}

interface ResolvedOptions {
  biome: BiomeDefinition;
  worldSeed: number;
  chunkX: number;
  chunkZ: number;
  modProvider: (chunkX: number, chunkZ: number) => readonly ChunkBlockMod[];
}

export class ChunkActor extends ActorComponent {
  private renderer: VoxelRenderer | null = null;
  private readonly opts: ResolvedOptions;
  private loadPromise: Promise<void> | null = null;

  /**
   * Y above the surface block where the player can safely stand. All
   * Wave-9 biomes share `groundY` (5) so this works for any chunk in
   * the streamed grid; biome variation lives in textures, not heights.
   * Future waves (e.g. real collision, varying biome elevations) will
   * need a chunk-aware lookup.
   */
  static readonly SURFACE_Y = CHUNK_TUNING.groundY + 1;

  constructor(actor: Actor, options: ChunkActorOptions = {}) {
    super({ actor, typeName: "ChunkActor" });
    const biome =
      typeof options.biome === "string"
        ? getBiome(options.biome)
        : (options.biome ?? getBiome(DEFAULT_BIOME_ID));
    this.opts = {
      biome,
      worldSeed: options.worldSeed ?? 0,
      chunkX: options.chunkX ?? 0,
      chunkZ: options.chunkZ ?? 0,
      modProvider: options.modProvider ?? (() => []),
    };

    // Position the actor at this chunk's world-space origin. The
    // VoxelRenderer's mesh is built in chunk-local coords (0..size-1),
    // so the actor offset is what tiles chunks together cleanly.
    // Guarded for the test environment where the actor stub may omit
    // `object3D` — production engine actors always have it.
    const size = CHUNK_TUNING.size;
    const obj3D = actorObject3D(this.actor);
    obj3D?.position.set(this.opts.chunkX * size, 0, this.opts.chunkZ * size);
  }

  /** Read-only access to the resolved biome. */
  get biomeId(): BiomeId {
    return this.opts.biome.id;
  }

  /** Chunk grid X coord, useful for the manager's bookkeeping. */
  get chunkX(): number {
    return this.opts.chunkX;
  }

  /** Chunk grid Z coord, useful for the manager's bookkeeping. */
  get chunkZ(): number {
    return this.opts.chunkZ;
  }

  /**
   * The Three.js root for this chunk's voxel mesh. Used by Wave 10's
   * grove glow layer to walk the subtree and patch emissive
   * properties, and to attach the firefly Points cloud as a child.
   * Returns `null` when the underlying actor stub omits `object3D`
   * (test fixtures only).
   */
  get object3D(): Object3D | null {
    return actorObject3D(this.actor) ?? null;
  }

  awake(): void {
    this.needUpdate = false;

    this.renderer = this.actor.addComponentAndGet(VoxelRenderer, {
      chunkSize: CHUNK_TUNING.size,
      material: "lambert",
    });
    registerBiomeBlocks(this.renderer.blockRegistry, this.opts.biome);

    // Fire-and-forget load. Errors are logged but not rethrown — the
    // game shouldn't crash the runtime if a single chunk fails to load.
    this.loadPromise = this.loadChunk().catch((error) => {
      // eslint-disable-next-line no-console
      console.error("[grovekeeper] ChunkActor load failed", error);
    });
  }

  private async loadChunk(): Promise<void> {
    if (!this.renderer) return;
    await loadBiomeTileset(this.renderer, this.opts.biome);
    if (!this.renderer) return;
    const chunkJson = buildChunkJSON({
      biome: this.opts.biome,
      chunkX: this.opts.chunkX,
      chunkZ: this.opts.chunkZ,
      worldSeed: this.opts.worldSeed,
    });
    await this.renderer.load(chunkJson);
    // Layer in any player modifications recorded for this chunk.
    // Wave 12 plumbs `chunksRepo.getModifiedBlocks(...)` in via the
    // provider; out-of-tree callers (and tests) get an empty list by
    // default so the procgen output renders unmodified.
    const mods = this.opts.modProvider(this.opts.chunkX, this.opts.chunkZ);
    for (const mod of mods) {
      this.applyMod(mod);
    }
  }

  /**
   * Apply a single block modification (set or remove) to the live
   * mesh. No persistence — the caller (Wave 12 placement layer) is
   * responsible for writing the matching `chunksRepo` row before
   * calling this.
   *
   * Returns true if the modification was applied, false if the
   * renderer or biome lookup couldn't satisfy it (unknown block id,
   * renderer disposed).
   */
  applyMod(mod: ChunkBlockMod): boolean {
    if (!this.renderer) return false;
    // Surface modifications always target the "surface" layer regardless of
    // op kind. Future ops on other layers should branch here.
    const layerName = "surface";
    const position = { x: mod.localX, y: mod.y, z: mod.localZ };
    if (mod.op === "remove") {
      try {
        this.renderer.removeVoxel(layerName, { position });
        return true;
      } catch {
        return false;
      }
    }
    if (!mod.blockId) return false;
    const blockNumeric = this.opts.biome.blocks.find(
      (b) => b.name === mod.blockId,
    )?.id;
    if (blockNumeric == null) return false;
    try {
      this.renderer.setVoxel(layerName, {
        position,
        blockId: blockNumeric,
      });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Set a block at a chunk-local position. Convenience wrapper used by
   * the Wave 12 placement runtime so callers don't have to construct
   * `ChunkBlockMod` records by hand.
   */
  setBlockLocal(
    localX: number,
    y: number,
    localZ: number,
    blockId: string,
  ): boolean {
    return this.applyMod({ localX, y, localZ, op: "set", blockId });
  }

  /** Promise that resolves once the initial chunk JSON has been pushed. */
  whenLoaded(): Promise<void> {
    return this.loadPromise ?? Promise.resolve();
  }

  /**
   * Tear the chunk down — destroys the owning Actor, which removes it
   * from the world's scene graph and disposes its components. Idempotent.
   */
  dispose(): void {
    this.renderer = null;
    if (!this.actor.isDestroyed?.() && !this.actor.pendingForDestruction) {
      this.actor.destroy();
    }
  }
}
