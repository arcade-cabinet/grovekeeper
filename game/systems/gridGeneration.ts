/**
 * Seeded Grid Generation System
 *
 * Generates a deterministic grid of tiles from a string seed.
 * Distribution targets: 70% empty (soil), 15% blocked (rocks),
 * 10% water (clustered ponds), 5% path.
 */

import { createRNG, hashString } from "@/game/utils/seedRNG";

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

function getNeighbours(col: number, row: number, size: number): Array<[number, number]> {
  const out: Array<[number, number]> = [];
  if (col > 0) out.push([col - 1, row]);
  if (col < size - 1) out.push([col + 1, row]);
  if (row > 0) out.push([col, row - 1]);
  if (row < size - 1) out.push([col, row + 1]);
  return out;
}

function growPond(
  grid: TileType[][],
  startCol: number,
  startRow: number,
  targetSize: number,
  size: number,
  rng: () => number,
): Array<[number, number]> {
  const placed: Array<[number, number]> = [];

  if (grid[startRow][startCol] !== "empty") {
    return placed;
  }

  grid[startRow][startCol] = "water";
  placed.push([startCol, startRow]);

  const frontier = getNeighbours(startCol, startRow, size).filter(
    ([c, r]) => grid[r][c] === "empty",
  );

  while (placed.length < targetSize && frontier.length > 0) {
    const idx = Math.floor(rng() * frontier.length);
    const [fc, fr] = frontier[idx];
    frontier.splice(idx, 1);

    if (grid[fr][fc] !== "empty") continue;

    grid[fr][fc] = "water";
    placed.push([fc, fr]);

    for (const [nc, nr] of getNeighbours(fc, fr, size)) {
      if (grid[nr][nc] === "empty" && !frontier.some(([fc2, fr2]) => fc2 === nc && fr2 === nr)) {
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
 * @param size  - Grid dimension (size x size).
 * @param groveSeed - A string seed that uniquely identifies this grove.
 * @returns Flat array of GridTile (length = size * size), row-major order.
 */
export function generateGrid(size: number, groveSeed: string): GridTile[] {
  const seed = hashString(groveSeed);
  const rng = createRNG(seed);

  const total = size * size;

  const waterCount = Math.max(1, Math.round(total * 0.1));
  const blockedCount = Math.round(total * 0.15);
  const pathCount = Math.round(total * 0.05);

  const grid: TileType[][] = [];
  for (let r = 0; r < size; r++) {
    grid.push(new Array(size).fill("empty") as TileType[]);
  }

  // Place water ponds (clustered)
  const pondCount = Math.min(1 + Math.floor(rng() * 3), 3);
  let waterRemaining = waterCount;

  for (let p = 0; p < pondCount; p++) {
    const isLast = p === pondCount - 1;
    const minPondSize = 2;
    const pondSize = isLast
      ? waterRemaining
      : Math.max(minPondSize, Math.round(waterRemaining * (0.3 + rng() * 0.4)));

    let centerCol: number;
    let centerRow: number;
    let attempts = 0;
    do {
      centerCol = 1 + Math.floor(rng() * (size - 2));
      centerRow = 1 + Math.floor(rng() * (size - 2));
      attempts++;
    } while (grid[centerRow][centerCol] !== "empty" && attempts < 50);

    if (grid[centerRow][centerCol] === "empty") {
      growPond(grid, centerCol, centerRow, pondSize, size, rng);
    }

    waterRemaining -= pondSize;
    if (waterRemaining <= 0) break;
  }

  // Place blocked (rocks) randomly on empty cells
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

  // Place path tiles randomly on empty cells
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

  // Flatten to GridTile array (row-major)
  const tiles: GridTile[] = [];
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      tiles.push({ col: c, row: r, type: grid[r][c] });
    }
  }

  return tiles;
}
