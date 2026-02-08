/**
 * radialActions — builds context-sensitive action lists for the radial menu.
 *
 * Pure function: given tile state, returns the actions that should appear
 * in the radial menu. Replaces getTreeActions / getNpcActions / getSoilActions
 * from InteractionMenu.tsx.
 */

export interface RadialAction {
  id: string;
  icon: string;
  label: string;
  /** Color class for the button background. */
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

  // Path tiles — no ring / no actions
  if (ctx.cellType === "path") return [];

  // Water tile — inspect only
  if (ctx.cellType === "water") {
    return [
      { id: "inspect", icon: "\u{1F4D6}", label: "Inspect", color: "#90CAF9" },
    ];
  }

  // Rock tile
  if (ctx.cellType === "rock") {
    return [
      { id: "clear", icon: "\u26CF\uFE0F", label: "Clear", color: "#8D6E63" },
      { id: "inspect", icon: "\u{1F4D6}", label: "Inspect", color: "#90CAF9" },
    ];
  }

  // Soil tile — occupied by tree
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

  // Empty soil — plant
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
