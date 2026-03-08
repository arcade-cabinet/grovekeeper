/**
 * ChunkManager -- Streams 3x3 active + 5x5 buffer chunk ring around the player.
 *
 * Architecture (Spec §17.1):
 *   - Chunk size: 16x16 world-space tiles
 *   - Active ring (3x3, radius 1): rendered, renderable.visible = true
 *   - Buffer ring (5x5, radius 2): pre-generated, renderable.visible = false
 *   - Terrain is seamless: global world-space coordinates used for all noise
 *   - Delta-only persistence: unmodified chunks regenerate from seed
 *   - Async generation: new chunks are queued and generated on requestIdleCallback
 *     (or setTimeout fallback) to avoid frame drops during chunk loading
 */

import enemiesConfig from "@/config/game/enemies.json" with { type: "json" };
import gridConfig from "@/config/game/grid.json" with { type: "json" };
import type {
  BlueprintId,
  BuildingMaterialType,
  ProceduralBuildingComponent,
} from "@/game/ecs/components/structures";
import type { VegetationSeason } from "@/game/ecs/components/vegetation";
import type { Entity } from "@/game/ecs/world";
import { generateEntityId, world } from "@/game/ecs/world";
import { useGameStore } from "@/game/stores";
import { spawnEnemiesForChunk } from "@/game/systems/enemySpawning";
import { spawnChunkStructures } from "@/game/systems/structurePlacement";
import { spawnChunkVegetation } from "@/game/systems/vegetationPlacement";
import { SeededNoise } from "@/game/utils/seededNoise";
import { hashString } from "@/game/utils/seedRNG";
import { scopedRNG } from "@/game/utils/seedWords";
import { resolveEmissiveColor } from "@/game/utils/spiritColors";
import { placeAudioZones } from "./audioZonePlacer.ts";
import type { BiomeType } from "./biomeMapper.ts";
import { assignBiome, getBiomeColor } from "./biomeMapper.ts";
import { applyChunkDiff } from "./chunkPersistence.ts";
import { spawnChunkEntities } from "./entitySpawner.ts";
import { generateLabyrinth } from "./mazeGenerator.ts";
import { generatePathsForChunk, generateSignpostForChunk } from "./pathGenerator.ts";
import { generateHeightmap } from "./terrainGenerator.ts";
import { generateVillage } from "./villageGenerator.ts";
import { placeWaterBodies } from "./waterPlacer.ts";

export const CHUNK_SIZE: number = gridConfig.chunkSize;
export const ACTIVE_RADIUS: number = gridConfig.activeRadius;
export const BUFFER_RADIUS: number = gridConfig.bufferRadius;

// ─── Pure helpers ─────────────────────────────────────────────────────────────

/** Derive procedural building component from a structure templateId. §43.7 */
const BUILDING_PARAMS: Record<
  string,
  { w: number; d: number; stories: number; mat: BuildingMaterialType; bp: BlueprintId }
> = {
  barn: { w: 4, d: 5, stories: 1, mat: "timber", bp: "barn" },
  "house-1": { w: 3, d: 3, stories: 1, mat: "plaster", bp: "cottage" },
  "house-2": { w: 3, d: 4, stories: 2, mat: "brick", bp: "townhouse" },
  "house-3": { w: 3, d: 4, stories: 2, mat: "plaster", bp: "inn" },
  "house-4": { w: 3, d: 3, stories: 1, mat: "plaster", bp: "apothecary" },
  "house-5": { w: 2, d: 2, stories: 3, mat: "brick", bp: "watchtower" },
  workshop: { w: 4, d: 3, stories: 1, mat: "brick", bp: "forge" },
  "storage-1": { w: 3, d: 3, stories: 1, mat: "brick", bp: "storehouse" },
  "storage-2": { w: 3, d: 3, stories: 1, mat: "brick", bp: "storehouse" },
  forge: { w: 4, d: 3, stories: 1, mat: "brick", bp: "forge" },
  kitchen: { w: 3, d: 3, stories: 1, mat: "plaster", bp: "kitchen" },
};

