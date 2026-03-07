/**
 * Tree Scale System — applies growth-stage scale to renderable.scale.
 *
 * Iterates over all tree entities each game tick and writes
 * getStageScale(stage, progress) → entity.renderable.scale.
 * TreeInstances.tsx then lerps the Three.js mesh toward that target value.
 *
 * See GAME_SPEC.md §8.
 */

import { treesQuery } from "@/game/ecs/world";
import { getStageScale } from "@/game/systems/growth";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Minimal entity shape the system operates on — used for testing. */
export interface TreeScaleEntity {
  tree: { stage: number; progress: number };
  renderable: { scale: number; visible: boolean };
}

// ---------------------------------------------------------------------------
// Pure per-entity helper (exported for unit tests)
// ---------------------------------------------------------------------------

/**
 * Update a single tree entity's renderable.scale from its current stage/progress.
 *
 * Mutates entity.renderable.scale in-place.
 */
export function applyTreeScale(entity: TreeScaleEntity): void {
  entity.renderable.scale = getStageScale(entity.tree.stage, entity.tree.progress);
}

// ---------------------------------------------------------------------------
// System runner
// ---------------------------------------------------------------------------

/**
 * Run the tree scale system over all tree ECS entities.
 *
 * @param query — optional override for testing; defaults to the live treesQuery.
 */
export function treeScaleSystem(
  query: { entities: Iterable<TreeScaleEntity> } = treesQuery as unknown as {
    entities: Iterable<TreeScaleEntity>;
  },
): void {
  for (const entity of query.entities) {
    applyTreeScale(entity);
  }
}
