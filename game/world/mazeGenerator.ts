/**
 * mazeGenerator -- World-layer wrapper for the hedge maze generator.
 *
 * Detects labyrinth landmark chunks and converts the seeded recursive
 * backtracker output (from game/systems/hedgePlacement) into ECS-ready
 * HedgeComponent and HedgeDecorationComponent placements in world space.
 *
 * Spec §17.5: Grovekeeper Labyrinths (14 hedge labyrinths, every ~30-50 chunks).
 *
 * Pure function -- same worldSeed + chunkX + chunkZ + heightmap always
 * produces identical maze data. All randomness via scopedRNG / seeded derivation.
 */

import gridConfig from "@/config/game/grid.json" with { type: "json" };
import hedgeMazeConfig from "@/config/game/hedgeMaze.json" with { type: "json" };
import type { HedgeComponent, HedgeDecorationComponent } from "@/game/ecs/components/terrain";
import {
  generateMaze,
  mazeToHedgePieces,
  placeMazeDecorations,
} from "@/game/systems/hedgePlacement";
import { hashString } from "@/game/utils/seedRNG";
import { scopedRNG } from "@/game/utils/seedWords";
import { generateAreaName } from "@/game/utils/worldNames";

const CHUNK_SIZE: number = gridConfig.chunkSize;

// ── Constants ─────────────────────────────────────────────────────────────────

/** Probability [0,1] that a chunk hosts a hedge labyrinth (~every 33 chunks). */
export const LABYRINTH_PROBABILITY = 0.03;

/**
 * Total number of Grovekeeper spirits, matching the spec's 8 world quests.
 * mazeIndex is pinned to [0, TOTAL_MAZES - 1] for spirit/dialogue lookups.
 */
const TOTAL_MAZES = 8;

// ── Types ─────────────────────────────────────────────────────────────────────

/** ECS-ready hedge wall piece placement in world space. */
export interface HedgePlacement {
  position: { x: number; y: number; z: number };
  /** Y-axis rotation in degrees: 0 or 90 for straight wall segments. */
  rotationY: number;
  hedge: HedgeComponent;
}

/** ECS-ready hedge decoration placement in world space. */
export interface DecorationPlacement {
  position: { x: number; y: number; z: number };
  decoration: HedgeDecorationComponent;
}

