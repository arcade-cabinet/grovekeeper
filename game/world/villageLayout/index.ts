/**
 * villageLayout/index.ts — Street-grid village layout (Spec §43.1).
 *
 * Pure function: same worldSeed + chunkX + chunkZ + heightmap → identical output.
 * All randomness via scopedRNG. All tuning values from config/game/structures.json.
 *
 * Rootmere (chunk 0,0) is §17.3a authored. The caller (ChunkManager) must
 * guard against calling this for chunk (0,0).
 */

import gridConfig from "@/config/game/grid.json" with { type: "json" };
import structuresConfig from "@/config/game/structures.json" with { type: "json" };
import type { BuildingMaterialType } from "@/game/ecs/components/structures";
import { scopedRNG } from "@/game/utils/seedWords";
import { getLandmarkLocalPos } from "@/game/world/pathGenerator.ts";

import {
  buildingFrontFurniture,
  lampPostsAlongStreet,
  sampleHeight,
  wellAtIntersection,
} from "./furniture.ts";
import { BLUEPRINT_POOL, buildLots, LOT_MARGIN, pickBlueprintId } from "./lots.ts";
import type {
  BlueprintPlacement,
  BuildingLot,
  FurniturePlacement,
  StreetSegment,
  VillageLayout,
} from "./types.ts";

// Re-export all public types so consumers import from this barrel.
export type {
  BlueprintPlacement,
  BuildingLot,
  FurniturePlacement,
  StreetSegment,
  VillageLayout,
} from "./types.ts";

// ── Config constants ──────────────────────────────────────────────────────────

const CHUNK_SIZE: number = gridConfig.chunkSize;
const vl = structuresConfig.villageLayout;
const MIN_GRID_W: number = vl.minGridW;
const MAX_GRID_W: number = vl.maxGridW;
const MIN_GRID_D: number = vl.minGridD;
const MAX_GRID_D: number = vl.maxGridD;
const STREET_WIDTH: number = vl.streetWidth;
const CROSS_STREET_CHANCE: number = vl.crossStreetChance;

// ── Helpers ───────────────────────────────────────────────────────────────────

function clampLocal(v: number): number {
  return Math.min(Math.max(v, 1), CHUNK_SIZE - 2);
}

function facingToRotation(facing: 0 | 90 | 180 | 270): number {
  return (facing * Math.PI) / 180;
}

function pickVariation(rng: () => number): number {
  return Math.floor(rng() * 256);
}

// ── Streets ───────────────────────────────────────────────────────────────────

function buildStreets(
  gridOriginX: number,
  gridOriginZ: number,
  gridW: number,
  gridD: number,
  hasCrossStreet: boolean,
): StreetSegment[] {
  const halfW = gridW / 2;
  const halfD = gridD / 2;
  const sw = STREET_WIDTH;
  const segs: StreetSegment[] = [];
  const mainAlongX = gridW >= gridD;

  if (mainAlongX) {
    segs.push({
      startX: gridOriginX,
      startZ: gridOriginZ + halfD - sw / 2,
      endX: gridOriginX + gridW,
      endZ: gridOriginZ + halfD + sw / 2,
      width: sw,
    });
    if (hasCrossStreet) {
      segs.push({
        startX: gridOriginX + halfW - sw / 2,
        startZ: gridOriginZ,
        endX: gridOriginX + halfW + sw / 2,
        endZ: gridOriginZ + gridD,
        width: sw,
      });
    }
  } else {
    segs.push({
      startX: gridOriginX + halfW - sw / 2,
      startZ: gridOriginZ,
      endX: gridOriginX + halfW + sw / 2,
      endZ: gridOriginZ + gridD,
      width: sw,
    });
    if (hasCrossStreet) {
      segs.push({
        startX: gridOriginX,
        startZ: gridOriginZ + halfD - sw / 2,
        endX: gridOriginX + gridW,
        endZ: gridOriginZ + halfD + sw / 2,
        width: sw,
      });
    }
  }
  return segs;
}

// ── Buildings ─────────────────────────────────────────────────────────────────

