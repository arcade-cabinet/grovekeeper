/**
 * Internal helper — builds `BlockDefinition` records for biome
 * definitions in a uniform shape. Keeps the per-biome files declarative
 * (a tile-id map + which-block-uses-which-tiles) instead of repeating
 * the `faceTextures` / `defaultTexture` boilerplate four times.
 *
 * Not exported from the barrel — the four biome modules are the only
 * intended callers.
 */

import type { BlockDefinition } from "@jolly-pixel/voxel.renderer";
import type { BiomeId } from "./types";

/** Tile coordinate in the biome's atlas. Same shape as the JSON entries. */
export interface TileCoord {
  col: number;
  row: number;
}

/**
 * High-level intent for a block: where it lives in the column.
 *
 *   - `solid`     : opaque cube; same texture on every face.
 *   - `topped`    : cube with a distinct top face. Bottom + sides use
 *                   the secondary texture (think grass-on-dirt).
 *   - `decoration`: non-collidable cube — wildflower, mushroom, shell.
 *                   Same texture on every face for now (see Wave 7
 *                   note re: billboard shape).
 */
export type BlockKind = "solid" | "topped" | "decoration";

export interface BlockBuildSpec {
  /**
   * Numeric id. Convention: per-biome ranges to keep saves stable —
   * meadow 1-5, forest 10-15, coast 20-25, grove 30-35.
   */
  id: number;
  /** Biome-prefixed name, eg `"meadow.grass-flat"`. */
  name: string;
  kind: BlockKind;
  /** Primary tile (default texture). For `topped`, this is the TOP. */
  primary: TileCoord;
  /**
   * For `topped` blocks: tile used for sides + bottom. Required when
   * `kind === "topped"`; ignored otherwise.
   */
  secondary?: TileCoord;
}

/**
 * Build the full `BlockDefinition` list for a biome. The biome id flows
 * into every `tilesetId` reference so the renderer can look up the
 * right tileset on load.
 */
export function buildBlockDefinitions(
  biomeId: BiomeId,
  specs: readonly BlockBuildSpec[],
): BlockDefinition[] {
  return specs.map((spec) => buildOne(biomeId, spec));
}

function buildOne(biomeId: BiomeId, spec: BlockBuildSpec): BlockDefinition {
  if (spec.kind === "topped") {
    if (!spec.secondary) {
      throw new Error(
        `Block "${spec.name}" is kind=topped but has no secondary tile`,
      );
    }
    return {
      id: spec.id,
      name: spec.name,
      shapeId: "cube",
      faceTextures: {
        // FACE.PosY = 2 (top), FACE.NegY = 3 (bottom). Sides fall
        // through to defaultTexture.
        2: { tilesetId: biomeId, ...spec.primary },
        3: { tilesetId: biomeId, ...spec.secondary },
      },
      defaultTexture: { tilesetId: biomeId, ...spec.secondary },
      collidable: true,
    };
  }
  // solid + decoration share the "same texture all sides" shape; only
  // collidability differs.
  return {
    id: spec.id,
    name: spec.name,
    shapeId: "cube",
    faceTextures: {},
    defaultTexture: { tilesetId: biomeId, ...spec.primary },
    collidable: spec.kind !== "decoration",
  };
}
