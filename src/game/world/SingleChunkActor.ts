/**
 * SingleChunkActor — owns a `VoxelRenderer` ActorComponent and feeds it
 * a single biome chunk on `awake`. Wave 7 hardcoded meadow; Wave 8
 * makes the biome a constructor parameter (defaulting to meadow so the
 * Wave 7 call site keeps working). Wave 9 will swap this for a
 * streaming chunk manager that picks biomes per chunk position.
 *
 * Mirrors voxel-realms' `TerrainBehavior` (see
 * `voxel-realms/src/scene/terrain-behavior.ts`):
 *   - Add a `VoxelRenderer` component with `chunkSize: 16` and Lambert
 *     material (cheap, non-PBR — fine for a pixel-art tileset).
 *   - Register every block from the biome's definition on the
 *     renderer's `blockRegistry`.
 *   - Load the biome tileset PNG, then push the chunk JSON into
 *     `renderer.load(...)`.
 *
 * The whole load chain is async — we kick it off from `awake` but
 * don't await; the renderer absorbs the JSON when it arrives. The
 * placeholder player meanwhile spawns above the surface so the camera
 * has a target even before the mesh has built.
 */

import { type Actor, ActorComponent } from "@jolly-pixel/engine";
import { VoxelRenderer } from "@jolly-pixel/voxel.renderer";
import { loadBiomeTileset } from "./BiomeTilesetLoader";
import {
  type BiomeDefinition,
  type BiomeId,
  DEFAULT_BIOME_ID,
  getBiome,
} from "./biomes";
import { registerBiomeBlocks } from "./blockRegistry";
import { buildChunkJSON, CHUNK_TUNING } from "./chunkGenerator";

export interface SingleChunkActorOptions {
  /**
   * Which biome to render. Defaults to `DEFAULT_BIOME_ID` (meadow).
   * Wave 9 will pick this per-chunk; Wave 8 just exposes the knob.
   */
  biome?: BiomeId | BiomeDefinition;
  /** Defaults to 0 so dev runs are repeatable. */
  worldSeed?: number;
  /** Defaults to (0,0). Wave 7 always uses (0,0). */
  chunkX?: number;
  chunkZ?: number;
}

interface ResolvedOptions {
  biome: BiomeDefinition;
  worldSeed: number;
  chunkX: number;
  chunkZ: number;
}

export class SingleChunkActor extends ActorComponent {
  private renderer: VoxelRenderer | null = null;
  private readonly opts: ResolvedOptions;
  private loadPromise: Promise<void> | null = null;

  /**
   * Player Y to spawn the placeholder cube on top of the chunk surface.
   * Computed from the biome's groundY plus the hill-bump (1) so the
   * spawn never lands inside the raised hill. Static for backwards
   * compat with the Wave 7 callsite — runtime.ts treats meadow's
   * groundY as the canonical value, which still matches every biome
   * since they all default to `world.config.json.groundY`.
   */
  static readonly SURFACE_Y = CHUNK_TUNING.groundY + 1;

  constructor(actor: Actor, options: SingleChunkActorOptions = {}) {
    super({ actor, typeName: "SingleChunkActor" });
    const biome =
      typeof options.biome === "string"
        ? getBiome(options.biome)
        : (options.biome ?? getBiome(DEFAULT_BIOME_ID));
    this.opts = {
      biome,
      worldSeed: options.worldSeed ?? 0,
      chunkX: options.chunkX ?? 0,
      chunkZ: options.chunkZ ?? 0,
    };
  }

  /** Read-only access to the resolved biome (tests, debug overlays). */
  get biomeId(): BiomeId {
    return this.opts.biome.id;
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
      console.error("[grovekeeper] SingleChunkActor load failed", error);
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
  }

  /** Promise that resolves once the initial chunk has been pushed in. */
  whenLoaded(): Promise<void> {
    return this.loadPromise ?? Promise.resolve();
  }
}
