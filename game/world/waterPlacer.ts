/**
 * waterPlacer -- Places water bodies based on heightmap low points and biome.
 *
 * Spec §31.2: Water bodies are ECS entities placed at terrain low points.
 * Rivers follow the gradient (flow toward steepest descent).
 * Biome determines water type and placement probability.
 *
 * Pure function — same worldSeed + chunkX + chunkZ + heightmap always
 * produces identical placements. All randomness via scopedRNG.
 */

import type { BiomeType } from "./biomeMapper";
import type {
  WaterBodyComponent,
  WaterBodyType,
  GerstnerWaveLayer,
} from "@/game/ecs/components/procedural/water";
import { scopedRNG } from "@/game/utils/seedWords";
import gridConfig from "@/config/game/grid.json" with { type: "json" };
import proceduralConfig from "@/config/game/procedural.json" with { type: "json" };

const CHUNK_SIZE: number = gridConfig.chunkSize;

// ── Constants ──────────────────────────────────────────────────────────────────

/** Height threshold: local minima below this value are candidates for water. */
export const LOW_POINT_THRESHOLD = -0.2;

/** Maximum water bodies placed per chunk to prevent flooding. */
export const MAX_WATER_BODIES_PER_CHUNK = 2;

// ── Types ──────────────────────────────────────────────────────────────────────

/** A water body ready to be added to ECS. */
export interface WaterBodyPlacement {
  /** World-space center position. */
  position: { x: number; y: number; z: number };
  /** Full WaterBodyComponent data. */
  waterBody: WaterBodyComponent;
}

/** Biome water placement rules. */
export interface BiomeWaterRule {
  /** Probability [0,1] that a local minimum spawns a water body. */
  probability: number;
  /** Probability [0,1] (within placed band) that the water type is a river. */
  riverChance: number;
  /** Probability [0,1] (within placed band, after river) that it's a stream. */
  streamChance: number;
}

interface LocalMinimum {
  localX: number;
  localZ: number;
  height: number;
}

// ── Pure helpers ───────────────────────────────────────────────────────────────

/**
 * Scan a heightmap for local minima below `threshold`.
 *
 * A local minimum has a value strictly less than all 8 neighbors and below
 * the height threshold. Edge cells are skipped (no full neighbor ring).
 *
 * @param heightmap  CHUNK_SIZE × CHUNK_SIZE Float32Array (row-major: z*size+x)
 * @param chunkSize  Width/depth of the heightmap grid.
 * @param threshold  Only return minima strictly below this height value.
 */
export function findLocalMinima(
  heightmap: Float32Array,
  chunkSize: number,
  threshold: number,
): LocalMinimum[] {
  const minima: LocalMinimum[] = [];
  for (let z = 1; z < chunkSize - 1; z++) {
    for (let x = 1; x < chunkSize - 1; x++) {
      const h = heightmap[z * chunkSize + x];
      if (h >= threshold) continue;
      let isMin = true;
      outer: for (let dz = -1; dz <= 1; dz++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dz === 0 && dx === 0) continue;
          if (heightmap[(z + dz) * chunkSize + (x + dx)] < h) {
            isMin = false;
            break outer;
          }
        }
      }
      if (isMin) minima.push({ localX: x, localZ: z, height: h });
    }
  }
  return minima;
}

/**
 * Compute the downhill flow direction at tile (x, z) using central differences.
 *
 * Returns a normalized [dx, dz] vector pointing in the direction of steepest
 * descent. Falls back to [1, 0] for flat terrain (no gradient).
 *
 * @param heightmap  CHUNK_SIZE × CHUNK_SIZE Float32Array.
 * @param x          Local tile X (must have valid neighbors: 1..chunkSize-2).
 * @param z          Local tile Z (must have valid neighbors: 1..chunkSize-2).
 * @param chunkSize  Grid width/depth.
 */
export function computeFlowDirection(
  heightmap: Float32Array,
  x: number,
  z: number,
  chunkSize: number,
): [number, number] {
  const right = heightmap[z * chunkSize + (x + 1)];
  const left = heightmap[z * chunkSize + (x - 1)];
  const down = heightmap[(z + 1) * chunkSize + x];
  const up = heightmap[(z - 1) * chunkSize + x];
  // Gradient points uphill; negate to get downhill flow direction.
  const gx = (right - left) * 0.5;
  const gz = (down - up) * 0.5;
  const mag = Math.sqrt(gx * gx + gz * gz);
  if (mag < 1e-6) return [1, 0];
  return [-(gx / mag), -(gz / mag)];
}

// ── Biome water rules ──────────────────────────────────────────────────────────

/**
 * Return water placement rules for a given biome.
 *
 * `probability` is the per-minimum chance of spawning a water body.
 * Within the placed band: first `riverChance` fraction → river,
 * next `streamChance` fraction → stream, remainder → pond.
 */
export function getBiomeWaterRule(biome: BiomeType): BiomeWaterRule {
  switch (biome) {
    case "frozen-peaks":
      return { probability: 0, riverChance: 0, streamChance: 0 };
    case "wetlands":
      return { probability: 0.5, riverChance: 0.3, streamChance: 0.1 };
    case "ancient-forest":
      return { probability: 0.3, riverChance: 0.2, streamChance: 0.0 };
    case "rocky-highlands":
      return { probability: 0.2, riverChance: 0.0, streamChance: 1.0 };
    case "meadow":
      return { probability: 0.15, riverChance: 0.0, streamChance: 0.0 };
    case "orchard-valley":
      return { probability: 0.15, riverChance: 0.1, streamChance: 0.0 };
    case "twilight-glade":
      return { probability: 0.2, riverChance: 0.2, streamChance: 0.0 };
    case "starting-grove":
    default:
      return { probability: 0.1, riverChance: 0.0, streamChance: 0.0 };
  }
}

