/**
 * A* pathfinding on the tile grid.
 * Ported from BabylonJS archive -- no engine dependencies.
 */

// ---------------------------------------------------------------------------
// Walkability Grid
// ---------------------------------------------------------------------------

export interface WalkabilityGrid {
  /** 0 = walkable, 1 = blocked */
  data: Uint8Array;
  width: number;
  height: number;
  /** World-space origin of the grid (top-left corner). */
  originX: number;
  originZ: number;
  /** Optional terrain heightmap indexed the same as data. Used for slope blocking. */
  heightmap?: Float32Array;
  /** Maximum height difference per tile for slope blocking. Undefined = no slope check. */
  maxSlope?: number;
}

/** Input for one chunk when composing a multi-chunk walkability grid. */
export interface ChunkWalkabilityInput {
  /** Walkability cells with world-space x/z coordinates. */
  cells: WalkabilityCell[];
  /** Chunk grid coordinate (not world units). */
  chunkX: number;
  chunkZ: number;
  /** Tile count per chunk side. */
  chunkSize: number;
  /** Optional heightmap for this chunk, indexed by local coords [z * chunkSize + x]. */
  heightmap?: Float32Array;
}

export interface TileCoord {
  x: number;
  z: number;
}

/** Chunk-based walkability input — caller maps chunk/terrain entities to this. */
export interface WalkabilityCell {
  x: number;
  z: number;
  walkable: boolean;
}

/**
 * Build a walkability grid from chunk-based walkability cells.
 * Cells marked walkable=false (water, rock) are blocked; walkable=true (soil, path) are open.
 */
export function buildWalkabilityGrid(
  cells: Iterable<WalkabilityCell>,
  bounds: { minX: number; minZ: number; maxX: number; maxZ: number },
): WalkabilityGrid {
  const width = bounds.maxX - bounds.minX;
  const height = bounds.maxZ - bounds.minZ;
  const data = new Uint8Array(width * height);
  // Default all to blocked (1) -- only known tiles become walkable
  data.fill(1);

  for (const cell of cells) {
    const lx = cell.x - bounds.minX;
    const lz = cell.z - bounds.minZ;
    if (lx < 0 || lx >= width || lz < 0 || lz >= height) continue;
    if (cell.walkable) {
      data[lz * width + lx] = 0;
    }
  }

  return { data, width, height, originX: bounds.minX, originZ: bounds.minZ };
}

/**
 * Build a walkability grid spanning multiple chunks.
 *
 * Calculates world-space bounds from all chunk inputs and merges their
 * walkability cells and optional heightmaps into a single grid. Cells
 * outside their chunk's bounds are silently ignored.
 *
 * This supports cross-chunk pathfinding: pass the active chunk plus its
 * 4 or 8 neighbors to let NPCs plan paths that cross chunk boundaries.
 *
 * Water bodies and structures should be included as walkable=false cells
 * so the A* planner avoids them.
 */
export function buildMultiChunkWalkabilityGrid(
  chunks: ChunkWalkabilityInput[],
  maxSlope?: number,
): WalkabilityGrid {
  if (chunks.length === 0) {
    return { data: new Uint8Array(0), width: 0, height: 0, originX: 0, originZ: 0 };
  }

  // Derive world-space bounds from all chunks
  let minX = Infinity;
  let minZ = Infinity;
  let maxX = -Infinity;
  let maxZ = -Infinity;

  for (const chunk of chunks) {
    const wx = chunk.chunkX * chunk.chunkSize;
    const wz = chunk.chunkZ * chunk.chunkSize;
    if (wx < minX) minX = wx;
    if (wz < minZ) minZ = wz;
    const ex = wx + chunk.chunkSize;
    const ez = wz + chunk.chunkSize;
    if (ex > maxX) maxX = ex;
    if (ez > maxZ) maxZ = ez;
  }

  const width = maxX - minX;
  const height = maxZ - minZ;
  const data = new Uint8Array(width * height);
  data.fill(1); // default all blocked

  const hasHeightmap = chunks.some((c) => c.heightmap != null);
  const heightmap = hasHeightmap ? new Float32Array(width * height) : undefined;

  for (const chunk of chunks) {
    const wx = chunk.chunkX * chunk.chunkSize;
    const wz = chunk.chunkZ * chunk.chunkSize;

    for (const cell of chunk.cells) {
      const lx = cell.x - minX;
      const lz = cell.z - minZ;
      if (lx < 0 || lx >= width || lz < 0 || lz >= height) continue;
      if (cell.walkable) {
        data[lz * width + lx] = 0;
      }
    }

    if (chunk.heightmap && heightmap) {
      for (let cz = 0; cz < chunk.chunkSize; cz++) {
        for (let cx = 0; cx < chunk.chunkSize; cx++) {
          const dstX = wx + cx - minX;
          const dstZ = wz + cz - minZ;
          if (dstX >= 0 && dstX < width && dstZ >= 0 && dstZ < height) {
            heightmap[dstZ * width + dstX] = chunk.heightmap[cz * chunk.chunkSize + cx];
          }
        }
      }
    }
  }

  return { data, width, height, originX: minX, originZ: minZ, heightmap, maxSlope };
}

