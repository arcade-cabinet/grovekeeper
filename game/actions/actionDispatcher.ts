/**
 * actionDispatcher -- Action dispatch system (Spec §11).
 *
 * Maps tool type + target entity type to a game verb (DIG/CHOP/WATER/PLANT/PRUNE)
 * and executes the corresponding system function from GameActions.
 *
 * Pure `resolveAction` is exported as a testable seam separate from side-effecting
 * `dispatchAction`, following the pattern established in TargetInfo.tsx and ToolViewModel.tsx.
 */

import { clearRock, harvestTree, plantTree, pruneTree, waterTree } from "@/game/actions/GameActions";
import type { Entity } from "@/game/ecs/world";
import type { RaycastEntityType } from "@/game/hooks/useRaycast";

/** The five core game verbs mapped by the dispatcher. */
export type GameAction = "DIG" | "CHOP" | "WATER" | "PLANT" | "PRUNE";

/**
 * Superset of RaycastEntityType — includes terrain surface types for ground
 * interactions (DIG/PLANT) that are resolved from hit point grid coordinates.
 */
export type TargetEntityType = RaycastEntityType | "soil" | "rock";

/** Full context for a dispatched action. */
export interface DispatchContext {
  /** The currently equipped tool. */
  toolId: string;
  /** Category of the thing the player is looking at. null = empty ground. */
  targetType: TargetEntityType | null;
  /** The ECS entity at the crosshair — required for tree/npc/structure targets. */
  entity?: Entity;
  /** Grid X coordinate — required for PLANT and DIG. */
  gridX?: number;
  /** Grid Z coordinate — required for PLANT and DIG. */
  gridZ?: number;
  /** Species to plant — required for PLANT. */
  speciesId?: string;
}

/**
 * Resolves the game verb for a given tool + target type combination.
 *
 * Returns null when the combination is not a valid interaction
 * (e.g. axe + npc, almanac + tree).
 *
 * Priority order:
 *   axe   + tree  -> CHOP
 *   can   + tree  -> WATER
 *   shears + tree -> PRUNE
 *   trowel + soil -> PLANT
 *   trowel + null -> PLANT  (empty ground)
 *   shovel + rock -> DIG
 */
export function resolveAction(toolId: string, targetType: TargetEntityType | null): GameAction | null {
  if (toolId === "axe" && targetType === "tree") return "CHOP";
  if (toolId === "watering-can" && targetType === "tree") return "WATER";
  if (toolId === "pruning-shears" && targetType === "tree") return "PRUNE";
  if (toolId === "trowel" && (targetType === "soil" || targetType === null)) return "PLANT";
  if (toolId === "shovel" && targetType === "rock") return "DIG";
  return null;
}

/**
 * Dispatches the action resolved from `ctx.toolId` + `ctx.targetType`,
 * calling the correct system function from GameActions.
 *
 * Returns true on success, false if the combo has no mapping or required
 * context fields are missing (entity id, grid coords, speciesId).
 */
export function dispatchAction(ctx: DispatchContext): boolean {
  const action = resolveAction(ctx.toolId, ctx.targetType);
  if (!action) return false;

  switch (action) {
    case "CHOP": {
      if (!ctx.entity?.id) return false;
      return harvestTree(ctx.entity.id) !== null;
    }
    case "WATER": {
      if (!ctx.entity?.id) return false;
      return waterTree(ctx.entity.id);
    }
    case "PRUNE": {
      if (!ctx.entity?.id) return false;
      return pruneTree(ctx.entity.id);
    }
    case "PLANT": {
      if (ctx.gridX === undefined || ctx.gridZ === undefined || !ctx.speciesId) return false;
      return plantTree(ctx.speciesId, ctx.gridX, ctx.gridZ);
    }
    case "DIG": {
      if (ctx.gridX === undefined || ctx.gridZ === undefined) return false;
      return clearRock(ctx.gridX, ctx.gridZ);
    }
  }
}
