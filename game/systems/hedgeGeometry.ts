/**
 * Pure functions for classifying and generating hedge maze instance data.
 *
 * Converts raw { x, z } hedge piece positions into typed HedgeInstance arrays
 * partitioned by depth zone (outer / mid / deep). The zones drive separate
 * InstancedMesh draws with distinct material colours — outer is plain green,
 * mid is autumn brown-green, deep is ominous dark red.
 *
 * No Three.js imports — this is pure game logic, unit-testable without a DOM.
 *
 * Spec §42 — Procedural Architecture (hedge maze subsystem).
 */

import hedgeMazeConfig from "@/config/game/hedgeMaze.json" with { type: "json" };

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type HedgeDepthZone = "outer" | "mid" | "deep";

export interface HedgeInstance {
  /** World-space X. */
  x: number;
  /** World-space Z. */
  z: number;
  /** Vertical layer: 0 (ground) or 1 (one cell height above ground). */
  y: number;
  /** Distance-from-center zone that determines material colour. */
  zone: HedgeDepthZone;
  /** Uniform horizontal scale: 0.8–1.2. */
  scale: number;
  /** Random tilt on X axis (radians, small). */
  rotX: number;
  /** Random rotation around Y axis (radians, full circle). */
  rotY: number;
  /** Random tilt on Z axis (radians, small). */
  rotZ: number;
  /** Vertical stretch multiplier: 1.1–1.5 for organic height variation. */
  scaleY: number;
}

// ---------------------------------------------------------------------------
// Constants — read from config, no inline literals
// ---------------------------------------------------------------------------

/** Cell scale in world units (from hedgeMaze.json). */
const CELL_SCALE: number = hedgeMazeConfig.cellScale;

/** Fraction of half-maze-extent beyond which a piece is classified OUTER. */
const OUTER_THRESHOLD = 0.6;

/** Fraction of half-maze-extent beyond which a piece is classified MID. */
const MID_THRESHOLD = 0.25;

/** Minimum horizontal scale per instance. */
const SCALE_MIN = 0.8;

/** Horizontal scale range (max - min). */
const SCALE_RANGE = 0.4; // 0.8 + 0.4 = 1.2 max

/** Minimum vertical scale multiplier. */
const SCALE_Y_MIN = 1.1;

/** Vertical scale range (max - min). */
const SCALE_Y_RANGE = 0.4; // 1.1 + 0.4 = 1.5 max

/** Max random tilt on X / Z axes (radians). */
const TILT_MAX = 0.08;

// ---------------------------------------------------------------------------
// Pure helpers (exported for testing)
// ---------------------------------------------------------------------------

/**
 * Classify a hedge piece's depth zone by normalised distance from maze center.
 *
 * The maze grid spans [0, mazeSize * cellScale] on both axes; the center is at
 * (centerX * cellScale, centerZ * cellScale). Normalised distance is expressed
 * as a fraction of the half-extent (mazeSize * cellScale / 2).
 *
 * Zone assignment (from spec task description):
 *   dist > OUTER_THRESHOLD  →  "outer"  (standard green)
 *   dist > MID_THRESHOLD    →  "mid"    (autumn tint)
 *   else                    →  "deep"   (ominous red-green)
 */
export function classifyHedgeZone(
  x: number,
  z: number,
  centerX: number,
  centerZ: number,
  mazeSize: number,
): HedgeDepthZone {
  const halfExtent = (mazeSize * CELL_SCALE) / 2;
  if (halfExtent === 0) return "outer";

  const dx = Math.abs(x - centerX);
  const dz = Math.abs(z - centerZ);
  const dist = Math.max(dx, dz) / halfExtent;

  if (dist > OUTER_THRESHOLD) return "outer";
  if (dist > MID_THRESHOLD) return "mid";
  return "deep";
}

/**
 * Generate the full HedgeInstance array from a list of wall-piece positions.
 *
 * Each piece produces exactly 2 instances (ground layer and one cell height
 * above ground) to make hedges two blocks tall. The terrain Y from the ECS
 * entity position is preserved so hedges sit correctly on uneven terrain.
 * Random scale and rotation give the cluster an organic feel that avoids the
 * repetition visible in grid-aligned instanced geometry.
 *
 * @param pieces    - ECS hedge positions (world-space x / y / z)
 * @param centerX   - World-space X of this maze's center
 * @param centerZ   - World-space Z of this maze's center
 * @param mazeSize  - Maze grid side length (number of cells)
 * @param rng       - Seeded RNG function (no Math.random)
 */
export function generateHedgeInstances(
  pieces: ReadonlyArray<{ x: number; y: number; z: number }>,
  centerX: number,
  centerZ: number,
  mazeSize: number,
  rng: () => number,
): HedgeInstance[] {
  const instances: HedgeInstance[] = [];

  for (const piece of pieces) {
    const zone = classifyHedgeZone(piece.x, piece.z, centerX, centerZ, mazeSize);
    const scale = SCALE_MIN + rng() * SCALE_RANGE;
    const scaleY = SCALE_Y_MIN + rng() * SCALE_Y_RANGE;
    const rotX = (rng() - 0.5) * 2 * TILT_MAX;
    const rotY = rng() * Math.PI * 2;
    const rotZ = (rng() - 0.5) * 2 * TILT_MAX;

    // Ground layer: use terrain Y from entity position.
    const terrainY = piece.y;
    instances.push({
      x: piece.x,
      z: piece.z,
      y: terrainY,
      zone,
      scale,
      rotX,
      rotY,
      rotZ,
      scaleY,
    });

    // Upper layer: one cell height above terrain.
    const scaleY2 = SCALE_Y_MIN + rng() * SCALE_Y_RANGE;
    const rotY2 = rng() * Math.PI * 2;
    instances.push({
      x: piece.x,
      z: piece.z,
      y: terrainY + CELL_SCALE,
      zone,
      scale: SCALE_MIN + rng() * SCALE_RANGE,
      rotX: (rng() - 0.5) * 2 * TILT_MAX,
      rotY: rotY2,
      rotZ: (rng() - 0.5) * 2 * TILT_MAX,
      scaleY: scaleY2,
    });
  }

  return instances;
}
