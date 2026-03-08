/**
 * radialActions -- builds context-sensitive action lists for the radial menu.
 *
 * Two modes:
 *  1. Tile-based (top-down): getActionsForTile(ctx) -- legacy grid selection
 *  2. FPS entity-based: getActionsForEntity(hit, selectedTool) -- center-screen raycast
 *
 * Both return RadialAction[] consumed by <RadialActionMenu>.
 */

import type { RaycastHit } from "@/game/hooks/useRaycast";

export interface RadialAction {
  id: string;
  icon: string;
  label: string;
  /** Hex color for the button background. */
  color: string;
}

export interface TileContext {
  cellType: string;
  occupied: boolean;
  treeStage: number;
  treeWatered: boolean;
  hasNpc: boolean;
}

/**
 * Build an array of radial actions for a given tile context.
 * Returns empty array for tiles with no valid actions (e.g. path tiles).
 */
export function getActionsForTile(ctx: TileContext): RadialAction[] {
  // NPC always takes priority
  if (ctx.hasNpc) {
    return [{ id: "talk", icon: "\u{1F4AC}", label: "Talk", color: "#FFB74D" }];
  }

  // Path tiles -- no ring / no actions
  if (ctx.cellType === "path") return [];

  // Water tile -- inspect only
  if (ctx.cellType === "water") {
    return [{ id: "inspect", icon: "\u{1F4D6}", label: "Inspect", color: "#90CAF9" }];
  }

  // Rock tile
  if (ctx.cellType === "rock") {
    return [
      { id: "clear", icon: "\u26CF\uFE0F", label: "Clear", color: "#8D6E63" },
      { id: "inspect", icon: "\u{1F4D6}", label: "Inspect", color: "#90CAF9" },
    ];
  }

  // Soil tile -- occupied by tree
  if (ctx.occupied && ctx.treeStage >= 0) {
    if (ctx.treeStage <= 2) {
      // Seed / Sprout / Sapling
      const actions: RadialAction[] = [];
      actions.push({
        id: "water",
        icon: "\u{1F4A7}",
        label: ctx.treeWatered ? "Watered" : "Water",
        color: "#64B5F6",
      });
      actions.push({
        id: "dig-up",
        icon: "\u26CF\uFE0F",
        label: "Dig Up",
        color: "#8D6E63",
      });
      actions.push({
        id: "inspect",
        icon: "\u{1F4D6}",
        label: "Inspect",
        color: "#90CAF9",
      });
      return actions;
    }

    // Mature / Old Growth (stage 3-4)
    return [
      {
        id: "prune",
        icon: "\u2702\uFE0F",
        label: "Prune",
        color: "#5D4037",
      },
      {
        id: "harvest",
        icon: "\u{1FA93}",
        label: "Harvest",
        color: "#8D6E63",
      },
      {
        id: "fertilize",
        icon: "\u2728",
        label: "Fertilize",
        color: "#FFB74D",
      },
      {
        id: "inspect",
        icon: "\u{1F4D6}",
        label: "Inspect",
        color: "#90CAF9",
      },
    ];
  }

  // Empty soil -- plant
  if (ctx.cellType === "soil" && !ctx.occupied) {
    return [
      {
        id: "plant",
        icon: "\u{1F331}",
        label: "Plant",
        color: "#81C784",
      },
      {
        id: "inspect",
        icon: "\u{1F4D6}",
        label: "Inspect",
        color: "#90CAF9",
      },
    ];
  }

  return [];
}

// ---------------------------------------------------------------------------
// FPS entity context actions (center-screen raycast hit → radial actions)
// ---------------------------------------------------------------------------

/**
 * Map tool ID to the primary action label shown when targeting a tree.
 * Only tools with a meaningful tree interaction are listed.
 */
const TREE_TOOL_ACTION: Partial<Record<string, { id: string; icon: string; label: string; color: string }>> = {
  axe: { id: "harvest", icon: "\u{1FA93}", label: "Harvest", color: "#8D6E63" },
  "watering-can": { id: "water", icon: "\u{1F4A7}", label: "Water", color: "#64B5F6" },
  "pruning-shears": { id: "prune", icon: "\u2702\uFE0F", label: "Prune", color: "#5D4037" },
  "compost-bin": { id: "fertilize", icon: "\u2728", label: "Fertilize", color: "#FFB74D" },
  shovel: { id: "dig-up", icon: "\u26CF\uFE0F", label: "Dig Up", color: "#8D6E63" },
};

const ACTION_INSPECT: RadialAction = { id: "inspect", icon: "\u{1F4D6}", label: "Inspect", color: "#90CAF9" };
const ACTION_TALK: RadialAction = { id: "talk", icon: "\u{1F4AC}", label: "Talk", color: "#FFB74D" };
const ACTION_TRADE: RadialAction = { id: "trade", icon: "\u{1F4B0}", label: "Trade", color: "#A5D6A7" };
const ACTION_USE: RadialAction = { id: "use", icon: "\u{1F6E0}\uFE0F", label: "Use", color: "#CE93D8" };

/**
 * Build radial actions for a center-screen raycast hit (FPS perspective).
 *
 * - tree  → tool-primary action (harvest/water/prune/fertilize/dig) + inspect
 * - npc   → talk + trade
 * - structure → use + inspect
 *
 * @param hit          Current RaycastHit from useTargetHit()
 * @param selectedTool Currently equipped tool ID from game store
 */
export function getActionsForEntity(hit: RaycastHit, selectedTool: string): RadialAction[] {
  if (hit.entityType === "npc") {
    return [ACTION_TALK, ACTION_TRADE];
  }

  if (hit.entityType === "structure") {
    return [ACTION_USE, ACTION_INSPECT];
  }

  if (hit.entityType === "tree") {
    const toolAction = TREE_TOOL_ACTION[selectedTool];
    if (toolAction) {
      return [toolAction, ACTION_INSPECT];
    }
    // No specific tool equipped — show generic harvest + inspect
    return [
      { id: "harvest", icon: "\u{1FA93}", label: "Harvest", color: "#8D6E63" },
      ACTION_INSPECT,
    ];
  }

  return [];
}
