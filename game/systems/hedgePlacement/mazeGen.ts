/** Maze generation via seeded recursive backtracker. Spec §17.5. */

import hedgeMazeConfig from "@/config/game/hedgeMaze.json" with { type: "json" };
import { createRNG } from "@/game/utils/seedRNG";
import type { MazeCell, MazeResult } from "./types.ts";

/** Generates a perfect maze using the recursive backtracker algorithm. */
export function generateMaze(seed: number, size?: number): MazeResult {
  const gridSize = size ?? hedgeMazeConfig.gridSize;
  const rng = createRNG(seed);

  const grid: MazeCell[][] = [];
  for (let x = 0; x < gridSize; x++) {
    grid[x] = [];
    for (let z = 0; z < gridSize; z++) {
      grid[x][z] = {
        x,
        z,
        walls: { north: true, south: true, east: true, west: true },
        visited: false,
        isCenter: false,
      };
    }
  }

  const centerX = Math.floor(gridSize / 2) - 1;
  const centerZ = Math.floor(gridSize / 2) - 1;
  for (let dx = 0; dx < 2; dx++) {
    for (let dz = 0; dz < 2; dz++) {
      grid[centerX + dx][centerZ + dz].isCenter = true;
    }
  }
  removeCenterWalls(grid, centerX, centerZ);

  const stack: MazeCell[] = [];
  const start = grid[0][0];
  start.visited = true;
  stack.push(start);

  while (stack.length > 0) {
    const current = stack[stack.length - 1];
    const neighbors = getUnvisitedNeighbors(grid, current, gridSize);
    if (neighbors.length === 0) {
      stack.pop();
      continue;
    }
    const index = Math.floor(rng() * neighbors.length);
    const next = neighbors[index];
    removeWallBetween(current, next);
    next.visited = true;
    stack.push(next);
  }

  return { grid, size: gridSize, centerX, centerZ };
}

function removeCenterWalls(grid: MazeCell[][], cx: number, cz: number): void {
  grid[cx][cz].walls.east = false;
  grid[cx + 1][cz].walls.west = false;
  grid[cx][cz].walls.south = false;
  grid[cx][cz + 1].walls.north = false;
  grid[cx + 1][cz].walls.south = false;
  grid[cx + 1][cz + 1].walls.north = false;
  grid[cx][cz + 1].walls.east = false;
  grid[cx + 1][cz + 1].walls.west = false;
}

function getUnvisitedNeighbors(grid: MazeCell[][], cell: MazeCell, size: number): MazeCell[] {
  const neighbors: MazeCell[] = [];
  const { x, z } = cell;
  if (z > 0 && !grid[x][z - 1].visited) neighbors.push(grid[x][z - 1]);
  if (z < size - 1 && !grid[x][z + 1].visited) neighbors.push(grid[x][z + 1]);
  if (x > 0 && !grid[x - 1][z].visited) neighbors.push(grid[x - 1][z]);
  if (x < size - 1 && !grid[x + 1][z].visited) neighbors.push(grid[x + 1][z]);
  return neighbors;
}

function removeWallBetween(a: MazeCell, b: MazeCell): void {
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  if (dx === 1) {
    a.walls.east = false;
    b.walls.west = false;
  } else if (dx === -1) {
    a.walls.west = false;
    b.walls.east = false;
  } else if (dz === 1) {
    a.walls.south = false;
    b.walls.north = false;
  } else if (dz === -1) {
    a.walls.north = false;
    b.walls.south = false;
  }
}
