/**
 * pathGenerator -- Generates trail splines between villages and landmarks.
 *
 * Spec §31.1: Spline-carved trails between landmarks (PathSegmentComponent).
 *
 * Algorithm:
 *   1. Determine if this chunk contains a landmark (seeded stochastic).
 *   2. If yes, check 4 neighboring chunks for landmarks.
 *   3. For each neighbor with a landmark, generate a trail spline from this
 *      chunk's landmark position toward the shared boundary.
 *   4. Carve the spline into the heightmap (flatten terrain along the path).
 *   5. Return PathSegmentComponent placements.
 *
 * Pure function — same worldSeed + chunkX + chunkZ + heightmap always
 * produces identical path data. All randomness via scopedRNG.
 */

import type {
  PathSegmentComponent,
  SignpostComponent,
  SignpostDirection,
} from "@/game/ecs/components/procedural/terrain";
import { scopedRNG } from "@/game/utils/seedWords";
import gridConfig from "@/config/game/grid.json" with { type: "json" };
import proceduralConfig from "@/config/game/procedural.json" with { type: "json" };

const CHUNK_SIZE: number = gridConfig.chunkSize;

// ── Constants ────────────────────────────────────────────────────────────────

/** Probability [0,1] that any non-origin chunk hosts a landmark. */
export const LANDMARK_PROBABILITY = 0.15;

/** Number of spline samples per world unit for heightmap carving. */
const CARVE_SAMPLES_PER_UNIT = 4;

// ── Types ────────────────────────────────────────────────────────────────────

/** Landmark types that anchor trail connections. */
export type LandmarkType = "village" | "shrine" | "ancient-tree" | "campfire";

/** A path segment placement ready to be added to ECS. */
export interface PathSegmentPlacement {
  /** World-space anchor position for the ECS entity. */
  position: { x: number; y: number; z: number };
  /** Full PathSegmentComponent data. */
  pathSegment: PathSegmentComponent;
}

/** A signpost placement ready to be added to ECS. */
export interface SignpostPlacement {
  /** World-space position of the signpost (at the landmark center). */
  position: { x: number; y: number; z: number };
  /** Full SignpostComponent data. */
  signpost: SignpostComponent;
}

// ── Cardinal direction lookup ─────────────────────────────────────────────────

const CARDINAL_DIRS: ReadonlyArray<{
  dx: number;
  dz: number;
  dir: SignpostDirection;
}> = [
  { dx: 0, dz: -1, dir: "N" },
  { dx: 1, dz: 0, dir: "E" },
  { dx: 0, dz: 1, dir: "S" },
  { dx: -1, dz: 0, dir: "W" },
];

// ── Landmark detection ───────────────────────────────────────────────────────

/**
 * Returns true if (chunkX, chunkZ) hosts a landmark.
 *
 * Rules:
 *   - Chunk (0, 0) is always a landmark (tutorial village).
 *   - Any other chunk is a landmark if its seeded roll < LANDMARK_PROBABILITY.
 *
 * Pure function — deterministic from worldSeed + chunk coords.
 */
export function isLandmarkChunk(
  worldSeed: string,
  chunkX: number,
  chunkZ: number,
): boolean {
  if (chunkX === 0 && chunkZ === 0) return true;
  const rng = scopedRNG("landmark-roll", worldSeed, chunkX, chunkZ);
  return rng() < LANDMARK_PROBABILITY;
}

/**
 * Return the landmark's local position within the chunk (local chunk coords).
 *
 * - Origin (0,0): always the chunk center (CHUNK_SIZE/2, CHUNK_SIZE/2).
 * - Other landmark chunks: seeded position within an inner margin zone.
 */
