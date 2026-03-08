/**
 * villageLayout/furniture.ts
 *
 * Street furniture placement helpers for the village layout system.
 * Spec §43.1 step 5: lamp posts, well, crates/barrels.
 */

import gridConfig from "@/config/game/grid.json" with { type: "json" };
import structuresConfig from "@/config/game/structures.json" with { type: "json" };
import type { BlueprintPlacement, FurniturePlacement, StreetSegment } from "./types.ts";

const CHUNK_SIZE: number = gridConfig.chunkSize;
const LAMP_POST_SPACING: number = structuresConfig.villageLayout.lampPostSpacing;
const FURNITURE_MIN: number = structuresConfig.villageLayout.streetFurniturePerBuilding.min;
const FURNITURE_MAX: number = structuresConfig.villageLayout.streetFurniturePerBuilding.max;

// ── Helpers ───────────────────────────────────────────────────────────────────

export function sampleHeight(heightmap: Float32Array, localX: number, localZ: number): number {
  const ix = Math.min(Math.floor(Math.max(localX, 0)), CHUNK_SIZE - 1);
  const iz = Math.min(Math.floor(Math.max(localZ, 0)), CHUNK_SIZE - 1);
  return heightmap[iz * CHUNK_SIZE + ix];
}

function clampLocal(v: number): number {
  return Math.min(Math.max(v, 1), CHUNK_SIZE - 2);
}

// ── Lamp posts ────────────────────────────────────────────────────────────────

/**
 * Generate lamp post placements along a single street segment.
 *
 * Lamps are spaced every `lampPostSpacing` tiles along the street's
 * center line. Segment coordinates are in chunk-local space.
 *
 * Spec §43.1: "Lamp posts at intersections (every 3 tiles along streets)".
 */
export function lampPostsAlongStreet(
  seg: StreetSegment,
  heightmap: Float32Array,
): FurniturePlacement[] {
  const lamps: FurniturePlacement[] = [];
  const dx = seg.endX - seg.startX;
  const dz = seg.endZ - seg.startZ;
  const length = Math.sqrt(dx * dx + dz * dz);
  if (length < 1) return lamps;

  const steps = Math.floor(length / LAMP_POST_SPACING);
  for (let s = 1; s <= steps; s++) {
    const t = s / (steps + 1);
    const lx = clampLocal(seg.startX + dx * t);
    const lz = clampLocal(seg.startZ + dz * t);
    lamps.push({
      position: { x: lx, y: sampleHeight(heightmap, lx, lz), z: lz },
      type: "lamp_post",
    });
  }
  return lamps;
}

// ── Well at intersection ──────────────────────────────────────────────────────

/**
 * Place a well at the grid center (only when a cross street exists).
 *
 * Spec §43.1: "Well/fountain at largest intersection (if cross street exists)".
 *
 * @param chunkX      Chunk X coordinate for world-space conversion.
 * @param chunkZ      Chunk Z coordinate.
 * @param gridOriginX Grid origin X in chunk-local space.
 * @param gridOriginZ Grid origin Z in chunk-local space.
 * @param halfW       Half the grid width.
 * @param halfD       Half the grid depth.
 * @param heightmap   Heightmap for Y sampling.
 */
export function wellAtIntersection(
  chunkX: number,
  chunkZ: number,
  gridOriginX: number,
  gridOriginZ: number,
  halfW: number,
  halfD: number,
  heightmap: Float32Array,
): FurniturePlacement {
  const wx = clampLocal(gridOriginX + halfW);
  const wz = clampLocal(gridOriginZ + halfD);
  return {
    position: {
      x: chunkX * CHUNK_SIZE + wx,
      y: sampleHeight(heightmap, wx, wz),
      z: chunkZ * CHUNK_SIZE + wz,
    },
    type: "well",
  };
}

// ── Crates / barrels at building fronts ───────────────────────────────────────

/**
 * Place crates / barrels in front of a building's door.
 *
 * Spec §43.1: "Crates/barrels at building fronts (1–2 per building, seeded)".
 *
 * @param building   The building whose front receives furniture.
 * @param chunkX     Chunk X for world-to-local conversion.
 * @param chunkZ     Chunk Z for world-to-local conversion.
 * @param rng        Seeded RNG stream (consumed from caller's sequence).
 * @param heightmap  Heightmap for Y sampling.
 */
export function buildingFrontFurniture(
  building: BlueprintPlacement,
  chunkX: number,
  chunkZ: number,
  rng: () => number,
  heightmap: Float32Array,
): FurniturePlacement[] {
  const pieces: FurniturePlacement[] = [];
  const count = FURNITURE_MIN + Math.floor(rng() * (FURNITURE_MAX - FURNITURE_MIN + 1));

  for (let f = 0; f < count; f++) {
    const offsetDist = 1.2 + rng() * 0.6;
    const lateral = (rng() - 0.5) * 0.8;
    const rad = building.rotationY;

    const wx = building.position.x + Math.sin(rad) * offsetDist + Math.cos(rad) * lateral;
    const wz = building.position.z + Math.cos(rad) * offsetDist - Math.sin(rad) * lateral;

    const localFx = Math.min(Math.max(wx - chunkX * CHUNK_SIZE, 0), CHUNK_SIZE - 1);
    const localFz = Math.min(Math.max(wz - chunkZ * CHUNK_SIZE, 0), CHUNK_SIZE - 1);

    pieces.push({
      position: { x: wx, y: sampleHeight(heightmap, localFx, localFz), z: wz },
      type: rng() < 0.5 ? "crate" : "barrel",
    });
  }
  return pieces;
}
