/**
 * Wall segment + corner fill piece generation for hedge mazes. Spec §17.5.
 *
 * Phase 1 — wall segments: iterate cells and place a piece for each wall edge.
 *   Primary type is "basic"; 20% of segments use "round" and 10% use "diagonal"
 *   for aesthetic variety.
 *
 * Phase 2 — corner fill at vertices: for each of the (size+1)×(size+1) grid
 *   vertices, classify how many walls radiate and in which directions:
 *     - 2 perpendicular walls → "round" corner fill (rotated to face opening)
 *     - 3 walls (T-junction)  → "triangle" fill (rotated toward absent wall)
 *     - 4 walls (X-junction)  → "triangle" fill (rotation 0)
 */

import hedgeMazeConfig from "@/config/game/hedgeMaze.json" with { type: "json" };
import { createRNG } from "@/game/utils/seedRNG";
import type { HedgePiece, MazeCell, MazeResult } from "./types.ts";

const ROUND_FRACTION = 0.2;
const DIAGONAL_FRACTION = 0.1;

interface VertexWalls {
  east: boolean;
  west: boolean;
  north: boolean;
  south: boolean;
}

/**
 * Determine which wall segments radiate from grid vertex (vx, vz).
 *
 * Vertex (vx, vz) is at the intersection of world lines x=vx*cellScale and
 * z=vz*cellScale. The four possible wall segments are:
 *   east  = north wall of cell (vx, vz)   | south wall of cell (vx, vz-1) at boundary
 *   west  = north wall of cell (vx-1, vz) | south wall of cell (vx-1, vz-1) at boundary
 *   south = west wall of cell  (vx, vz)   | east wall of cell (vx-1, vz) at boundary
 *   north = west wall of cell  (vx, vz-1) | east wall of cell (vx-1, vz-1) at boundary
 */
function getVertexWalls(grid: MazeCell[][], vx: number, vz: number, size: number): VertexWalls {
  const east =
    (vz < size && vx < size && grid[vx][vz].walls.north) ||
    (vz === size && vx < size && grid[vx][size - 1].walls.south);
  const west =
    (vz < size && vx > 0 && grid[vx - 1][vz].walls.north) ||
    (vz === size && vx > 0 && grid[vx - 1][size - 1].walls.south);
  const south =
    (vx < size && vz < size && grid[vx][vz].walls.west) ||
    (vx === size && vz < size && grid[size - 1][vz].walls.east);
  const north =
    (vx < size && vz > 0 && grid[vx][vz - 1].walls.west) ||
    (vx === size && vz > 0 && grid[size - 1][vz - 1].walls.east);
  return { east, west, north, south };
}

/**
 * Returns Y-rotation for a 2-wall right-angle corner, or null if the walls
 * are collinear (not a corner that needs a fill piece).
 */
function cornerRotation(w: VertexWalls): number | null {
  if (w.east && w.south && !w.west && !w.north) return 0;
  if (w.west && w.south && !w.east && !w.north) return 90;
  if (w.west && w.north && !w.east && !w.south) return 180;
  if (w.east && w.north && !w.west && !w.south) return 270;
  return null;
}

/** Returns rotation for a T-junction (3 walls): points toward the absent wall. */
function tJunctionRotation(w: VertexWalls): number {
  if (!w.north) return 0;
  if (!w.east) return 90;
  if (!w.south) return 180;
  return 270;
}

/** Select a wall-segment piece (basic, round, or diagonal) at the given rotation. */
function pickWallPiece(rng: () => number, rotation: number): Omit<HedgePiece, "x" | "z"> {
  const roll = rng();
  if (roll < ROUND_FRACTION) {
    const sizes: string[] = hedgeMazeConfig.pieceWeights.round;
    const sz = sizes[Math.floor(rng() * sizes.length)];
    return {
      modelPath: `hedges/round/round_${sz}.glb`,
      rotation,
      pieceType: "round",
      sizeClass: sz,
      junction: "",
    };
  }
  if (roll < ROUND_FRACTION + DIAGONAL_FRACTION) {
    const sizes: string[] = hedgeMazeConfig.pieceWeights.diagonal;
    const sz = sizes[Math.floor(rng() * sizes.length)];
    return {
      modelPath: `hedges/diagonal/diagonal_${sz}.glb`,
      rotation,
      pieceType: "diagonal",
      sizeClass: sz,
      junction: "",
    };
  }
  const sizes: string[] = hedgeMazeConfig.pieceWeights.basic;
  const sz = sizes[Math.floor(rng() * sizes.length)];
  return {
    modelPath: `hedges/basic/basic_${sz}.glb`,
    rotation,
    pieceType: "basic",
    sizeClass: sz,
    junction: "",
  };
}

/**
 * Converts maze wall data into modular hedge piece placements with correct
 * piece type and rotation. See module JSDoc for the two-phase algorithm.
 */
export function mazeToHedgePieces(maze: MazeResult, seed: number): HedgePiece[] {
  const rng = createRNG(seed);
  const pieces: HedgePiece[] = [];
  const { grid, size } = maze;
  const cellScale: number = hedgeMazeConfig.cellScale;
  const roundSizes: string[] = hedgeMazeConfig.pieceWeights.round;
  const triSizes: string[] = hedgeMazeConfig.pieceWeights.triangle;

  // ── Phase 1: Wall segments ──────────────────────────────────────────────────
  for (let x = 0; x < size; x++) {
    for (let z = 0; z < size; z++) {
      const cell = grid[x][z];
      if (cell.walls.north) {
        const p = { ...pickWallPiece(rng, 0), x: x * cellScale, z: z * cellScale };
        pieces.push(p);
      }
      if (cell.walls.west) {
        const p = { ...pickWallPiece(rng, 90), x: x * cellScale, z: z * cellScale };
        pieces.push(p);
      }
    }
  }
  // Boundary: south of last row and east of last column.
  for (let x = 0; x < size; x++) {
    if (grid[x][size - 1].walls.south) {
      const p = { ...pickWallPiece(rng, 0), x: x * cellScale, z: size * cellScale };
      pieces.push(p);
    }
  }
  for (let z = 0; z < size; z++) {
    if (grid[size - 1][z].walls.east) {
      const p = { ...pickWallPiece(rng, 90), x: size * cellScale, z: z * cellScale };
      pieces.push(p);
    }
  }

  // ── Phase 2: Corner fill pieces at vertices ─────────────────────────────────
  for (let vx = 0; vx <= size; vx++) {
    for (let vz = 0; vz <= size; vz++) {
      const w = getVertexWalls(grid, vx, vz, size);
      const count = [w.east, w.west, w.north, w.south].filter(Boolean).length;

      if (count === 2) {
        const rotation = cornerRotation(w);
        if (rotation === null) continue; // Collinear — no fill needed.
        const sz = roundSizes[Math.floor(rng() * roundSizes.length)];
        pieces.push({
          modelPath: `hedges/round/round_${sz}.glb`,
          rotation,
          x: vx * cellScale,
          z: vz * cellScale,
          pieceType: "round",
          sizeClass: sz,
          junction: "",
        });
      } else if (count >= 3) {
        const rotation = count === 3 ? tJunctionRotation(w) : 0;
        const sz = triSizes[Math.floor(rng() * triSizes.length)];
        pieces.push({
          modelPath: `hedges/triangle/triangle_${sz}.glb`,
          rotation,
          x: vx * cellScale,
          z: vz * cellScale,
          pieceType: "triangle",
          sizeClass: sz,
          junction: "",
        });
      }
    }
  }

  return pieces;
}