export function getLandmarkLocalPos(
  worldSeed: string,
  chunkX: number,
  chunkZ: number,
): { localX: number; localZ: number } {
  if (chunkX === 0 && chunkZ === 0) {
    return { localX: CHUNK_SIZE / 2, localZ: CHUNK_SIZE / 2 };
  }
  const rng = scopedRNG("landmark-pos", worldSeed, chunkX, chunkZ);
  const margin = 4;
  const range = CHUNK_SIZE - margin * 2;
  return {
    localX: margin + rng() * range,
    localZ: margin + rng() * range,
  };
}

/**
 * Return the landmark type for a chunk.
 * Village only at origin; others cycle through shrine / ancient-tree / campfire.
 */
export function getLandmarkType(
  worldSeed: string,
  chunkX: number,
  chunkZ: number,
): LandmarkType {
  if (chunkX === 0 && chunkZ === 0) return "village";
  const rng = scopedRNG("landmark-type", worldSeed, chunkX, chunkZ);
  const types: LandmarkType[] = ["shrine", "ancient-tree", "campfire"];
  return types[Math.floor(rng() * types.length)];
}

// ── Spline math ──────────────────────────────────────────────────────────────

/**
 * Evaluate a quadratic Bézier spline at parameter t ∈ [0, 1].
 * P0 = start, P1 = control, P2 = end.
 */
export function bezierPoint(
  p0: { x: number; z: number },
  p1: { x: number; z: number },
  p2: { x: number; z: number },
  t: number,
): { x: number; z: number } {
  const u = 1 - t;
  return {
    x: u * u * p0.x + 2 * u * t * p1.x + t * t * p2.x,
    z: u * u * p0.z + 2 * u * t * p1.z + t * t * p2.z,
  };
}

// ── Heightmap carving ────────────────────────────────────────────────────────

/**
 * Carve a quadratic Bézier path into a heightmap in-place.
 *
 * For each vertex within `radius` units of the spline, the height is lowered
 * by `carveDepth * blendFactor` where blendFactor uses a cosine falloff:
 *   blendFactor = cos(π/2 * dist/radius)  →  1 at center, 0 at edge.
 *
 * The spline is sampled at CARVE_SAMPLES_PER_UNIT per world unit so the
 * carved shape is smooth even for curved paths.
 *
 * @param heightmap  CHUNK_SIZE×CHUNK_SIZE Float32Array mutated in-place.
 * @param p0         Bézier start (local chunk coords).
 * @param p1         Bézier control point (local chunk coords).
 * @param p2         Bézier end (local chunk coords).
 * @param radius     Half-width of the carve zone in world units.
 * @param carveDepth Maximum height reduction at path center.
 * @param chunkSize  Grid width/depth.
 */
export function carveSplineIntoHeightmap(
  heightmap: Float32Array,
  p0: { x: number; z: number },
  p1: { x: number; z: number },
  p2: { x: number; z: number },
  radius: number,
  carveDepth: number,
  chunkSize: number,
): void {
  // Sample the spline densely — approximate arc length from endpoints.
  const dx = p2.x - p0.x;
  const dz = p2.z - p0.z;
  const approxLength = Math.sqrt(dx * dx + dz * dz);
  const numSamples = Math.max(16, Math.ceil(approxLength * CARVE_SAMPLES_PER_UNIT));

  const samples: Array<{ x: number; z: number }> = [];
  for (let i = 0; i <= numSamples; i++) {
    samples.push(bezierPoint(p0, p1, p2, i / numSamples));
  }

  const radiusSq = radius * radius;

  for (let iz = 0; iz < chunkSize; iz++) {
    for (let ix = 0; ix < chunkSize; ix++) {
      // Find minimum squared distance from this vertex to any spline sample.
      let minDistSq = Infinity;
      for (const s of samples) {
        const ddx = ix - s.x;
        const ddz = iz - s.z;
        const dsq = ddx * ddx + ddz * ddz;
        if (dsq < minDistSq) minDistSq = dsq;
      }
      if (minDistSq >= radiusSq) continue;

      // Cosine falloff: 1 at center (dist=0), 0 at edge (dist=radius).
      const dist = Math.sqrt(minDistSq);
      const blendFactor = Math.cos((Math.PI / 2) * (dist / radius));
      heightmap[iz * chunkSize + ix] -= carveDepth * blendFactor;
    }
  }
}

