/** Maze decoration placement: center reward area + dead ends + intersections. Spec §17.5. */

import hedgeMazeConfig from "@/config/game/hedgeMaze.json" with { type: "json" };
import { createRNG } from "@/game/utils/seedRNG";
import type { MazeDecoration, MazeResult } from "./types.ts";

/** Places decorations at the center reward area, dead ends, and intersections. */
export function placeMazeDecorations(maze: MazeResult, seed: number): MazeDecoration[] {
  const rng = createRNG(seed);
  const decorations: MazeDecoration[] = [];
  const cellScale: number = hedgeMazeConfig.cellScale;

  // ── Center reward area ──────────────────────────────────────────────────────
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

  // ── Dead ends and intersections ─────────────────────────────────────────────
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

      // Dead end: 3 walls → place dungeon prop (25%) or flower/vase decoration (75%).
      if (wallCount === 3 && rng() < hedgeMazeConfig.dressing.deadEndProbability) {
        const isDungeonProp = rng() < hedgeMazeConfig.dressing.dungeonPropProbability;
        if (isDungeonProp) {
          const dungeonProps: string[] = hedgeMazeConfig.dressing.dungeonProps;
          const propPath = dungeonProps[Math.floor(rng() * dungeonProps.length)];
          decorations.push({
            modelPath: propPath,
            x: x * cellScale + cellScale / 2,
            z: z * cellScale + cellScale / 2,
            rotation: Math.floor(rng() * 4) * 90,
            category: "dungeon",
          });
        } else {
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
      }

      // Intersection: 0-1 walls → occasional column.
      if (wallCount <= 1 && rng() < hedgeMazeConfig.dressing.intersectionProbability) {
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