/** All maze entity placements for one labyrinth chunk. */
export interface MazeGenerationResult {
  /** Wall hedge pieces covering the full 12x12 maze footprint. */
  hedges: HedgePlacement[];
  /** Decorations: fountain, benches, flowers, vases, columns. */
  decorations: DecorationPlacement[];
  /** World-space center of the maze (fountain / spirit spawn point). */
  centerPosition: { x: number; y: number; z: number };
  /** World-space entrance (south edge, middle column). */
  entrancePosition: { x: number; y: number; z: number };
  /**
   * Stable index in [0, TOTAL_MAZES - 1] used by the spirit system to look
   * up dialogue trees and seeded visual properties.
   * Derived from chunk coords so it's stable across sessions.
   */
  mazeIndex: number;
  /**
   * Seeded human-readable name for this labyrinth.
   * Format: "The [Adjective][Noun] Labyrinth"
   * Generated via worldNames.generateAreaName. Spec §40.2.
   */
  name: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function heightAt(heightmap: Float32Array, localX: number, localZ: number): number {
  const ix = Math.min(Math.max(Math.floor(localX), 0), CHUNK_SIZE - 1);
  const iz = Math.min(Math.max(Math.floor(localZ), 0), CHUNK_SIZE - 1);
  return heightmap[iz * CHUNK_SIZE + ix];
}

/**
 * Extract item identifier from a decoration model path.
 * e.g. "hedges/misc/stone/fountain01_round_water.glb" -> "fountain01_round_water"
 */
function extractItemId(modelPath: string): string {
  const parts = modelPath.split("/");
  const filename = parts[parts.length - 1];
  return filename.replace(/\.glb$/, "");
}

// ── Detection ─────────────────────────────────────────────────────────────────

/**
 * Returns true if (chunkX, chunkZ) hosts a hedge labyrinth.
 *
 * Uses a dedicated "labyrinth-roll" scope so labyrinth detection is
 * independent from the landmark system (shrines, villages, campfires).
 *
 * Chunk (0, 0) never hosts a labyrinth -- it is always the tutorial village.
 * Chunk (1, 1) always hosts the first labyrinth so the player can discover
 * one within a short walk from the starting village (~22 world units away).
 *
 * Pure function -- deterministic from worldSeed + chunk coords.
 */
export function isLabyrinthChunk(worldSeed: string, chunkX: number, chunkZ: number): boolean {
  if (chunkX === 0 && chunkZ === 0) return false;
  // Guarantee the first discoverable maze just north-east of the starting village.
  if (chunkX === 1 && chunkZ === 1) return true;
  const rng = scopedRNG("labyrinth-roll", worldSeed, chunkX, chunkZ);
  return rng() < LABYRINTH_PROBABILITY;
}

// ── Main export ───────────────────────────────────────────────────────────────

/**
 * Generate a hedge labyrinth for a labyrinth chunk.
 *
 * Returns null if the chunk is not a labyrinth chunk.
 *
 * Algorithm:
 *   1. Guard: return null unless isLabyrinthChunk().
 *   2. Derive an integer seed from worldSeed + chunk coords.
 *   3. Generate 12x12 recursive-backtracker maze (via hedgePlacement).
 *   4. Convert wall segments to HedgeComponent placements in world space.
 *   5. Convert decorations to HedgeDecorationComponent placements.
 *   6. Compute centerPosition and entrancePosition in world space.
 *
 * Spec §17.5: Garden labyrinths with modular hedge GLBs.
 *
 * @param worldSeed  World seed string.
 * @param chunkX     Chunk X grid coordinate.
 * @param chunkZ     Chunk Z grid coordinate.
 * @param heightmap  CHUNK_SIZE*CHUNK_SIZE Float32Array (row-major: z*size+x).
 * @returns          Maze placements, or null if not a labyrinth chunk.
 */
export function generateLabyrinth(
  worldSeed: string,
  chunkX: number,
  chunkZ: number,
  heightmap: Float32Array,
): MazeGenerationResult | null {
  if (!isLabyrinthChunk(worldSeed, chunkX, chunkZ)) return null;

  // Derive a stable integer seed from worldSeed + chunk coords.
  const mazeSeed = hashString(`maze-${worldSeed}-${chunkX}-${chunkZ}`);

  // Generate maze grid and convert to local-space pieces.
  const mazeResult = generateMaze(mazeSeed);
  const hedgePieces = mazeToHedgePieces(mazeResult, mazeSeed);
  const decorationPieces = placeMazeDecorations(mazeResult, mazeSeed + 1);

  // World origin: maze placed at the chunk's world-space corner.
  const worldOriginX = chunkX * CHUNK_SIZE;
  const worldOriginZ = chunkZ * CHUNK_SIZE;

  // ── Hedge wall pieces ──────────────────────────────────────────────────────
  const hedges: HedgePlacement[] = hedgePieces.map((piece) => {
    const wx = worldOriginX + piece.x;
    const wz = worldOriginZ + piece.z;
    const y = heightAt(heightmap, piece.x, piece.z);

    return {
      position: { x: wx, y, z: wz },
      rotationY: piece.rotation,
      hedge: {
        pieceType: piece.pieceType,
        sizeClass: piece.sizeClass,
        junction: piece.junction,
        rotation: piece.rotation,
        modelPath: piece.modelPath,
      },
    };
  });

  // ── Decoration pieces ──────────────────────────────────────────────────────
  const decorations: DecorationPlacement[] = decorationPieces.map((deco) => {
    const wx = worldOriginX + deco.x;
    const wz = worldOriginZ + deco.z;
    const localX = deco.x;
    const localZ = deco.z;
    const y = heightAt(heightmap, localX, localZ);

    return {
      position: { x: wx, y, z: wz },
      decoration: {
        category: deco.category as HedgeDecorationComponent["category"],
        itemId: extractItemId(deco.modelPath),
        modelPath: deco.modelPath,
      },
    };
  });

  // ── Center and entrance positions ──────────────────────────────────────────
  const cellScale: number = hedgeMazeConfig.cellScale;

  const centerLocalX = (mazeResult.centerX + 0.5) * cellScale;
  const centerLocalZ = (mazeResult.centerZ + 0.5) * cellScale;
  const centerY = heightAt(heightmap, centerLocalX, centerLocalZ);

  // Entrance: south edge (z=0), middle column.
  const entranceLocalX = Math.floor(mazeResult.size / 2) * cellScale;
  const entranceLocalZ = 0;
  const entranceY = heightAt(heightmap, entranceLocalX, entranceLocalZ);

  // Stable mazeIndex in [0, TOTAL_MAZES - 1] for spirit/dialogue lookups.
  const mazeIndex = hashString(`${chunkX}-${chunkZ}`) % TOTAL_MAZES;

  // Seeded labyrinth name. Spec §40.2.
  const name = generateAreaName("labyrinth", worldSeed, chunkX, chunkZ);

  return {
    hedges,
    decorations,
    centerPosition: {
      x: worldOriginX + centerLocalX,
      y: centerY,
      z: worldOriginZ + centerLocalZ,
    },
    entrancePosition: {
      x: worldOriginX + entranceLocalX,
      y: entranceY,
      z: worldOriginZ + entranceLocalZ,
    },
    mazeIndex,
    name,
  };
}