// ---------------------------------------------------------------------------
// A* Pathfinding -- 4-directional on the tile grid
// ---------------------------------------------------------------------------

interface AStarNode {
  x: number;
  z: number;
  g: number;
  f: number;
  parentIdx: number; // index into closed set, -1 for start
}

function heuristic(ax: number, az: number, bx: number, bz: number): number {
  return Math.abs(ax - bx) + Math.abs(az - bz); // Manhattan
}

const DIRS = [
  { dx: 1, dz: 0 },
  { dx: -1, dz: 0 },
  { dx: 0, dz: 1 },
  { dx: 0, dz: -1 },
];

/**
 * Find a path from `start` to `goal` on the walkability grid.
 * Returns an array of world-space tile coordinates (integer grid positions),
 * or null if no path exists.
 *
 * Uses a simple array-based open set -- grid is small enough (max ~48x48)
 * that a binary heap is unnecessary.
 */
export function findPath(
  grid: WalkabilityGrid,
  start: TileCoord,
  goal: TileCoord,
): TileCoord[] | null {
  const { data, width, height, originX, originZ } = grid;

  // Convert to local grid coords
  const sx = start.x - originX;
  const sz = start.z - originZ;
  const gx = goal.x - originX;
  const gz = goal.z - originZ;

  // Bounds check
  if (sx < 0 || sx >= width || sz < 0 || sz >= height) return null;
  if (gx < 0 || gx >= width || gz < 0 || gz >= height) return null;

  // Start or goal is blocked -- can't pathfind
  if (data[sz * width + sx] !== 0) return null;
  if (data[gz * width + gx] !== 0) return null;

  // Same tile -- trivial path
  if (sx === gx && sz === gz) return [{ x: goal.x, z: goal.z }];

  // Visited set -- keyed by flat index
  const visited = new Uint8Array(width * height);

  const open: AStarNode[] = [];
  const closed: AStarNode[] = [];

  const h0 = heuristic(sx, sz, gx, gz);
  open.push({ x: sx, z: sz, g: 0, f: h0, parentIdx: -1 });

  while (open.length > 0) {
    // Find lowest f in open set
    let bestIdx = 0;
    for (let i = 1; i < open.length; i++) {
      if (open[i].f < open[bestIdx].f) bestIdx = i;
    }
    const current = open[bestIdx];
    open[bestIdx] = open[open.length - 1];
    open.pop();

    // Already visited (can happen with duplicate entries)
    const flatIdx = current.z * width + current.x;
    if (visited[flatIdx]) continue;
    visited[flatIdx] = 1;

    const closedIdx = closed.length;
    closed.push(current);

    // Reached goal -- reconstruct path
    if (current.x === gx && current.z === gz) {
      const path: TileCoord[] = [];
      let node: AStarNode | undefined = current;
      while (node) {
        path.push({ x: node.x + originX, z: node.z + originZ });
        node = node.parentIdx >= 0 ? closed[node.parentIdx] : undefined;
      }
      path.reverse();
      return path;
    }

    // Expand neighbors
    for (const { dx, dz } of DIRS) {
      const nx = current.x + dx;
      const nz = current.z + dz;
      if (nx < 0 || nx >= width || nz < 0 || nz >= height) continue;
      const nFlat = nz * width + nx;
      if (visited[nFlat]) continue;
      if (data[nFlat] !== 0) continue; // blocked

      // Slope blocking: skip neighbor if height rise exceeds maxSlope
      if (grid.heightmap != null && grid.maxSlope !== undefined) {
        const currH = grid.heightmap[current.z * width + current.x];
        const nextH = grid.heightmap[nFlat];
        if (Math.abs(nextH - currH) > grid.maxSlope) continue;
      }

      const ng = current.g + 1;
      const nf = ng + heuristic(nx, nz, gx, gz);
      open.push({ x: nx, z: nz, g: ng, f: nf, parentIdx: closedIdx });
    }
  }

  return null; // No path found
}
