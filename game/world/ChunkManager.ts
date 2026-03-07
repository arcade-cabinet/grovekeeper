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

import { generateEntityId, world } from "@/game/ecs/world";
import type { Entity } from "@/game/ecs/world";
import { SeededNoise } from "@/game/utils/seededNoise";
import { hashString } from "@/game/utils/seedRNG";
import gridConfig from "@/config/game/grid.json" with { type: "json" };
import { generateHeightmap } from "./terrainGenerator";
import { assignBiome, getBiomeColor } from "./biomeMapper";
import type { BiomeType } from "./biomeMapper";
import { placeWaterBodies } from "./waterPlacer";
import { placeAudioZones } from "./audioZonePlacer";
import { spawnChunkEntities } from "./entitySpawner";

export const CHUNK_SIZE: number = gridConfig.chunkSize;
export const ACTIVE_RADIUS: number = gridConfig.activeRadius;
export const BUFFER_RADIUS: number = gridConfig.bufferRadius;

// ─── Pure helpers ─────────────────────────────────────────────────────────────

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

/** Schedule a callback on idle time (requestIdleCallback) or next tick (setTimeout). */
function scheduleIdle(cb: () => void): void {
  if (typeof requestIdleCallback !== "undefined") {
    requestIdleCallback(cb);
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
        // Update visibility when chunk moves between active / buffer
        const entity = this.loadedChunks.get(key)!;
        if (entity.renderable) entity.renderable.visible = isActive;
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

    const item = this.generationQueue.shift()!;
    const key = getChunkKey(item.chunkX, item.chunkZ);

    // Skip if cancelled
    if (this.pendingChunks.has(key)) {
      if (!this.loadedChunks.has(key)) {
        this.loadChunk(item.chunkX, item.chunkZ, item.visible);
      }
      this.pendingChunks.delete(key);
    }

    // If more chunks remain, schedule another idle callback
    if (this.generationQueue.length > 0) {
      this.scheduleGeneration();
    }
  }

  private loadChunk(chunkX: number, chunkZ: number, visible: boolean): void {
    const key = getChunkKey(chunkX, chunkZ);
    const terrainData = generateChunkData(this.worldSeed, chunkX, chunkZ);
    const biome = getChunkBiome(this.worldSeed, chunkX, chunkZ);

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

    // Spawn biome-appropriate vegetation and terrain entities
    const spawned = spawnChunkEntities(this.worldSeed, chunkX, chunkZ, biome as BiomeType, terrainData.heightmap);

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

    if (children.length > 0) {
      this.chunkChildEntities.set(key, children);
    }
  }
}
