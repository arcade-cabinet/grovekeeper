/** Hedge maze: seeded recursive backtracker using 3DPSX modular hedge pieces. */
import { createRNG } from "@/game/utils/seedRNG";
import hedgeMazeConfig from "@/config/game/hedgeMaze.json";

export interface MazeCell {
  x: number;
  z: number;
  walls: { north: boolean; south: boolean; east: boolean; west: boolean };
  visited: boolean;
  isCenter: boolean;
}

export interface MazeResult {
  grid: MazeCell[][];
  size: number;
  centerX: number;
  centerZ: number;
}

/** Generates a maze using recursive backtracker with seeded RNG. */
export function generateMaze(seed: number, size?: number): MazeResult {
  const gridSize = size ?? hedgeMazeConfig.gridSize;
  const rng = createRNG(seed);

  const grid: MazeCell[][] = [];
  for (let x = 0; x < gridSize; x++) {
    grid[x] = [];
    for (let z = 0; z < gridSize; z++) {
      grid[x][z] = {
        x, z,
        walls: { north: true, south: true, east: true, west: true },
        visited: false, isCenter: false,
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

    // Pick random unvisited neighbor
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

function getUnvisitedNeighbors(
  grid: MazeCell[][],
  cell: MazeCell,
  size: number,
): MazeCell[] {
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

export interface HedgePiece {
  modelPath: string;
  rotation: number;
  x: number;
  z: number;
}

/** Converts maze walls into hedge piece placements, seeded for size variation. */
export function mazeToHedgePieces(maze: MazeResult, seed: number): HedgePiece[] {
  const rng = createRNG(seed);
  const pieces: HedgePiece[] = [];
  const sizeOptions = hedgeMazeConfig.pieceWeights.basic;
  const cellScale = hedgeMazeConfig.cellScale;

  for (let x = 0; x < maze.size; x++) {
    for (let z = 0; z < maze.size; z++) {
      const cell = maze.grid[x][z];

      if (cell.walls.north) {
        const sizeIdx = Math.floor(rng() * sizeOptions.length);
        const size = sizeOptions[sizeIdx];
        pieces.push({
          modelPath: `hedges/basic/basic_${size}.glb`,
          rotation: 0,
          x: x * cellScale,
          z: z * cellScale,
        });
      }
      if (cell.walls.west) {
        const sizeIdx = Math.floor(rng() * sizeOptions.length);
        const size = sizeOptions[sizeIdx];
        pieces.push({
          modelPath: `hedges/basic/basic_${size}.glb`,
          rotation: 90,
          x: x * cellScale,
          z: z * cellScale,
        });
      }
    }
  }

  // Add boundary walls on south and east edges
  for (let x = 0; x < maze.size; x++) {
    const cell = maze.grid[x][maze.size - 1];
    if (cell.walls.south) {
      const sizeIdx = Math.floor(rng() * sizeOptions.length);
      const size = sizeOptions[sizeIdx];
      pieces.push({
        modelPath: `hedges/basic/basic_${size}.glb`,
        rotation: 0,
        x: x * cellScale,
        z: maze.size * cellScale,
      });
    }
  }
  for (let z = 0; z < maze.size; z++) {
    const cell = maze.grid[maze.size - 1][z];
    if (cell.walls.east) {
      const sizeIdx = Math.floor(rng() * sizeOptions.length);
      const size = sizeOptions[sizeIdx];
      pieces.push({
        modelPath: `hedges/basic/basic_${size}.glb`,
        rotation: 90,
        x: maze.size * cellScale,
        z: z * cellScale,
      });
    }
  }

  return pieces;
}

export interface MazeDecoration {
  modelPath: string;
  x: number;
  z: number;
  rotation: number;
  category: "flowers" | "stone" | "fences" | "structure";
}

/** Places decorations at dead ends, intersections, and center reward area. */
export function placeMazeDecorations(
  maze: MazeResult,
  seed: number,
): MazeDecoration[] {
  const rng = createRNG(seed);
  const decorations: MazeDecoration[] = [];
  const cellScale = hedgeMazeConfig.cellScale;

  const cx = (maze.centerX + 0.5) * cellScale;
  const cz = (maze.centerZ + 0.5) * cellScale;
  decorations.push({
    modelPath: "hedges/misc/stone/fountain01_round_water.glb",
    x: cx,
    z: cz,
    rotation: 0,
    category: "stone",
  });
  decorations.push({
    modelPath: "hedges/misc/stone/bench01.glb",
    x: cx - 1.5,
    z: cz,
    rotation: 90,
    category: "stone",
  });
  decorations.push({
    modelPath: "hedges/misc/stone/bench02.glb",
    x: cx + 1.5,
    z: cz,
    rotation: 270,
    category: "stone",
  });

  for (let x = 0; x < maze.size; x++) {
    for (let z = 0; z < maze.size; z++) {
      const cell = maze.grid[x][z];
      if (cell.isCenter) continue;

      const wallCount = [
        cell.walls.north,
        cell.walls.south,
        cell.walls.east,
        cell.walls.west,
      ].filter(Boolean).length;

      if (wallCount === 3 && rng() < hedgeMazeConfig.dressing.deadEndProbability) {
        const isFlower = rng() < hedgeMazeConfig.dressing.flowerVsVaseProbability;
        if (isFlower) {
          const flowerIdx = Math.floor(rng() * 7) + 1;
          decorations.push({
            modelPath: `hedges/misc/flowers/flowerbed${flowerIdx}_1x2.glb`,
            x: x * cellScale + cellScale / 2,
            z: z * cellScale + cellScale / 2,
            rotation: Math.floor(rng() * 4) * 90,
            category: "flowers",
          });
        } else {
          const vaseIdx = Math.floor(rng() * 5) + 1;
          decorations.push({
            modelPath: `hedges/misc/flowers/vase${vaseIdx}.glb`,
            x: x * cellScale + cellScale / 2,
            z: z * cellScale + cellScale / 2,
            rotation: Math.floor(rng() * 4) * 90,
            category: "flowers",
          });
        }
      }

      if (
        wallCount <= 1 &&
        rng() < hedgeMazeConfig.dressing.intersectionProbability
      ) {
        const columnIdx = Math.floor(rng() * 3) + 1;
        decorations.push({
          modelPath: `hedges/misc/stone/column${columnIdx}.glb`,
          x: x * cellScale,
          z: z * cellScale,
          rotation: 0,
          category: "stone",
        });
      }
    }
  }

  return decorations;
}
