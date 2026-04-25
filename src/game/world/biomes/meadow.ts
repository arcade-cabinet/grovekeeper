/**
 * Meadow biome — bright greens, flat grass, scattered wildflowers. The
 * Wave 7 default. Ids are kept stable (1..5) so saves from Wave 7
 * round-trip without remapping.
 *
 * Tile vocabulary (from `public/assets/tilesets/biomes/meadow.json`):
 *   grass-flat, grass-tall, dirt, stone, wildflower, leaves, wood,
 *   fence, path, puddle.
 *
 * We only consume the first five tiles in Wave 8 — the rest stay
 * available for later structure / decoration work.
 */

import worldConfig from "../world.config.json";
import { buildBlockDefinitions } from "./blockBuilder";
import type { BiomeDefinition } from "./types";

/** Numeric block ids for the meadow biome (range 1..9). */
export const MEADOW_BLOCK_IDS = {
  air: 0,
  grassFlat: 1,
  grassTall: 2,
  dirt: 3,
  stone: 4,
  wildflower: 5,
} as const;

const TILES = {
  grassFlat: { col: 0, row: 0 },
  grassTall: { col: 1, row: 0 },
  dirt: { col: 2, row: 0 },
  stone: { col: 3, row: 0 },
  wildflower: { col: 4, row: 0 },
} as const;

export const MEADOW_BIOME: BiomeDefinition = {
  id: "meadow",
  displayName: "Meadow",
  tilesetPath: "assets/tilesets/biomes/meadow.png",
  tilesetJsonPath: "assets/tilesets/biomes/meadow.json",
  blocks: buildBlockDefinitions("meadow", [
    {
      id: MEADOW_BLOCK_IDS.grassFlat,
      name: "meadow.grass-flat",
      kind: "topped",
      primary: TILES.grassFlat,
      secondary: TILES.dirt,
    },
    {
      id: MEADOW_BLOCK_IDS.grassTall,
      name: "meadow.grass-tall",
      kind: "topped",
      primary: TILES.grassTall,
      secondary: TILES.dirt,
    },
    {
      id: MEADOW_BLOCK_IDS.dirt,
      name: "meadow.dirt",
      kind: "solid",
      primary: TILES.dirt,
    },
    {
      id: MEADOW_BLOCK_IDS.stone,
      name: "meadow.stone",
      kind: "solid",
      primary: TILES.stone,
    },
    {
      id: MEADOW_BLOCK_IDS.wildflower,
      name: "meadow.wildflower",
      kind: "decoration",
      primary: TILES.wildflower,
    },
  ]),
  surfaceBlock: MEADOW_BLOCK_IDS.grassFlat,
  subSurfaceBlock: MEADOW_BLOCK_IDS.dirt,
  bedrockBlock: MEADOW_BLOCK_IDS.stone,
  decorations: [
    // 4% wildflower scatter, 8% tall grass — matches Wave 7 thresholds.
    { id: MEADOW_BLOCK_IDS.wildflower, weight: 4 },
    { id: MEADOW_BLOCK_IDS.grassTall, weight: 8 },
  ],
  groundY: worldConfig.groundY,
  palette: {
    primary: "#7BB661", // saturated meadow green
    secondary: "#C7B774", // dry grass / dirt accent
    accent: "#F5D547", // wildflower yellow
  },
};
