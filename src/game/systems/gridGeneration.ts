/**
 * Seeded Grid Generation System
 *
 * Generates a deterministic grid of tiles from a string seed.
 * Distribution targets: 70% empty (soil), 15% blocked (rocks),
 * 10% water (clustered ponds), 5% path.
 *
 * Water tiles are placed as clustered ponds (1-3 per grid) using
 * a flood-fill growth approach so they always form connected groups.
 */

import { createRNG, hashString } from "../utils/seedRNG";

// ============================================
// Public Types
// ============================================

export type TileType = "empty" | "blocked" | "water" | "path";

export interface GridTile {
  col: number;
  row: number;
  type: TileType;
}

// ============================================
// Internal helpers
// ============================================

interface PondConfig {
  centerCol: number;
  centerRow: number;
  targetSize: number;
}

/**
 * Get the 4-connected (cardinal) neighbours of a cell within bounds.
 */
function getNeighbours(
  col: number,
  row: number,
  size: number,
): Array<[number, number]> {
  const out: Array<[number, number]> = [];
  if (col > 0) out.push([col - 1, row]);
  if (col < size - 1) out.push([col + 1, row]);
  if (row > 0) out.push([col, row - 1]);
  if (row < size - 1) out.push([col, row + 1]);
  return out;
}

/**
 * Grow a pond from a starting cell using BFS-like expansion.
 * Only expands into cells that are currently "empty" in the mutable grid.
 * Returns the set of coordinates that became water.
 */
function growPond(
  grid: TileType[][],
  startCol: number,
  startRow: number,
  targetSize: number,
  size: number,
  rng: () => number,
): Array<[number, number]> {
  const placed: Array<[number, number]> = [];

  // If the start cell is not empty, find the nearest empty cell
  if (grid[startRow][startCol] !== "empty") {
    return placed;
  }

  grid[startRow][startCol] = "water";
  placed.push([startCol, startRow]);

  // Frontier: cells adjacent to already-placed water that could expand
  const frontier = getNeighbours(startCol, startRow, size).filter(
    ([c, r]) => grid[r][c] === "empty",
  );

  while (placed.length < targetSize && frontier.length > 0) {
    // Pick a random frontier cell
    const idx = Math.floor(rng() * frontier.length);
    const [fc, fr] = frontier[idx];

    // Remove from frontier
    frontier.splice(idx, 1);

    if (grid[fr][fc] !== "empty") continue;

    grid[fr][fc] = "water";
    placed.push([fc, fr]);

    // Add new neighbours of the just-placed cell to frontier
    for (const [nc, nr] of getNeighbours(fc, fr, size)) {
      if (
        grid[nr][nc] === "empty" &&
        !frontier.some(([fc2, fr2]) => fc2 === nc && fr2 === nr)
      ) {
        frontier.push([nc, nr]);
      }
    }
  }

  return placed;
}

// ============================================
// Main export
// ============================================

/**
 * Generate a deterministic grid of tiles.
 *
 * @param size  - Grid dimension (size x size). Supported: 8, 12, 16, 20, 24, 32.
 * @param groveSeed - A string seed that uniquely identifies this grove.
 * @returns Flat array of GridTile (length = size * size), row-major order.
 */
export function generateGrid(size: number, groveSeed: string): GridTile[] {
  const seed = hashString(groveSeed);
  const rng = createRNG(seed);

  const total = size * size;

  // --- Step 1: Determine tile budget ---
  // Targets: 70% empty, 15% blocked, 10% water, 5% path
  const waterCount = Math.max(1, Math.round(total * 0.1));
  const blockedCount = Math.round(total * 0.15);
  const pathCount = Math.round(total * 0.05);
  // empty fills the rest

  // --- Step 2: Initialize grid as all empty ---
  const grid: TileType[][] = [];
  for (let r = 0; r < size; r++) {
    grid.push(new Array(size).fill("empty") as TileType[]);
  }

  // --- Step 3: Place water ponds (clustered) ---
  // Determine number of ponds (1-3), distribute waterCount among them
  const pondCount = Math.min(1 + Math.floor(rng() * 3), 3);
  const ponds: PondConfig[] = [];

  let waterRemaining = waterCount;
  for (let p = 0; p < pondCount; p++) {
    const isLast = p === pondCount - 1;
    const minPondSize = 2;
    const pondSize = isLast
      ? waterRemaining
      : Math.max(
          minPondSize,
          Math.round(
            waterRemaining * (0.3 + rng() * 0.4), // 30-70% of remaining
          ),
        );

    // Pick a center avoiding edges (1 cell margin) and existing ponds
    let centerCol: number;
    let centerRow: number;
    let attempts = 0;
    do {
      centerCol = 1 + Math.floor(rng() * (size - 2));
      centerRow = 1 + Math.floor(rng() * (size - 2));
      attempts++;
    } while (grid[centerRow][centerCol] !== "empty" && attempts < 50);

    if (grid[centerRow][centerCol] === "empty") {
      ponds.push({ centerCol, centerRow, targetSize: pondSize });
      growPond(grid, centerCol, centerRow, pondSize, size, rng);
    }

    waterRemaining -= pondSize;
    if (waterRemaining <= 0) break;
  }

  // --- Step 4: Place blocked (rocks) randomly on empty cells ---
  let blockedPlaced = 0;
  let safetyCounter = 0;
  const maxAttempts = total * 4;

  while (blockedPlaced < blockedCount && safetyCounter < maxAttempts) {
    const col = Math.floor(rng() * size);
    const row = Math.floor(rng() * size);
    if (grid[row][col] === "empty") {
      grid[row][col] = "blocked";
      blockedPlaced++;
    }
    safetyCounter++;
  }

  // --- Step 5: Place path tiles randomly on empty cells ---
  let pathPlaced = 0;
  safetyCounter = 0;

  while (pathPlaced < pathCount && safetyCounter < maxAttempts) {
    const col = Math.floor(rng() * size);
    const row = Math.floor(rng() * size);
    if (grid[row][col] === "empty") {
      grid[row][col] = "path";
      pathPlaced++;
    }
    safetyCounter++;
  }

  // --- Step 6: Flatten to GridTile array (row-major) ---
  const tiles: GridTile[] = [];
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      tiles.push({ col: c, row: r, type: grid[r][c] });
    }
  }

  return tiles;
}