function buildBuildings(
  lots: BuildingLot[],
  chunkX: number,
  chunkZ: number,
  heightmap: Float32Array,
  rng: () => number,
): BlueprintPlacement[] {
  const buildings: BlueprintPlacement[] = [];
  const buildingCount = lots.length;

  for (let i = 0; i < lots.length; i++) {
    const lot = lots[i];
    // Minimum usable lot: at least 1 world unit of building after margins.
    if (lot.w < 1 || lot.d < 1) continue;

    const blueprintId = pickBlueprintId(rng, buildingCount, i);
    const blueprint = BLUEPRINT_POOL.find((b) => b.id === blueprintId);
    if (!blueprint) continue;

    const variation = pickVariation(rng);
    const lx = clampLocal(lot.x + lot.w / 2);
    const lz = clampLocal(lot.z + lot.d / 2);

    buildings.push({
      position: {
        x: chunkX * CHUNK_SIZE + lx,
        y: sampleHeight(heightmap, lx, lz),
        z: chunkZ * CHUNK_SIZE + lz,
      },
      blueprintId,
      footprintW: Math.min(blueprint.footprintW, Math.max(1, lot.w - LOT_MARGIN * 2)),
      footprintD: Math.min(blueprint.footprintD, Math.max(1, lot.d - LOT_MARGIN * 2)),
      stories: blueprint.stories,
      materialType: blueprint.materialType as BuildingMaterialType,
      facing: lot.facing,
      variation,
      rotationY: facingToRotation(lot.facing),
    });
  }
  return buildings;
}

// ── Main export ───────────────────────────────────────────────────────────────

/**
 * Generate a street-grid village layout for a procedural village chunk.
 *
 * Spec §43.1: Street-Grid Layout Algorithm.
 *
 * @param worldSeed  World seed string.
 * @param chunkX     Chunk X coordinate (caller must exclude chunk 0,0 — Rootmere).
 * @param chunkZ     Chunk Z coordinate.
 * @param heightmap  CHUNK_SIZE×CHUNK_SIZE Float32Array, row-major (z*size+x).
 */
export function generateVillageLayout(
  worldSeed: string,
  chunkX: number,
  chunkZ: number,
  heightmap: Float32Array,
): VillageLayout {
  const rng = scopedRNG("village-layout", worldSeed, chunkX, chunkZ);

  // Village center in chunk-local coords (from landmark system).
  const { localX: centerLocal, localZ: centerLocalZ } = getLandmarkLocalPos(
    worldSeed,
    chunkX,
    chunkZ,
  );

  // Grid dimensions — seeded within config bounds.
  const gridW = MIN_GRID_W + Math.floor(rng() * (MAX_GRID_W - MIN_GRID_W + 1));
  const gridD = MIN_GRID_D + Math.floor(rng() * (MAX_GRID_D - MIN_GRID_D + 1));

  // Grid origin: top-left corner, centered on the landmark position.
  const gridOriginX = clampLocal(centerLocal - gridW / 2);
  const gridOriginZ = clampLocal(centerLocalZ - gridD / 2);

  const hasCrossStreet = rng() < CROSS_STREET_CHANCE;
  const halfW = gridW / 2;
  const halfD = gridD / 2;

  // Streets (in chunk-local coords — no world offset needed; renderer will add chunk base).
  const streets = buildStreets(gridOriginX, gridOriginZ, gridW, gridD, hasCrossStreet);

  // Lots in chunk-local coords (grid-local + gridOrigin).
  const rawLots = buildLots(gridW, gridD, hasCrossStreet);
  const lots: BuildingLot[] = rawLots.map((lot) => ({
    x: gridOriginX + lot.x,
    z: gridOriginZ + lot.z,
    w: lot.w,
    d: lot.d,
    facing: lot.facing,
  }));

  // Buildings (world-space positions computed inside helper).
  const buildings = buildBuildings(lots, chunkX, chunkZ, heightmap, rng);

  // Furniture.
  const furniture: FurniturePlacement[] = [];

  for (const seg of streets) {
    furniture.push(...lampPostsAlongStreet(seg, heightmap));
  }

  if (hasCrossStreet) {
    furniture.push(
      wellAtIntersection(chunkX, chunkZ, gridOriginX, gridOriginZ, halfW, halfD, heightmap),
    );
  }

  for (const building of buildings) {
    furniture.push(...buildingFrontFurniture(building, chunkX, chunkZ, rng, heightmap));
  }

  return {
    streets,
    lots,
    buildings,
    furniture,
    center: {
      x: chunkX * CHUNK_SIZE + centerLocal,
      z: chunkZ * CHUNK_SIZE + centerLocalZ,
    },
  };
}