const DEFAULT_PARAMS = { w: 3, d: 3, stories: 1, mat: "brick" as const, bp: "cottage" as const };

/** Map BiomeType to the enemy biome strings used in enemies.json. */
function biomeToEnemyBiome(biome: BiomeType): string {
  switch (biome) {
    case "starting-grove":
      return "forest";
    case "ancient-forest":
      return "forest";
    case "twilight-glade":
      return "forest";
    case "meadow":
      return "meadow";
    case "wetlands":
      return "wetlands";
    case "rocky-highlands":
      return "rocky-highlands";
    case "frozen-peaks":
      return "frozen-peaks";
    case "orchard-valley":
      return "meadow";
  }
}

function deriveProceduralBuilding(
  templateId: string,
  blueprintId?: BlueprintId,
  facing?: 0 | 90 | 180 | 270,
  variation?: number,
): ProceduralBuildingComponent {
  const params = BUILDING_PARAMS[templateId] ?? DEFAULT_PARAMS;
  return {
    footprintW: params.w,
    footprintD: params.d,
    stories: params.stories,
    materialType: params.mat,
    blueprintId: blueprintId ?? params.bp,
    facing: facing ?? 0,
    variation: variation ?? 0,
  };
}

/** Convert a world-space position to chunk grid coordinates. */
export function worldToChunkCoords(pos: { x: number; z: number }): {
  chunkX: number;
  chunkZ: number;
} {
  return {
    chunkX: Math.floor(pos.x / CHUNK_SIZE),
    chunkZ: Math.floor(pos.z / CHUNK_SIZE),
  };
}

/** Canonical string key for a chunk position. */
export function getChunkKey(chunkX: number, chunkZ: number): string {
  return `${chunkX},${chunkZ}`;
}

/** All chunk coords within a square radius centered on (centerX, centerZ). */
export function getChunksInRadius(
  centerX: number,
  centerZ: number,
  radius: number,
): { chunkX: number; chunkZ: number }[] {
  const chunks: { chunkX: number; chunkZ: number }[] = [];
  for (let dx = -radius; dx <= radius; dx++) {
    for (let dz = -radius; dz <= radius; dz++) {
      chunks.push({ chunkX: centerX + dx, chunkZ: centerZ + dz });
    }
  }
  return chunks;
}

/**
 * Compute the biome for a single chunk center using temperature + moisture noise.
 * Pure function — same inputs always produce the same biome.
 */
function sampleChunkBiome(
  tempNoise: SeededNoise,
  moistNoise: SeededNoise,
  chunkX: number,
  chunkZ: number,
): ReturnType<typeof assignBiome> {
  const cx = (chunkX + 0.5) * 0.1;
  const cz = (chunkZ + 0.5) * 0.1;
  const temperature = (tempNoise.perlin(cx, cz) + 1) * 0.5;
  const moisture = (moistNoise.perlin(cx, cz) + 1) * 0.5;
  const distanceFromOrigin = Math.max(Math.abs(chunkX), Math.abs(chunkZ));
  return assignBiome(temperature, moisture, distanceFromOrigin);
}

/**
 * Compute the biomes of the 4 neighboring chunks [N, E, S, W].
 * N = (chunkX, chunkZ-1), E = (chunkX+1, chunkZ), S = (chunkX, chunkZ+1), W = (chunkX-1, chunkZ).
 *
 * Pure function — same worldSeed + chunkCoords always produces same result.
 */
