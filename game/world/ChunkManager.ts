/**
 * ChunkManager -- Streams 3x3 active + 5x5 buffer chunk ring around the player.
 *
 * Architecture (Spec §17.1):
 *   - Chunk size: 16x16 world-space tiles
 *   - Active ring (3x3, radius 1): rendered, renderable.visible = true
 *   - Buffer ring (5x5, radius 2): pre-generated, renderable.visible = false
 *   - Terrain is seamless: global world-space coordinates used for all noise
 *   - Delta-only persistence: unmodified chunks regenerate from seed
 */

import { generateEntityId, world } from "@/game/ecs/world";
import type { Entity } from "@/game/ecs/world";
import { SeededNoise } from "@/game/utils/seededNoise";
import { hashString } from "@/game/utils/seedRNG";
import gridConfig from "@/config/game/grid.json" with { type: "json" };
import { generateHeightmap } from "./terrainGenerator";

export const CHUNK_SIZE: number = gridConfig.chunkSize;
export const ACTIVE_RADIUS: number = gridConfig.activeRadius;
export const BUFFER_RADIUS: number = gridConfig.bufferRadius;

// ─── Biome table (Spec §17.3) ─────────────────────────────────────────────────

const BIOME_COLORS: Record<string, string> = {
  "starting-grove": "#4a7c3f",
  meadow: "#7ab648",
  "ancient-forest": "#2d5a27",
  wetlands: "#3a6b4e",
  "rocky-highlands": "#7a6b5a",
  "orchard-valley": "#8ab640",
  "frozen-peaks": "#d4e8f0",
  "twilight-glade": "#5a3a7c",
};

function determineBiome(temperature: number, moisture: number): string {
  if (temperature < 0.2) return "frozen-peaks";
  if (moisture > 0.8) return "wetlands";
  if (temperature > 0.6 && moisture > 0.5) return "orchard-valley";
  if (temperature < 0.5 && moisture > 0.6) return "ancient-forest";
  if (temperature > 0.5 && moisture < 0.5) return "meadow";
  return "starting-grove";
}

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
  dirty: boolean;
} {
  const tempNoise = new SeededNoise(hashString(`${worldSeed}:temp`));
  const moistNoise = new SeededNoise(hashString(`${worldSeed}:moist`));

  const heightmap = generateHeightmap(worldSeed, chunkX, chunkZ);

  // Biome at chunk centre using coarse-scale noise
  const cx = (chunkX + 0.5) * 0.1;
  const cz = (chunkZ + 0.5) * 0.1;
  const temperature = (tempNoise.perlin(cx, cz) + 1) * 0.5;
  const moisture = (moistNoise.perlin(cx, cz) + 1) * 0.5;
  const biome = determineBiome(temperature, moisture);

  return {
    heightmap,
    baseColor: BIOME_COLORS[biome] ?? "#4a7c3f",
    biomeBlend: [0, 0, 0, 0],
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
  return determineBiome(temperature, moisture);
}

// ─── ChunkManager class ───────────────────────────────────────────────────────

/**
 * ChunkManager tracks the player's chunk position and keeps the ECS world
 * populated with terrain entities for the surrounding active (3x3) and
 * buffer (5x5) rings.
 */
export class ChunkManager {
  private readonly worldSeed: string;
  private readonly loadedChunks: Map<string, Entity> = new Map();
  private playerChunkX = 0;
  private playerChunkZ = 0;
  /** True until the first update() call forces a full load. */
  private initialized = false;

  constructor(worldSeed: string) {
    this.worldSeed = worldSeed;
  }

  /**
   * Call every frame (or when player position changes).
   * Loads/unloads chunks as the player moves across chunk boundaries.
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

    // Unload chunks that are now outside the buffer ring
    const toUnload: string[] = [];
    for (const key of this.loadedChunks.keys()) {
      if (!desiredKeys.has(key)) toUnload.push(key);
    }
    for (const key of toUnload) {
      world.remove(this.loadedChunks.get(key)!);
      this.loadedChunks.delete(key);
    }

    // Load new chunks + update visibility for existing ones
    for (const { chunkX: cx, chunkZ: cz } of bufferChunkCoords) {
      const key = getChunkKey(cx, cz);
      const isActive = activeKeys.has(key);

      if (!this.loadedChunks.has(key)) {
        this.loadChunk(cx, cz, isActive);
      } else {
        // Update visibility when chunk moves between active / buffer
        const entity = this.loadedChunks.get(key)!;
        if (entity.renderable) entity.renderable.visible = isActive;
      }
    }
  }

  /** All currently loaded chunk entities (active + buffer). */
  getLoadedChunks(): ReadonlyMap<string, Entity> {
    return this.loadedChunks;
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
  }
}
