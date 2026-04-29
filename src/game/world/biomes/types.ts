/**
 * Biome registry types.
 *
 * The four RC biomes are Meadow, Forest, Coast, Grove. Each
 * `BiomeDefinition` is a fully self-describing record: tileset paths,
 * block list, which block ids form the surface / sub-surface / bedrock
 * layers, optional surface decorations, and a palette hint for ambient
 * lighting tints.
 *
 * Block ids are biome-prefixed (`meadow.grass-flat`, `forest.pine-floor`)
 * so neighbouring chunks of different biomes can coexist in the same
 * renderer registry without colliding on numeric id or name.
 */

import type { BlockDefinition } from "@jolly-pixel/voxel.renderer";

/** The four RC biomes. Locked — see RC redesign spec §39.5. */
export type BiomeId = "meadow" | "forest" | "coast" | "grove";

export const BIOME_IDS: readonly BiomeId[] = [
  "meadow",
  "forest",
  "coast",
  "grove",
] as const;

/** Optional decoration entry — used by `chunkGenerator` to scatter surface props. */
export interface BiomeDecoration {
  /** Block id in `BiomeDefinition.blocks`. Must exist in the same definition. */
  id: number;
  /**
   * Relative weight for the random roll. Higher = more frequent. The
   * generator normalises weights against the biome's total decoration
   * weight; absolute scale is not significant.
   */
  weight: number;
}

/** Optional palette hint for future ambient lighting / fog work. */
export interface BiomePalette {
  /** Primary biome color — hex string, eg `"#7BB661"`. */
  primary: string;
  /** Optional secondary color (foliage, water tint, etc). */
  secondary?: string;
  /** Optional accent color (decorations, highlights). */
  accent?: string;
}

/**
 * Self-describing biome record. Static data — no runtime state.
 *
 * Invariants enforced by `registry.test.ts`:
 *   - `surfaceBlock`, `subSurfaceBlock`, `bedrockBlock` each appear in `blocks`.
 *   - Every block's `defaultTexture.tilesetId` matches `id` (biome id).
 *   - Every face/default texture references a tile that exists in the
 *     biome's tileset JSON.
 *   - Decoration ids appear in `blocks`.
 */
export interface BiomeDefinition {
  /** Stable identifier — matches the tileset id and the JSON filename. */
  id: BiomeId;
  /** Human-readable label for debug overlays / logs. */
  displayName: string;
  /** Path-relative-to-base PNG tileset. Resolved at load time via `BASE_URL`. */
  tilesetPath: string;
  /** Path-relative-to-base tileset JSON. Used for tile-id lookups + tests. */
  tilesetJsonPath: string;
  /**
   * Block definitions registered under this biome. Block ids are
   * disjoint per biome (meadow=1-5, forest=10-15, coast=20-25, grove=30-35).
   * Names are biome-prefixed: `meadow.grass-flat`, etc.
   */
  blocks: BlockDefinition[];
  /** Block id of the top "ground" cell — what the player walks on. */
  surfaceBlock: number;
  /** Block id between bedrock and surface — usually a "dirt" variant. */
  subSurfaceBlock: number;
  /** Block id of the deep bedrock layer — usually a "stone" variant. */
  bedrockBlock: number;
  /**
   * Optional scatter decorations laid one voxel above the surface. Empty
   * array = no decorations (still legal — keeps the biome flat).
   */
  decorations: BiomeDecoration[];
  /**
   * Y coordinate of the surface row. Most biomes use the world config
   * default (5); a desert / shoreline could lower it later.
   */
  groundY: number;
  /** Optional ambient palette for future lighting / fog tints. */
  palette?: BiomePalette;
}
