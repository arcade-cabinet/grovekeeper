/**
 * SingleChunkActor — owns a `VoxelRenderer` ActorComponent and feeds it
 * a single meadow chunk on `awake`. Wave 7 only renders this one chunk
 * at world origin; Wave 9 will swap this for a streaming chunk manager.
 *
 * Mirrors voxel-realms' `TerrainBehavior` (see
 * `voxel-realms/src/scene/terrain-behavior.ts`):
 *   - Add a `VoxelRenderer` component with `chunkSize: 16` and
 *     Lambert material (cheap, non-PBR — fine for a pixel-art tileset).
 *   - Register every block from `MEADOW_BLOCK_DEFS` on the renderer's
 *     `blockRegistry`.
 *   - Load the meadow tileset PNG, then push the chunk JSON into
 *     `renderer.load(...)`.
 *
 * The whole load chain is async — we kick it off from `awake` but
 * don't await; the renderer absorbs the JSON when it arrives. The
 * placeholder player meanwhile spawns above the surface so the camera
 * has a target even before the mesh has built.
 */

import { type Actor, ActorComponent } from "@jolly-pixel/engine";
import { VoxelRenderer } from "@jolly-pixel/voxel.renderer";
import {
  buildMeadowChunkJSON,
  MEADOW_CHUNK_TUNING,
} from "./meadowChunk";
import { loadMeadowTileset } from "./MeadowTilesetLoader";
import { registerMeadowBlocks } from "./blockRegistry";

export interface SingleChunkActorOptions {
  /** Defaults to 0 so dev runs are repeatable. */
  worldSeed?: number;
  /** Defaults to (0,0). Wave 7 always uses (0,0). */
  chunkX?: number;
  chunkZ?: number;
}

export class SingleChunkActor extends ActorComponent {
  private renderer: VoxelRenderer | null = null;
  private readonly opts: Required<SingleChunkActorOptions>;
  private loadPromise: Promise<void> | null = null;

  /**
   * Player Y to spawn the placeholder cube on top of the chunk surface.
   * Calculated from the hill bump (groundY+1) plus a half-capsule pad.
   */
  static readonly SURFACE_Y = MEADOW_CHUNK_TUNING.groundY + 1;

  constructor(actor: Actor, options: SingleChunkActorOptions = {}) {
    super({ actor, typeName: "SingleChunkActor" });
    this.opts = {
      worldSeed: options.worldSeed ?? 0,
      chunkX: options.chunkX ?? 0,
      chunkZ: options.chunkZ ?? 0,
    };
  }

  awake(): void {
    this.needUpdate = false;

    this.renderer = this.actor.addComponentAndGet(VoxelRenderer, {
      chunkSize: MEADOW_CHUNK_TUNING.size,
      material: "lambert",
    });
    registerMeadowBlocks(this.renderer.blockRegistry);

    // Fire-and-forget load. Errors are logged but not rethrown — the
    // game shouldn't crash the runtime if a single chunk fails to load.
    this.loadPromise = this.loadChunk().catch((error) => {
      // eslint-disable-next-line no-console
      console.error("[grovekeeper] SingleChunkActor load failed", error);
    });
  }

  private async loadChunk(): Promise<void> {
    if (!this.renderer) return;
    await loadMeadowTileset(this.renderer);
    if (!this.renderer) return;
    const chunkJson = buildMeadowChunkJSON({
      chunkX: this.opts.chunkX,
      chunkZ: this.opts.chunkZ,
      worldSeed: this.opts.worldSeed,
    });
    await this.renderer.load(chunkJson);
  }

  /** Promise that resolves once the initial chunk has been pushed in. */
  whenLoaded(): Promise<void> {
    return this.loadPromise ?? Promise.resolve();
  }
}
