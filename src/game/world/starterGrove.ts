/**
 * Starter grove pre-state.
 *
 * On a fresh world the player should not have to *do* anything to make
 * the opening teaching beat work. Walking into chunk (3, 0) — the
 * starter grove — should reveal a discovered (but not yet claimed)
 * grove with two clearly-gatherable prop piles, the hearth recipe
 * already learned, and a primitive workbench at the centre (the
 * workbench itself is spawned as a freestanding actor in `runtime.ts`,
 * not persisted here).
 *
 * Idempotency: every write here either guards on existing rows or uses
 * a repo with built-in idempotency (`discoverGrove`, `learnRecipe`,
 * `applyBlockMod` replaces by coordinate). Re-running `seedStarterGrove`
 * on the same world is a no-op.
 *
 * Spec ref: `docs/superpowers/specs/2026-04-24-grovekeeper-rc-redesign-design.md`
 *   §"First spawn" — pre-discovered grove, light hearth, cairn + log
 *   pile, "every prompt is a thing in the world."
 */

import type { AppDatabase } from "@/db/client";
import { chunksRepo, grovesRepo, recipesRepo } from "@/db/repos";
import { STARTER_GROVE_CHUNK } from "./grovePlacement";

/** Recipe id auto-learned by the seed. The hearth is the claim ritual. */
export const STARTER_RECIPE_ID = "recipe.hearth";

/** Stable grove id for the starter grove (mirrors `groveDiscovery.ts`). */
export function starterGroveId(): string {
  return `grove-${STARTER_GROVE_CHUNK.x}-${STARTER_GROVE_CHUNK.z}`;
}

/** Voxel y where the gatherable piles sit. Surface row in the chunk. */
export const STARTER_PROP_Y = 0;

/** Local (x, z) voxel positions of the four log-pile voxels. */
export const LOG_PILE_LOCAL_POSITIONS: ReadonlyArray<{
  x: number;
  z: number;
}> = [
  { x: 4, z: 8 },
  { x: 5, z: 8 },
  { x: 4, z: 9 },
  { x: 5, z: 9 },
] as const;

/** Local (x, z) voxel positions of the three stone-cairn voxels. */
export const STONE_CAIRN_LOCAL_POSITIONS: ReadonlyArray<{
  x: number;
  z: number;
}> = [
  { x: 11, z: 7 },
  { x: 12, z: 8 },
  { x: 11, z: 9 },
] as const;

/** Block id stamped for each log voxel in the pile. */
export const LOG_PILE_BLOCK_ID = "meadow.wood";
/** Block id stamped for each stone voxel in the cairn. */
export const STONE_CAIRN_BLOCK_ID = "meadow.stone";

/**
 * Idempotently seed the starter grove for `worldId`.
 */
export function seedStarterGrove(db: AppDatabase, worldId: string): void {
  const groveId = starterGroveId();
  const cx = STARTER_GROVE_CHUNK.x;
  const cz = STARTER_GROVE_CHUNK.z;

  // 1. Grove row in `discovered` state. Idempotent at the repo level.
  grovesRepo.discoverGrove(db, {
    id: groveId,
    worldId,
    chunkX: cx,
    chunkZ: cz,
    biome: "meadow",
  });

  // 2. Log pile.
  for (const { x, z } of LOG_PILE_LOCAL_POSITIONS) {
    chunksRepo.applyBlockMod(db, worldId, cx, cz, "grove", {
      x,
      y: STARTER_PROP_Y,
      z,
      op: "set",
      blockId: LOG_PILE_BLOCK_ID,
    });
  }

  // 3. Stone cairn.
  for (const { x, z } of STONE_CAIRN_LOCAL_POSITIONS) {
    chunksRepo.applyBlockMod(db, worldId, cx, cz, "grove", {
      x,
      y: STARTER_PROP_Y,
      z,
      op: "set",
      blockId: STONE_CAIRN_BLOCK_ID,
    });
  }

  // 4. Hearth recipe.
  recipesRepo.learnRecipe(db, worldId, STARTER_RECIPE_ID);
}

/** True iff the starter grove has been seeded for this world. */
export function isStarterGroveSeeded(
  db: AppDatabase,
  worldId: string,
): boolean {
  return (
    grovesRepo.getGroveAt(
      db,
      worldId,
      STARTER_GROVE_CHUNK.x,
      STARTER_GROVE_CHUNK.z,
    ) != null
  );
}