// ── Main export ──────────────────────────────────────────────────────────────

/**
 * Generate trail path segments for a chunk, carving them into the heightmap.
 *
 * Only generates paths if this chunk contains a landmark AND at least one
 * neighboring chunk also contains a landmark. For each qualifying neighbor a
 * spline runs from this chunk's landmark position to the shared boundary,
 * with a seeded perpendicular offset for natural curvature.
 *
 * The heightmap is mutated in-place so the carved terrain is baked into
 * the TerrainChunkComponent before the ECS entity is created.
 *
 * Spec §31.1: spline-carved trails between landmarks (PathSegmentComponent).
 *
 * @param worldSeed  World seed string.
 * @param chunkX     Chunk X grid coordinate.
 * @param chunkZ     Chunk Z grid coordinate.
 * @param heightmap  CHUNK_SIZE×CHUNK_SIZE Float32Array — mutated in-place.
 * @returns          Array of PathSegmentPlacement objects (may be empty).
 */
export function generatePathsForChunk(
  worldSeed: string,
  chunkX: number,
  chunkZ: number,
  heightmap: Float32Array,
): PathSegmentPlacement[] {
  if (!isLandmarkChunk(worldSeed, chunkX, chunkZ)) return [];

  const { localX, localZ } = getLandmarkLocalPos(worldSeed, chunkX, chunkZ);
  const landmarkType = getLandmarkType(worldSeed, chunkX, chunkZ);
  const pathType = landmarkType === "village" ? "road" : "trail";

  const pathConfig = (
    proceduralConfig.terrain.pathTypes as Record<string, { width: number; color: string }>
  )[pathType];
  const width = pathConfig.width;
  const carveDepth: number = proceduralConfig.terrain.pathCarveDepth;
  // Carve slightly wider than the nominal width for smooth visual edges.
  const radius = width / 2 + 0.5;

  // For each of the 4 cardinal neighbors, determine the boundary exit point.
  // The exit point is on the chunk edge closest to the neighbor.
  const neighborDirs: Array<{
    dx: number;
    dz: number;
    exitX: number;
    exitZ: number;
  }> = [
    { dx: 0, dz: -1, exitX: localX, exitZ: 0 },                 // N
    { dx: 1, dz: 0,  exitX: CHUNK_SIZE - 1, exitZ: localZ },    // E
    { dx: 0, dz: 1,  exitX: localX, exitZ: CHUNK_SIZE - 1 },    // S
    { dx: -1, dz: 0, exitX: 0, exitZ: localZ },                  // W
  ];

  const rng = scopedRNG("path-curve", worldSeed, chunkX, chunkZ);
  const placements: PathSegmentPlacement[] = [];

  for (const { dx, dz, exitX, exitZ } of neighborDirs) {
    if (!isLandmarkChunk(worldSeed, chunkX + dx, chunkZ + dz)) continue;

    const p0 = { x: localX, z: localZ };
    const p2 = { x: exitX, z: exitZ };

    // Control point: midpoint with a seeded perpendicular offset for curvature.
    const midX = (p0.x + p2.x) * 0.5;
    const midZ = (p0.z + p2.z) * 0.5;
    const pathDx = p2.x - p0.x;
    const pathDz = p2.z - p0.z;
    const pathLen = Math.sqrt(pathDx * pathDx + pathDz * pathDz);
    // Perpendicular direction (rotated 90°).
    const perpX = pathLen > 1e-6 ? -pathDz / pathLen : 1;
    const perpZ = pathLen > 1e-6 ? pathDx / pathLen : 0;
    const offset = (rng() - 0.5) * 4; // max ±2 tiles perpendicular deviation
    const p1 = { x: midX + perpX * offset, z: midZ + perpZ * offset };

    // Carve this path segment into the heightmap.
    carveSplineIntoHeightmap(heightmap, p0, p1, p2, radius, carveDepth, CHUNK_SIZE);

    // Build PathSegmentComponent (control points in local chunk coords).
    const hix = Math.min(Math.floor(localX), CHUNK_SIZE - 1);
    const hiz = Math.min(Math.floor(localZ), CHUNK_SIZE - 1);
    const worldY = heightmap[hiz * CHUNK_SIZE + hix];

    placements.push({
      position: {
        x: chunkX * CHUNK_SIZE + localX,
        y: worldY,
        z: chunkZ * CHUNK_SIZE + localZ,
      },
      pathSegment: {
        pathType,
        controlPoints: [p0, p1, p2],
        width,
      },
    });
  }

  return placements;
}