export function computeNeighborBiomes(
  worldSeed: string,
  chunkX: number,
  chunkZ: number,
): [BiomeType, BiomeType, BiomeType, BiomeType] {
  const tempNoise = new SeededNoise(hashString(`${worldSeed}:temp`));
  const moistNoise = new SeededNoise(hashString(`${worldSeed}:moist`));
  return [
    sampleChunkBiome(tempNoise, moistNoise, chunkX, chunkZ - 1), // N
    sampleChunkBiome(tempNoise, moistNoise, chunkX + 1, chunkZ), // E
    sampleChunkBiome(tempNoise, moistNoise, chunkX, chunkZ + 1), // S
    sampleChunkBiome(tempNoise, moistNoise, chunkX - 1, chunkZ), // W
  ];
}

/**
 * Generate TerrainChunkComponent data for a chunk.
 * Pure function — same worldSeed + chunkX + chunkZ always produces the same result.
 * Uses global coordinates so terrain is seamless across chunk boundaries.
 */
export function generateChunkData(
  worldSeed: string,
  chunkX: number,
  chunkZ: number,
): {
  heightmap: Float32Array;
  baseColor: string;
  biomeBlend: [number, number, number, number];
  neighborColors: [string, string, string, string];
  dirty: boolean;
} {
  const tempNoise = new SeededNoise(hashString(`${worldSeed}:temp`));
  const moistNoise = new SeededNoise(hashString(`${worldSeed}:moist`));

  const heightmap = generateHeightmap(worldSeed, chunkX, chunkZ);

  const centerBiome = sampleChunkBiome(tempNoise, moistNoise, chunkX, chunkZ);
  const centerColor = getBiomeColor(centerBiome);

  // Compute neighbor biomes [N, E, S, W] and derive blend weights + colors
  const neighborBiomes: [BiomeType, BiomeType, BiomeType, BiomeType] = [
    sampleChunkBiome(tempNoise, moistNoise, chunkX, chunkZ - 1), // N
    sampleChunkBiome(tempNoise, moistNoise, chunkX + 1, chunkZ), // E
    sampleChunkBiome(tempNoise, moistNoise, chunkX, chunkZ + 1), // S
    sampleChunkBiome(tempNoise, moistNoise, chunkX - 1, chunkZ), // W
  ];

  const neighborColors: [string, string, string, string] = [
    getBiomeColor(neighborBiomes[0]),
    getBiomeColor(neighborBiomes[1]),
    getBiomeColor(neighborBiomes[2]),
    getBiomeColor(neighborBiomes[3]),
  ];

  // biomeBlend[i] = 1 if neighbor i has a different biome, 0 if same
  const biomeBlend: [number, number, number, number] = [
    neighborColors[0] !== centerColor ? 1 : 0,
    neighborColors[1] !== centerColor ? 1 : 0,
    neighborColors[2] !== centerColor ? 1 : 0,
    neighborColors[3] !== centerColor ? 1 : 0,
  ];

  return {
    heightmap,
    baseColor: centerColor,
    biomeBlend,
    neighborColors,
    dirty: false,
  };
}

/** Determine biome string for a chunk — exported for wiring to ChunkComponent. */
export function getChunkBiome(worldSeed: string, chunkX: number, chunkZ: number): string {
  const tempNoise = new SeededNoise(hashString(`${worldSeed}:temp`));
  const moistNoise = new SeededNoise(hashString(`${worldSeed}:moist`));
  const cx = (chunkX + 0.5) * 0.1;
  const cz = (chunkZ + 0.5) * 0.1;
  const temperature = (tempNoise.perlin(cx, cz) + 1) * 0.5;
  const moisture = (moistNoise.perlin(cx, cz) + 1) * 0.5;
  const distanceFromOrigin = Math.max(Math.abs(chunkX), Math.abs(chunkZ));
  return assignBiome(temperature, moisture, distanceFromOrigin);
}

// ─── Async generation helpers ─────────────────────────────────────────────────

interface QueueItem {
  chunkX: number;
  chunkZ: number;
  visible: boolean;
}

