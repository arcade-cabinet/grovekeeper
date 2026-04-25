/**
 * Coast biome — sandy beach with tide pools. Surface is dry sand over
 * wet sand over rock. Decorations: shells + seagrass.
 *
 * Tile vocabulary (from `public/assets/tilesets/biomes/coast.json`):
 *   sand, sand-wet, shell, rock, tide-pool, seagrass, driftwood,
 *   dock-plank, foam, coral.
 *
 * Note: Coast doesn't ship a "deep stone" tile. We use `rock` for the
 * bedrock layer and `sand-wet` for the sub-surface — gives a damp
 * shoreline column without inventing tiles.
 *
 * Block id range: 20..25.
 */

import worldConfig from "../world.config.json";
import { buildBlockDefinitions } from "./blockBuilder";
import type { BiomeDefinition } from "./types";

export const COAST_BLOCK_IDS = {
  sand: 20,
  sandWet: 21,
  rock: 22,
  shell: 23,
  seagrass: 24,
  coral: 25,
} as const;

const TILES = {
  sand: { col: 0, row: 0 },
  sandWet: { col: 1, row: 0 },
  shell: { col: 2, row: 0 },
  rock: { col: 3, row: 0 },
  seagrass: { col: 5, row: 0 },
  coral: { col: 1, row: 1 },
} as const;

export const COAST_BIOME: BiomeDefinition = {
  id: "coast",
  displayName: "Coast",
  tilesetPath: "assets/tilesets/biomes/coast.png",
  tilesetJsonPath: "assets/tilesets/biomes/coast.json",
  blocks: buildBlockDefinitions("coast", [
    {
      id: COAST_BLOCK_IDS.sand,
      // No grass/dirt distinction on the beach — the sand cube uses
      // the same texture top + sides + bottom.
      name: "coast.sand",
      kind: "solid",
      primary: TILES.sand,
    },
    {
      id: COAST_BLOCK_IDS.sandWet,
      name: "coast.sand-wet",
      kind: "solid",
      primary: TILES.sandWet,
    },
    {
      id: COAST_BLOCK_IDS.rock,
      name: "coast.rock",
      kind: "solid",
      primary: TILES.rock,
    },
    {
      id: COAST_BLOCK_IDS.shell,
      name: "coast.shell",
      kind: "decoration",
      primary: TILES.shell,
    },
    {
      id: COAST_BLOCK_IDS.seagrass,
      name: "coast.seagrass",
      kind: "decoration",
      primary: TILES.seagrass,
    },
    {
      id: COAST_BLOCK_IDS.coral,
      name: "coast.coral",
      kind: "decoration",
      primary: TILES.coral,
    },
  ]),
  surfaceBlock: COAST_BLOCK_IDS.sand,
  subSurfaceBlock: COAST_BLOCK_IDS.sandWet,
  bedrockBlock: COAST_BLOCK_IDS.rock,
  decorations: [
    // Sparse shells, occasional seagrass tufts, rare coral chunks.
    { id: COAST_BLOCK_IDS.shell, weight: 3 },
    { id: COAST_BLOCK_IDS.seagrass, weight: 2 },
    { id: COAST_BLOCK_IDS.coral, weight: 1 },
  ],
  groundY: worldConfig.groundY,
  palette: {
    primary: "#E8D9A8", // warm sand
    secondary: "#7AB6C8", // shallow water blue
    accent: "#E8A8B0", // coral / shell pink
  },
};