// ── Signpost generation ───────────────────────────────────────────────────────

/**
 * Generate a signpost placement for a landmark chunk that is a path
 * intersection (2+ connected landmark neighbors).
 *
 * The signpost faces toward the nearest major landmark: a village neighbor is
 * preferred; if none, the first connected cardinal neighbor is used.
 *
 * Returns null when:
 *   - This chunk is not a landmark.
 *   - Fewer than 2 neighbors are landmarks (no intersection to mark).
 *
 * Spec §17.6: Signposts at minor features point toward nearest major feature.
 *
 * @param worldSeed  World seed string.
 * @param chunkX     Chunk X grid coordinate.
 * @param chunkZ     Chunk Z grid coordinate.
 * @param heightmap  CHUNK_SIZE×CHUNK_SIZE Float32Array for Y sampling.
 * @returns          SignpostPlacement or null.
 */
export function generateSignpostForChunk(
  worldSeed: string,
  chunkX: number,
  chunkZ: number,
  heightmap: Float32Array,
): SignpostPlacement | null {
  if (!isLandmarkChunk(worldSeed, chunkX, chunkZ)) return null;

  // Find all cardinal neighbors that are also landmarks.
  const connected = CARDINAL_DIRS.filter(({ dx, dz }) =>
    isLandmarkChunk(worldSeed, chunkX + dx, chunkZ + dz),
  );

  // A signpost only makes sense at an intersection (2+ paths).
  if (connected.length < 2) return null;

  // Prefer pointing toward a village neighbor (major feature); fall back to first.
  const target =
    connected.find(
      ({ dx, dz }) => getLandmarkType(worldSeed, chunkX + dx, chunkZ + dz) === "village",
    ) ?? connected[0];

  const targetChunkX = chunkX + target.dx;
  const targetChunkZ = chunkZ + target.dz;
  const targetLocalPos = getLandmarkLocalPos(worldSeed, targetChunkX, targetChunkZ);
  const targetWorldX = targetChunkX * CHUNK_SIZE + targetLocalPos.localX;
  const targetWorldZ = targetChunkZ * CHUNK_SIZE + targetLocalPos.localZ;
  const targetLandmarkType = getLandmarkType(worldSeed, targetChunkX, targetChunkZ);

  // Signpost sits at this chunk's landmark position.
  const { localX, localZ } = getLandmarkLocalPos(worldSeed, chunkX, chunkZ);
  const hix = Math.min(Math.floor(localX), CHUNK_SIZE - 1);
  const hiz = Math.min(Math.floor(localZ), CHUNK_SIZE - 1);
  const worldY = heightmap[hiz * CHUNK_SIZE + hix];

  return {
    position: {
      x: chunkX * CHUNK_SIZE + localX,
      y: worldY,
      z: chunkZ * CHUNK_SIZE + localZ,
    },
    signpost: {
      facingDirection: target.dir,
      targetLandmarkType,
      targetWorldX,
      targetWorldZ,
    },
  };
}