/** Schedule a callback on idle time (requestIdleCallback) or next tick (setTimeout).
 *
 * The `timeout: 50` option forces the callback to fire within 50 ms even when
 * the browser is continuously busy (e.g. automated Playwright test with frequent
 * waitForFunction polling). Without a timeout, requestIdleCallback can be
 * deferred indefinitely in automation environments, preventing chunk generation.
 */
function scheduleIdle(cb: () => void): void {
  if (typeof requestIdleCallback !== "undefined") {
    requestIdleCallback(cb, { timeout: 50 });
  } else {
    setTimeout(cb, 0);
  }
}

// ─── ChunkManager class ───────────────────────────────────────────────────────

/**
 * ChunkManager tracks the player's chunk position and keeps the ECS world
 * populated with terrain entities for the surrounding active (3x3) and
 * buffer (5x5) rings.
 *
 * Chunk generation is deferred to idle time (requestIdleCallback / setTimeout)
 * so that bulk loading on player movement does not cause frame drops.
 * Call flushQueue() in tests to process all pending generation synchronously.
 */
export class ChunkManager {
  private readonly worldSeed: string;
  private readonly loadedChunks: Map<string, Entity> = new Map();
  /** Child entities (water bodies + audio zones) keyed by chunk key. */
  private readonly chunkChildEntities: Map<string, Entity[]> = new Map();
  /** Chunks queued for generation but not yet added to ECS. Key = chunk key. */
  private readonly pendingChunks: Set<string> = new Set();
  /** FIFO queue of chunk generation work items. */
  private readonly generationQueue: QueueItem[] = [];
  /** True when an idle/timeout callback is already scheduled. */
  private generationScheduled = false;
  private playerChunkX = 0;
  private playerChunkZ = 0;
  /** True until the first update() call forces a full load. */
  private initialized = false;

  constructor(worldSeed: string) {
    this.worldSeed = worldSeed;
  }

  /**
   * Call every frame (or when player position changes).
   * Unloads out-of-range chunks synchronously. Queues new chunks for async
   * generation via requestIdleCallback (or setTimeout fallback).
   */
  update(playerPos: { x: number; y: number; z: number }): void {
    const { chunkX, chunkZ } = worldToChunkCoords(playerPos);

    // Skip if player hasn't crossed a chunk boundary and we've already initialized
    if (this.initialized && chunkX === this.playerChunkX && chunkZ === this.playerChunkZ) {
      return;
    }

    this.playerChunkX = chunkX;
    this.playerChunkZ = chunkZ;
    this.initialized = true;

    // Build desired chunk sets
    const bufferChunkCoords = getChunksInRadius(chunkX, chunkZ, BUFFER_RADIUS);
    const desiredKeys = new Set(
      bufferChunkCoords.map(({ chunkX: cx, chunkZ: cz }) => getChunkKey(cx, cz)),
    );
    const activeKeys = new Set(
      getChunksInRadius(chunkX, chunkZ, ACTIVE_RADIUS).map(({ chunkX: cx, chunkZ: cz }) =>
        getChunkKey(cx, cz),
      ),
    );

    // Synchronously unload chunks that are now outside the buffer ring
    const toUnload: string[] = [];
    for (const key of this.loadedChunks.keys()) {
      if (!desiredKeys.has(key)) toUnload.push(key);
    }
    for (const key of toUnload) {
      // biome-ignore lint/style/noNonNullAssertion: key came from loadedChunks.keys()
      world.remove(this.loadedChunks.get(key)!);
      this.loadedChunks.delete(key);
      for (const child of this.chunkChildEntities.get(key) ?? []) {
        world.remove(child);
      }
      this.chunkChildEntities.delete(key);
    }

    // Cancel pending generation for chunks that moved out of range
    for (const key of this.pendingChunks) {
      if (!desiredKeys.has(key)) {
        this.pendingChunks.delete(key);
        // Queue item stays in generationQueue but will be skipped (key not in pendingChunks)
      }
    }

    // Queue new chunks for async generation; update visibility for already-loaded ones
    for (const { chunkX: cx, chunkZ: cz } of bufferChunkCoords) {
      const key = getChunkKey(cx, cz);
      const isActive = activeKeys.has(key);

      if (!this.loadedChunks.has(key) && !this.pendingChunks.has(key)) {
        this.pendingChunks.add(key);
        this.generationQueue.push({ chunkX: cx, chunkZ: cz, visible: isActive });
      } else if (this.loadedChunks.has(key)) {
        // Update visibility when chunk moves between active / buffer.
        // Must update BOTH the chunk entity AND all child entities (trees, bushes,
        // NPCs, grass, rocks, fences, enemies) — otherwise children spawned as
        // buffer (visible=false) stay invisible when the chunk becomes active.
        // biome-ignore lint/style/noNonNullAssertion: guarded by loadedChunks.has(key)
        const entity = this.loadedChunks.get(key)!;
        if (entity.renderable) entity.renderable.visible = isActive;
        const children = this.chunkChildEntities.get(key);
        if (children) {
          for (const child of children) {
            if (child.renderable) child.renderable.visible = isActive;
          }
        }
      }
    }

    this.scheduleGeneration();
  }

