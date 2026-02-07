import type { GridCellComponent } from "../ecs/world";

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
}

export interface TileCoord {
  x: number;
  z: number;
}

/**
 * Build a walkability grid from the current ECS grid cells.
 * Water and rock tiles are blocked; soil and path are walkable.
 */
export function buildWalkabilityGrid(
  gridCells: Iterable<{ gridCell?: GridCellComponent }>,
  bounds: { minX: number; minZ: number; maxX: number; maxZ: number },
): WalkabilityGrid {
  const width = bounds.maxX - bounds.minX;
  const height = bounds.maxZ - bounds.minZ;
  const data = new Uint8Array(width * height);
  // Default all to blocked (1) — only known tiles become walkable
  data.fill(1);

  for (const entity of gridCells) {
    const gc = entity.gridCell;
    if (!gc) continue;
    const lx = gc.gridX - bounds.minX;
    const lz = gc.gridZ - bounds.minZ;
    if (lx < 0 || lx >= width || lz < 0 || lz >= height) continue;
    // Soil and path tiles are walkable
    if (gc.type === "soil" || gc.type === "path") {
      data[lz * width + lx] = 0;
    }
  }

  return { data, width, height, originX: bounds.minX, originZ: bounds.minZ };
}

// ---------------------------------------------------------------------------
// A* Pathfinding — 4-directional on the tile grid
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
 * Uses a simple array-based open set — grid is small enough (max ~48x48)
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

  // Goal is blocked — can't reach it
  if (data[gz * width + gx] !== 0) return null;

  // Same tile — trivial path
  if (sx === gx && sz === gz) return [{ x: goal.x, z: goal.z }];

  // Visited set — keyed by flat index
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

    // Reached goal — reconstruct path
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

      const ng = current.g + 1;
      const nf = ng + heuristic(nx, nz, gx, gz);
      open.push({ x: nx, z: nz, g: ng, f: nf, parentIdx: closedIdx });
    }
  }

  return null; // No path found
}
