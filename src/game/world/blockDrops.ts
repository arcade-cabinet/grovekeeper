/**
 * blockDrops — Wave 16.
 *
 * Pure data table mapping a biome-prefixed block id (e.g. `meadow.stone`,
 * `forest.log`) to what the block drops when broken and how many hits
 * it takes to break.
 *
 * Per the RC redesign spec ("The outer world: Voxel blocks are mined /
 * chopped / dug from the outer world. Each biome has its signature
 * material set. Carry inventory is capped — cozy-tier limits, not
 * survival-tier punishment."), this is the consumption side of the
 * production loop: Wave 12 already defined the recipes that consume
 * `material.log` and `material.stone`; gatherSystem in Wave 16 reads
 * this table to know what to drop into `inventoryRepo` when the player
 * breaks a voxel.
 *
 * Spec invariant: **Grove biome voxels are unbreakable.** The grove is
 * sacred. The player can ADD voxels to a claimed grove (Wave 12
 * placement), but cannot remove the grove's own native voxels — they
 * are returned as `{ unbreakable: true }` from `getBlockDrop` and the
 * gather system early-outs on them.
 *
 * Hit counts are cozy-tier — small numbers so a swing is satisfying.
 * Defaults:
 *   - logs / wood / planks   → `material.log`,  2 hits
 *   - dirt                   → `material.dirt`, 1 hit
 *   - stone                  → `material.stone`, 3 hits
 *   - sand                   → `material.sand`, 1 hit
 *   - grass tall / flat      → no drop, 1 hit (just clears)
 *   - mushroom / fern / wildflower / coral / shell / seagrass → small
 *     `material.*` drops, 1 hit each.
 */

import { COAST_BIOME, FOREST_BIOME, GROVE_BIOME, MEADOW_BIOME } from "./biomes";

/**
 * What a single block drops when broken. `unbreakable: true` means the
 * block cannot be mined at all — the gather system ignores it
 * regardless of swing.
 */
export interface BlockDrop {
  /** Item id to add to `inventoryRepo` on break. Omit when no drop. */
  readonly itemId?: string;
  /** Quantity per break. Defaults to 1 when `itemId` is set. */
  readonly count?: number;
  /** Number of swings required before the voxel is removed. */
  readonly hitsToBreak: number;
}

/** Returned when a block is registered as unbreakable (e.g. grove voxels). */
export interface UnbreakableBlock {
  readonly unbreakable: true;
}

export type BlockDropEntry = BlockDrop | UnbreakableBlock;

/**
 * Default drop / hit count by block name. Every collidable block in
 * every biome is covered (see `blockDrops.test.ts`).
 *
 * Naming: keys are the biome-prefixed `BlockDefinition.name`
 * (`meadow.stone`, `forest.log`). Decoration blocks (mushroom, fern…)
 * are `collidable: true` per `blockBuilder.ts` even though they read
 * as accents — the spec wants every collidable voxel to be either
 * gatherable or explicitly unbreakable, with no quiet third option.
 */
export const BLOCK_DROPS: Readonly<Record<string, BlockDropEntry>> = {
  // ── meadow (1..5) ────────────────────────────────────────────────
  // Surface grass: clears on one swing, no resource. This matches the
  // "weeding the meadow" feel — you tidy the surface but don't
  // accumulate grass-blade clutter in your bag.
  "meadow.grass-flat": { hitsToBreak: 1 },
  "meadow.grass-tall": { hitsToBreak: 1 },
  "meadow.dirt": { itemId: "material.dirt", count: 1, hitsToBreak: 1 },
  "meadow.stone": { itemId: "material.stone", count: 1, hitsToBreak: 3 },
  // Wildflower decoration. Drops a wildflower for cooking / dye recipes
  // a future polish wave can introduce — keeping the slot stable so the
  // recipe layer doesn't have to renumber.
  "meadow.wildflower": {
    itemId: "material.wildflower",
    count: 1,
    hitsToBreak: 1,
  },

  // ── forest (10..15) ──────────────────────────────────────────────
  // Mossy grass + bare moss are the surface — same "tidy, no resource"
  // shape as meadow grass.
  "forest.grass-mossy": { hitsToBreak: 1 },
  "forest.moss": { hitsToBreak: 1 },
  "forest.dirt-dark": { itemId: "material.dirt", count: 1, hitsToBreak: 1 },
  // Mossy stone is the bedrock layer — same hit count as meadow stone
  // so the gathering rhythm is biome-agnostic.
  "forest.stone-mossy": { itemId: "material.stone", count: 1, hitsToBreak: 3 },
  // Ferns & mushrooms — flavour drops for the cooking layer.
  "forest.fern": { itemId: "material.fern", count: 1, hitsToBreak: 1 },
  "forest.mushroom": { itemId: "material.mushroom", count: 1, hitsToBreak: 1 },

  // ── coast (20..25) ───────────────────────────────────────────────
  // Both sand variants drop the same `material.sand` item — wet/dry is
  // a visual distinction, not an inventory one.
  "coast.sand": { itemId: "material.sand", count: 1, hitsToBreak: 1 },
  "coast.sand-wet": { itemId: "material.sand", count: 1, hitsToBreak: 1 },
  // Beach rock = bedrock. Same hit count as the inland stones.
  "coast.rock": { itemId: "material.stone", count: 1, hitsToBreak: 3 },
  "coast.shell": { itemId: "material.shell", count: 1, hitsToBreak: 1 },
  "coast.seagrass": { itemId: "material.seagrass", count: 1, hitsToBreak: 1 },
  "coast.coral": { itemId: "material.coral", count: 1, hitsToBreak: 1 },

  // ── grove (30..35) — UNBREAKABLE ─────────────────────────────────
  // Spec: "Grove biome voxels are unbreakable. This is a spec invariant
  // — the grove is sacred. The player can ADD voxels to a claimed grove
  // (Wave 12 placement), but never remove the grove's own native voxels."
  "grove.luminous-grass": { unbreakable: true },
  "grove.spirit-moss": { unbreakable: true },
  "grove.gilded-dirt": { unbreakable: true },
  "grove.alabaster-stone": { unbreakable: true },
  "grove.spirit-bloom": { unbreakable: true },
  "grove.shrine-tile": { unbreakable: true },
} as const;

/**
 * Look up the drop entry for a block name. Returns `null` when the
 * block id is unknown (defensive — every collidable block in the four
 * shipped biomes is covered, and the test suite enforces it).
 */
export function getBlockDrop(blockName: string): BlockDropEntry | null {
  return BLOCK_DROPS[blockName] ?? null;
}

/** True if the block is registered as unbreakable. */
export function isUnbreakable(entry: BlockDropEntry | null): boolean {
  return entry !== null && (entry as UnbreakableBlock).unbreakable === true;
}

/**
 * Return every collidable block name across all four shipped biomes.
 * Used by the test suite to enforce coverage; also handy for editor
 * tooling that wants to enumerate gatherable blocks.
 *
 * `collidable: true` is the gate: the underlying voxel renderer treats
 * decorations + solids alike as collidable cubes (see
 * `blockBuilder.ts`), so every block in every biome is included unless
 * a future biome explicitly opts out.
 */
export function listCollidableBlockNames(): string[] {
  const names: string[] = [];
  for (const biome of [MEADOW_BIOME, FOREST_BIOME, COAST_BIOME, GROVE_BIOME]) {
    for (const block of biome.blocks) {
      if (block.collidable !== false) names.push(block.name);
    }
  }
  return names;
}