  /** All currently loaded chunk entities (active + buffer). */
  getLoadedChunks(): ReadonlyMap<string, Entity> {
    return this.loadedChunks;
  }

  /** Number of chunks queued for generation but not yet loaded. */
  getPendingChunkCount(): number {
    return this.pendingChunks.size;
  }

  /**
   * Process all queued chunk generation synchronously.
   * Intended for use in tests where idle callbacks don't fire automatically.
   */
  flushQueue(): void {
    while (this.generationQueue.length > 0) {
      // biome-ignore lint/style/noNonNullAssertion: length > 0 guarantees shift() returns a value
      const item = this.generationQueue.shift()!;
      const key = getChunkKey(item.chunkX, item.chunkZ);

      // Skip if cancelled (player moved away before this chunk was generated)
      if (!this.pendingChunks.has(key)) continue;
      // Skip if somehow already loaded
      if (this.loadedChunks.has(key)) {
        this.pendingChunks.delete(key);
        continue;
      }

      this.loadChunk(item.chunkX, item.chunkZ, item.visible);
      this.pendingChunks.delete(key);
    }
    this.generationScheduled = false;
  }

  private scheduleGeneration(): void {
    if (this.generationQueue.length === 0 || this.generationScheduled) return;
    this.generationScheduled = true;

    scheduleIdle(() => {
      this.generationScheduled = false;
      this.processNextBatch();
    });
  }

  /**
   * Process queued chunks one at a time, rescheduling after each to yield
   * control back to the render loop and prevent frame drops.
   */
  private processNextBatch(): void {
    if (this.generationQueue.length === 0) return;

    // biome-ignore lint/style/noNonNullAssertion: length > 0 guarantees shift() returns a value
    const item = this.generationQueue.shift()!;
    const key = getChunkKey(item.chunkX, item.chunkZ);

    // Skip if cancelled
    if (this.pendingChunks.has(key)) {
      if (!this.loadedChunks.has(key)) {
        try {
          this.loadChunk(item.chunkX, item.chunkZ, item.visible);
        } catch (err) {
          // Never let a single chunk error kill all subsequent generation.
          // Log the error and continue — the chunk will simply be absent until
          // the player moves away and triggers a fresh generation attempt.
          console.error(`[ChunkManager] loadChunk(${item.chunkX},${item.chunkZ}) failed:`, err);
        }
      }
      this.pendingChunks.delete(key);
    }

    // Always reschedule even after an error so the remaining queue drains.
    if (this.generationQueue.length > 0) {
      this.scheduleGeneration();
    }
  }

