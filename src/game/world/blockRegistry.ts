/**
 * Grovekeeper block registry — declarative list of `BlockDefinition`s
 * the meadow biome ships with for Wave 7. Wave 8 will extend this for
 * forest/coast/grove biomes; for now we expose the meadow-only set so
 * the SingleChunkActor has something to write into the layer.
 *
 * Mirrors voxel-realms' `BAKED_BLOCKS` pattern (see
 * `voxel-realms/src/world/voxel-bake.ts`): we define block ids once,
 * reference them everywhere via the `MEADOW_BLOCK_IDS` map, and embed
 * the definitions into the `VoxelWorldJSON` payload so `VoxelRenderer`
 * is fully self-contained.
 *
 * Block ID `0` is reserved for air by the renderer and is intentionally
 * not registered (the renderer treats absent voxels as air). The
 * `air` entry on `MEADOW_BLOCK_IDS` exists only for ergonomic call-site
 * comparisons in the chunk generator.
 */

import type { BlockDefinition } from "@jolly-pixel/voxel.renderer";

/** Tileset id for the meadow biome — matches `meadow.json` and the PNG path. */
export const MEADOW_TILESET_ID = "meadow";

/**
 * Numeric block ids for the meadow biome. Wave 8 will likely keep these
 * stable and only add forest/coast/grove ids on top, so save files
 * round-trip without remapping.
 */
export const MEADOW_BLOCK_IDS = {
  air: 0,
  grassFlat: 1,
  grassTall: 2,
  dirt: 3,
  stone: 4,
  wildflower: 5,
} as const;

export type MeadowBlockId =
  (typeof MEADOW_BLOCK_IDS)[keyof typeof MEADOW_BLOCK_IDS];

/**
 * Tile coordinates inside `public/assets/tilesets/biomes/meadow.json`.
 * Mirrored here so the registry doesn't need a runtime fetch of the
 * JSON before it can build `BlockDefinition`s. If the JSON ever drifts
 * from these coords, the meadow chunk will look wrong — kept tight on
 * purpose so a CI guard can easily diff later.
 */
const MEADOW_TILES = {
  grassFlat: { col: 0, row: 0 },
  grassTall: { col: 1, row: 0 },
  dirt: { col: 2, row: 0 },
  stone: { col: 3, row: 0 },
  wildflower: { col: 4, row: 0 },
} as const;

/**
 * The block definitions that ship in the meadow `VoxelWorldJSON`.
 *
 * Notes on collision:
 *   - `grass-flat`, `grass-tall`, `dirt`, `stone` are all collidable —
 *     the player capsule needs to stand on them.
 *   - `wildflower` is NOT collidable. It uses the `cube` shape for now
 *     because the published renderer doesn't ship a billboard/cross
 *     shape we can reliably target; Wave 8 may revisit this and switch
 *     to a thin slab or model billboard.
 */
export const MEADOW_BLOCK_DEFS: BlockDefinition[] = [
  {
    id: MEADOW_BLOCK_IDS.grassFlat,
    name: "grass-flat",
    shapeId: "cube",
    faceTextures: {
      // FACE.PosY = 2 (top), FACE.NegY = 3 (bottom). Sides fall through
      // to defaultTexture.
      2: { tilesetId: MEADOW_TILESET_ID, ...MEADOW_TILES.grassFlat },
      3: { tilesetId: MEADOW_TILESET_ID, ...MEADOW_TILES.dirt },
    },
    defaultTexture: { tilesetId: MEADOW_TILESET_ID, ...MEADOW_TILES.dirt },
    collidable: true,
  },
  {
    id: MEADOW_BLOCK_IDS.grassTall,
    name: "grass-tall",
    shapeId: "cube",
    faceTextures: {
      2: { tilesetId: MEADOW_TILESET_ID, ...MEADOW_TILES.grassTall },
      3: { tilesetId: MEADOW_TILESET_ID, ...MEADOW_TILES.dirt },
    },
    defaultTexture: { tilesetId: MEADOW_TILESET_ID, ...MEADOW_TILES.dirt },
    collidable: true,
  },
  {
    id: MEADOW_BLOCK_IDS.dirt,
    name: "dirt",
    shapeId: "cube",
    faceTextures: {},
    defaultTexture: { tilesetId: MEADOW_TILESET_ID, ...MEADOW_TILES.dirt },
    collidable: true,
  },
  {
    id: MEADOW_BLOCK_IDS.stone,
    name: "stone",
    shapeId: "cube",
    faceTextures: {},
    defaultTexture: { tilesetId: MEADOW_TILESET_ID, ...MEADOW_TILES.stone },
    collidable: true,
  },
  {
    id: MEADOW_BLOCK_IDS.wildflower,
    name: "wildflower",
    shapeId: "cube",
    faceTextures: {},
    defaultTexture: {
      tilesetId: MEADOW_TILESET_ID,
      ...MEADOW_TILES.wildflower,
    },
    collidable: false,
  },
];

/**
 * Convenience: register every meadow block on a renderer's
 * `BlockRegistry`. Mirrors the `for (const block of BAKED_BLOCKS)` loop
 * in voxel-realms' `TerrainBehavior.awake`.
 */
export function registerMeadowBlocks(registry: {
  register(def: BlockDefinition): void;
}): void {
  for (const block of MEADOW_BLOCK_DEFS) {
    registry.register(block);
  }
}
