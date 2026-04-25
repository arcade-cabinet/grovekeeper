/**
 * Grove biome — the sacred, glowing endgame biome. Luminous grass over
 * gilded dirt over alabaster stone. Decorations: spirit blooms, spirit
 * moss patches, shrine tiles.
 *
 * Tile vocabulary (from `public/assets/tilesets/biomes/grove.json`):
 *   luminous-grass, spirit-moss, gilded-dirt, alabaster-stone,
 *   spirit-bloom, leaves-luminous, heartwood, rune-stone, mist,
 *   shrine-tile.
 *
 * Block id range: 30..35.
 */

import worldConfig from "../world.config.json";
import { buildBlockDefinitions } from "./blockBuilder";
import type { BiomeDefinition } from "./types";

export const GROVE_BLOCK_IDS = {
  luminousGrass: 30,
  spiritMoss: 31,
  gildedDirt: 32,
  alabasterStone: 33,
  spiritBloom: 34,
  shrineTile: 35,
} as const;

const TILES = {
  luminousGrass: { col: 0, row: 0 },
  spiritMoss: { col: 1, row: 0 },
  gildedDirt: { col: 2, row: 0 },
  alabasterStone: { col: 3, row: 0 },
  spiritBloom: { col: 4, row: 0 },
  shrineTile: { col: 1, row: 1 },
} as const;

export const GROVE_BIOME: BiomeDefinition = {
  id: "grove",
  displayName: "Grove",
  tilesetPath: "assets/tilesets/biomes/grove.png",
  tilesetJsonPath: "assets/tilesets/biomes/grove.json",
  blocks: buildBlockDefinitions("grove", [
    {
      id: GROVE_BLOCK_IDS.luminousGrass,
      name: "grove.luminous-grass",
      kind: "topped",
      primary: TILES.luminousGrass,
      secondary: TILES.gildedDirt,
    },
    {
      id: GROVE_BLOCK_IDS.spiritMoss,
      name: "grove.spirit-moss",
      kind: "topped",
      primary: TILES.spiritMoss,
      secondary: TILES.gildedDirt,
    },
    {
      id: GROVE_BLOCK_IDS.gildedDirt,
      name: "grove.gilded-dirt",
      kind: "solid",
      primary: TILES.gildedDirt,
    },
    {
      id: GROVE_BLOCK_IDS.alabasterStone,
      name: "grove.alabaster-stone",
      kind: "solid",
      primary: TILES.alabasterStone,
    },
    {
      id: GROVE_BLOCK_IDS.spiritBloom,
      name: "grove.spirit-bloom",
      kind: "decoration",
      primary: TILES.spiritBloom,
    },
    {
      id: GROVE_BLOCK_IDS.shrineTile,
      name: "grove.shrine-tile",
      // Shrine tiles are walkable — collidable solid, even though they
      // visually read as a decoration accent.
      kind: "solid",
      primary: TILES.shrineTile,
    },
  ]),
  surfaceBlock: GROVE_BLOCK_IDS.luminousGrass,
  subSurfaceBlock: GROVE_BLOCK_IDS.gildedDirt,
  bedrockBlock: GROVE_BLOCK_IDS.alabasterStone,
  decorations: [
    // Spirit blooms scatter denser than meadow wildflowers, with some
    // alt spirit-moss patches breaking up the surface.
    { id: GROVE_BLOCK_IDS.spiritBloom, weight: 6 },
    { id: GROVE_BLOCK_IDS.spiritMoss, weight: 6 },
  ],
  groundY: worldConfig.groundY,
  palette: {
    primary: "#9AE5C5", // luminous mint
    secondary: "#E8D08A", // gilded dirt
    accent: "#D7B8FF", // spirit bloom violet
  },
};