  private loadChunk(chunkX: number, chunkZ: number, visible: boolean): void {
    const key = getChunkKey(chunkX, chunkZ);
    const terrainData = generateChunkData(this.worldSeed, chunkX, chunkZ);
    const biome = getChunkBiome(this.worldSeed, chunkX, chunkZ);
    const storeState = useGameStore.getState();
    const season = (storeState.currentSeason ?? "spring") as VegetationSeason;
    const difficulty = storeState.difficulty ?? "sapling";

    const entity = world.add({
      id: generateEntityId(),
      position: { x: chunkX * CHUNK_SIZE, y: 0, z: chunkZ * CHUNK_SIZE },
      chunk: { chunkX, chunkZ, biome },
      terrainChunk: terrainData,
      renderable: { visible, scale: 1 },
    });

    this.loadedChunks.set(key, entity);

    // Place water bodies and co-located audio zones
    const waterPlacements = placeWaterBodies(
      this.worldSeed,
      chunkX,
      chunkZ,
      terrainData.heightmap,
      biome as BiomeType,
    );
    const audioZonePlacements = placeAudioZones(waterPlacements);
    const children: Entity[] = [];

    for (const wp of waterPlacements) {
      children.push(
        world.add({
          id: generateEntityId(),
          position: wp.position,
          waterBody: wp.waterBody,
        }),
      );
    }

    for (const azp of audioZonePlacements) {
      children.push(
        world.add({
          id: generateEntityId(),
          position: azp.position,
          ambientZone: azp.ambientZone,
        }),
      );
    }

    // Generate trail paths between landmarks — carves heightmap in-place.
    const pathPlacements = generatePathsForChunk(
      this.worldSeed,
      chunkX,
      chunkZ,
      terrainData.heightmap,
    );
    for (const psp of pathPlacements) {
      children.push(
        world.add({
          id: generateEntityId(),
          position: psp.position,
          pathSegment: psp.pathSegment,
        }),
      );
    }

    // Place a signpost at path intersections (landmark with 2+ connected neighbors).
    const signpostPlacement = generateSignpostForChunk(
      this.worldSeed,
      chunkX,
      chunkZ,
      terrainData.heightmap,
    );
    if (signpostPlacement) {
      children.push(
        world.add({
          id: generateEntityId(),
          position: signpostPlacement.position,
          signpost: signpostPlacement.signpost,
        }),
      );
    }

    // Generate village buildings, NPCs, and campfire for village landmark chunks.
    const villagePlacements = generateVillage(
      this.worldSeed,
      chunkX,
      chunkZ,
      terrainData.heightmap,
    );
    if (villagePlacements) {
      children.push(
        world.add({
          id: generateEntityId(),
          position: villagePlacements.campfire.position,
          structure: villagePlacements.campfire.structure,
          campfire: villagePlacements.campfire.campfire,
        }),
      );
      for (const bp of villagePlacements.buildings) {
        children.push(
          world.add({
            id: generateEntityId(),
            position: bp.position,
            rotationY: bp.rotationY,
            structure: bp.structure,
            proceduralBuilding: deriveProceduralBuilding(
              bp.structure.templateId,
              bp.blueprintId,
              bp.facing,
              bp.variation,
            ),
            renderable: { visible, scale: 1 },
          }),
        );
      }
      for (const np of villagePlacements.npcs) {
        children.push(
          world.add({
            id: generateEntityId(),
            position: np.position,
            npc: np.npc,
            renderable: { visible, scale: 1 },
          }),
        );
      }

      // Spawn street furniture (lamp posts, crates, barrels, wells). §43.1
      for (const fp of villagePlacements.furniture) {
        children.push(
          world.add({
            id: generateEntityId(),
            position: fp.position,
            prop: { propId: `street-${fp.type}`, modelPath: fp.type },
            renderable: { visible, scale: 1 },
          }),
        );
      }

      // Spawn traveling merchant at newly discovered villages. Spec §20.
      const villageId = villagePlacements.campfire.campfire.fastTravelId;
      if (villageId) {
        useGameStore.getState().spawnMerchantAtVillage(villageId);
      }
    }

    // Generate hedge labyrinth and Grovekeeper spirit for labyrinth chunks.
    const labyrinthResult = generateLabyrinth(
      this.worldSeed,
      chunkX,
      chunkZ,
      terrainData.heightmap,
    );
    if (labyrinthResult) {
      const { hedges, decorations, centerPosition, mazeIndex } = labyrinthResult;

      // Hedge wall pieces (batched by HedgeMaze renderer)
      for (const hp of hedges) {
        children.push(
          world.add({
            id: generateEntityId(),
            position: hp.position,
            rotationY: hp.rotationY,
            hedge: hp.hedge,
            renderable: { visible, scale: 1 },
          }),
        );
      }

      // Maze decorations (fountain, benches, flowers, columns)
      for (const dp of decorations) {
        children.push(
          world.add({
            id: generateEntityId(),
            position: dp.position,
            hedgeDecoration: dp.decoration,
          }),
        );
      }

      // Grovekeeper spirit — seeded orb at maze center (Spec §32)
      const rng = scopedRNG("spirit", this.worldSeed, mazeIndex);
      const emissiveColor = resolveEmissiveColor(mazeIndex, this.worldSeed);
      rng(); // advance past the color roll consumed by resolveEmissiveColor
      const orbRadius = 0.15 + rng() * 0.1; // 0.15–0.25 units
      const bobAmplitude = 0.15 + rng() * 0.1; // 0.15–0.25 units
      const bobSpeed = 1.5 + rng() * 1.0; // 1.5–2.5 rad/s
      const bobPhase = rng() * Math.PI * 2;
      const hoverHeight = 0.8 + rng() * 0.4; // 0.8–1.2 units

      children.push(
        world.add({
          id: generateEntityId(),
          position: centerPosition,
          grovekeeperSpirit: {
            spiritId: `spirit-${chunkX}-${chunkZ}`,
            emissiveColor,
            emissiveIntensity: 1.5,
            orbRadius,
            bobAmplitude,
            bobSpeed,
            bobPhase,
            spawned: false,
            spawnProgress: 0,
            hoverHeight,
            trailColor: emissiveColor,
            discovered: false,
            dialogueTreeId: `spirit-dialogue-${mazeIndex}`,
          },
        }),
      );
    }

    // Spawn biome-appropriate vegetation and terrain entities
    const spawned = spawnChunkEntities(
      this.worldSeed,
      chunkX,
      chunkZ,
      biome as BiomeType,
      terrainData.heightmap,
      season,
    );

    // Trigger species discovery for unique wild species in visible chunks (Spec §8, §25)
    if (visible && spawned.trees.length > 0) {
      const store = useGameStore.getState();
      const seenSpecies = new Set<string>();
      for (const tp of spawned.trees) {
        const sid = tp.tree.speciesId;
        if (!seenSpecies.has(sid)) {
          seenSpecies.add(sid);
          store.discoverWildSpecies(sid);
        }
      }
    }

    for (const tp of spawned.trees) {
      children.push(
        world.add({
          id: generateEntityId(),
          position: tp.position,
          rotationY: tp.rotationY,
          tree: tp.tree,
          renderable: { visible, scale: 1 },
        }),
      );
    }

    for (const bp of spawned.bushes) {
      children.push(
        world.add({
          id: generateEntityId(),
          position: bp.position,
          rotationY: bp.rotationY,
          bush: bp.bush,
          renderable: { visible, scale: 1 },
        }),
      );
    }

    for (const gp of spawned.grass) {
      children.push(
        world.add({
          id: generateEntityId(),
          position: gp.position,
          grass: gp.grass,
        }),
      );
    }

    for (const rp of spawned.rocks) {
      children.push(
        world.add({
          id: generateEntityId(),
          position: rp.position,
          rotationY: rp.rotationY,
          rock: rp.rock,
          renderable: { visible, scale: 1 },
        }),
      );
    }

    // Spawn supplemental vegetation via model-resolution pipeline (Spec §6, §17.1)
    const vegPlacements = spawnChunkVegetation(
      this.worldSeed,
      chunkX,
      chunkZ,
      biome,
      terrainData.heightmap,
      season,
    );

    for (const tp of vegPlacements.trees) {
      children.push(
        world.add({
          id: generateEntityId(),
          position: tp.position,
          rotationY: tp.rotationY,
          tree: tp.tree,
          renderable: { visible, scale: 1 },
        }),
      );
    }

    for (const bp of vegPlacements.bushes) {
      children.push(
        world.add({
          id: generateEntityId(),
          position: bp.position,
          rotationY: bp.rotationY,
          bush: bp.bush,
          renderable: { visible, scale: 1 },
        }),
      );
    }

    // Spawn world-gen structures based on biome template (Spec §18, §17.1)
    const structurePlacements = spawnChunkStructures(
      this.worldSeed,
      chunkX,
      chunkZ,
      biome,
      terrainData.heightmap,
    );

    for (const sp of structurePlacements) {
      children.push(
        world.add({
          id: generateEntityId(),
          position: sp.position,
          rotationY: sp.rotationY,
          structure: sp.structure,
          proceduralBuilding: deriveProceduralBuilding(sp.structure.templateId),
          renderable: { visible, scale: 1 },
        }),
      );
    }

    // Spawn enemies based on biome, difficulty, and time of day (Spec §34)
    const enemyBiome = biomeToEnemyBiome(biome as BiomeType);
    const gameTime = storeState.gameTimeMicroseconds ?? 0;
    const dayProgress = (gameTime % 600_000_000) / 600_000_000;
    const isNight = dayProgress >= 0.8 || dayProgress < 0.05; // night phase
    const enemySpawns = spawnEnemiesForChunk(
      chunkX,
      chunkZ,
      enemyBiome,
      difficulty,
      this.worldSeed,
      isNight,
    );

    const enemyTypes = enemiesConfig.types as Record<
      string,
      {
        aggroRange: number;
        deaggroRange: number;
        attackPower: number;
        attackCooldown: number;
        health: number;
        lootTableId: string;
      }
    >;

    for (const es of enemySpawns) {
      const def = enemyTypes[es.enemyType];
      if (!def) continue;

      // Sample Y from heightmap for enemy position
      const localX = es.x - chunkX * CHUNK_SIZE;
      const localZ = es.z - chunkZ * CHUNK_SIZE;
      const xi = Math.max(0, Math.min(CHUNK_SIZE - 1, Math.floor(localX)));
      const zi = Math.max(0, Math.min(CHUNK_SIZE - 1, Math.floor(localZ)));
      const y = terrainData.heightmap[zi * CHUNK_SIZE + xi];

      children.push(
        world.add({
          id: generateEntityId(),
          position: { x: es.x, y, z: es.z },
          enemy: {
            enemyType: es.enemyType,
            tier: es.tier,
            behavior: es.behavior,
            aggroRange: def.aggroRange,
            deaggroRange: def.deaggroRange,
            attackPower: def.attackPower,
            attackCooldown: def.attackCooldown,
            lootTableId: def.lootTableId,
          },
          health: {
            current: def.health,
            max: def.health,
            invulnFrames: 0,
            lastDamageSource: null,
          },
          renderable: { visible, scale: 1 },
        }),
      );
    }

    if (children.length > 0) {
      this.chunkChildEntities.set(key, children);
    }

    // Restore player-planted trees and crops from persisted diff (Spec §26.2).
    // Must run after all procedural entities are spawned so player changes overlay
    // on top of the regenerated world.
    applyChunkDiff(key, chunkX, chunkZ);
  }
}