/**
 * Select a water type given a biome rule and a [0,1] RNG roll.
 *
 * Returns null if roll >= rule.probability (no placement).
 * Within the placed band the roll is normalized to select type:
 *   - First `riverChance` fraction  → river
 *   - Next `streamChance` fraction  → stream
 *   - Remainder                     → pond
 */
export function selectWaterType(
  rule: BiomeWaterRule,
  roll: number,
): WaterBodyType | null {
  if (rule.probability === 0 || roll >= rule.probability) return null;
  const normalized = roll / rule.probability;
  if (normalized < rule.riverChance) return "river";
  if (normalized < rule.riverChance + rule.streamChance) return "stream";
  return "pond";
}

// ── WaterBodyComponent factory ─────────────────────────────────────────────────

function buildWaterBody(
  waterType: WaterBodyType,
  flowDir: [number, number],
): WaterBodyComponent {
  const colors = proceduralConfig.water.colors;
  const foamThreshold: number = proceduralConfig.water.foamThreshold;

  if (waterType === "river") {
    const waves = proceduralConfig.water.riverWaves as unknown as GerstnerWaveLayer[];
    const alignedWaves: GerstnerWaveLayer[] = waves.map((w, i) =>
      i === 0 ? { ...w, direction: flowDir } : w,
    );
    return {
      waterType: "river",
      waveLayers: alignedWaves,
      color: colors.river,
      opacity: 0.85,
      size: { width: 4, depth: 16 },
      foamEnabled: true,
      foamThreshold,
      causticsEnabled: true,
      flowDirection: flowDir,
      flowSpeed: 1.2,
    };
  }

  if (waterType === "stream") {
    const waves = proceduralConfig.water.riverWaves as unknown as GerstnerWaveLayer[];
    return {
      waterType: "stream",
      waveLayers: [{ ...waves[0], direction: flowDir }],
      color: colors.stream,
      opacity: 0.75,
      size: { width: 2, depth: 8 },
      foamEnabled: false,
      foamThreshold,
      causticsEnabled: true,
      flowDirection: flowDir,
      flowSpeed: 1.8,
    };
  }

  // pond (default)
  const waves = proceduralConfig.water.pondWaves as unknown as GerstnerWaveLayer[];
  return {
    waterType: "pond",
    waveLayers: waves,
    color: colors.pond,
    opacity: 0.8,
    size: { width: 6, depth: 6 },
    foamEnabled: false,
    foamThreshold,
    causticsEnabled: true,
    flowDirection: [1, 0],
    flowSpeed: 0,
  };
}

// ── Main export ────────────────────────────────────────────────────────────────

/**
 * Place water bodies for a chunk based on its heightmap and biome.
 *
 * Algorithm:
 *   1. Scan heightmap for local minima below LOW_POINT_THRESHOLD.
 *   2. Look up biome water rules (placement probability + type distribution).
 *   3. For each minimum, roll scopedRNG to decide whether and what type.
 *   4. For rivers/streams, compute flow direction from the heightmap gradient.
 *   5. Return at most MAX_WATER_BODIES_PER_CHUNK placements.
 *
 * Spec §31.2: water bodies are ECS entities placed at terrain low points;
 * rivers follow gradient; biome determines type and probability.
 *
 * @param worldSeed  World seed string.
 * @param chunkX     Chunk X grid coordinate.
 * @param chunkZ     Chunk Z grid coordinate.
 * @param heightmap  CHUNK_SIZE × CHUNK_SIZE Float32Array heightmap.
 * @param biome      Biome type for this chunk.
 * @returns          Array of water body placements (max MAX_WATER_BODIES_PER_CHUNK).
 */
export function placeWaterBodies(
  worldSeed: string,
  chunkX: number,
  chunkZ: number,
  heightmap: Float32Array,
  biome: BiomeType,
): WaterBodyPlacement[] {
  const rule = getBiomeWaterRule(biome);
  if (rule.probability === 0) return [];

  const minima = findLocalMinima(heightmap, CHUNK_SIZE, LOW_POINT_THRESHOLD);
  if (minima.length === 0) return [];

  const rng = scopedRNG("water-placement", worldSeed, chunkX, chunkZ);
  const placements: WaterBodyPlacement[] = [];
  const heightScale: number = proceduralConfig.terrain.heightScale;

  for (const min of minima) {
    if (placements.length >= MAX_WATER_BODIES_PER_CHUNK) break;
    const roll = rng();
    const waterType = selectWaterType(rule, roll);
    if (!waterType) continue;

    const flowDir: [number, number] =
      waterType === "river" || waterType === "stream"
        ? computeFlowDirection(heightmap, min.localX, min.localZ, CHUNK_SIZE)
        : [1, 0];

    placements.push({
      position: {
        x: chunkX * CHUNK_SIZE + min.localX,
        y: min.height * heightScale,
        z: chunkZ * CHUNK_SIZE + min.localZ,
      },
      waterBody: buildWaterBody(waterType, flowDir),
    });
  }

  return placements;
}
