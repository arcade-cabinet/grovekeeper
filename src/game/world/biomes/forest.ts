/**
 * Forest biome — deep, mossy, layered. Surface is mossy grass over
 * dark dirt over mossy stone. Decorations: ferns + mushrooms.
 *
 * Tile vocabulary (from `public/assets/tilesets/biomes/forest.json`):
 *   grass-mossy, moss, dirt-dark, stone-mossy, fern, leaves-deep, log,
 *   bark, mushroom, root.
 *
 * Block id range: 10..15.
 */

import worldConfig from "../world.config.json";
import { buildBlockDefinitions } from "./blockBuilder";
import type { BiomeDefinition } from "./types";

export const FOREST_BLOCK_IDS = {
  grassMossy: 10,
  moss: 11,
  dirtDark: 12,
  stoneMossy: 13,
  fern: 14,
  mushroom: 15,
} as const;

const TILES = {
  grassMossy: { col: 0, row: 0 },
  moss: { col: 1, row: 0 },
  dirtDark: { col: 2, row: 0 },
  stoneMossy: { col: 3, row: 0 },
  fern: { col: 4, row: 0 },
  mushroom: { col: 0, row: 1 },
} as const;

export const FOREST_BIOME: BiomeDefinition = {
  id: "forest",
  displayName: "Forest",
  tilesetPath: "assets/tilesets/biomes/forest.png",
  tilesetJsonPath: "assets/tilesets/biomes/forest.json",
  blocks: buildBlockDefinitions("forest", [
    {
      id: FOREST_BLOCK_IDS.grassMossy,
      name: "forest.grass-mossy",
      kind: "topped",
      primary: TILES.grassMossy,
      secondary: TILES.dirtDark,
    },
    {
      id: FOREST_BLOCK_IDS.moss,
      name: "forest.moss",
      kind: "topped",
      primary: TILES.moss,
      secondary: TILES.dirtDark,
    },
    {
      id: FOREST_BLOCK_IDS.dirtDark,
      name: "forest.dirt-dark",
      kind: "solid",
      primary: TILES.dirtDark,
    },
    {
      id: FOREST_BLOCK_IDS.stoneMossy,
      name: "forest.stone-mossy",
      kind: "solid",
      primary: TILES.stoneMossy,
    },
    {
      id: FOREST_BLOCK_IDS.fern,
      name: "forest.fern",
      kind: "decoration",
      primary: TILES.fern,
    },
    {
      id: FOREST_BLOCK_IDS.mushroom,
      name: "forest.mushroom",
      kind: "decoration",
      primary: TILES.mushroom,
    },
  ]),
  surfaceBlock: FOREST_BLOCK_IDS.grassMossy,
  subSurfaceBlock: FOREST_BLOCK_IDS.dirtDark,
  bedrockBlock: FOREST_BLOCK_IDS.stoneMossy,
  decorations: [
    // Ferns + mushrooms + alt mossy patches. Forest is denser than meadow.
    { id: FOREST_BLOCK_IDS.fern, weight: 6 },
    { id: FOREST_BLOCK_IDS.mushroom, weight: 3 },
    { id: FOREST_BLOCK_IDS.moss, weight: 8 },
  ],
  groundY: worldConfig.groundY,
  palette: {
    primary: "#3F6B3A", // deep forest green
    secondary: "#2A1F14", // dark soil
    accent: "#A35A3F", // mushroom red-brown
  },
};
