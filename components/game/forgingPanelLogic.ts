/**
 * ForgingPanel pure logic -- builds display data for smelting recipes
 * and tool upgrade paths. Spec §22.2
 *
 * No React, no RN, no side effects. Consumed by ForgingPanel.tsx and tests.
 */

import toolsData from "@/config/game/tools.json" with { type: "json" };
import type { ToolTier } from "@/game/ecs/components/items";
import type { SmeltRecipe, ToolTierUpgrade } from "@/game/systems/forging";
import {
  canSmelt,
  canUpgradeTool,
  getSmeltRecipes,
  getToolTierUpgrade,
} from "@/game/systems/forging";

// ---------------------------------------------------------------------------
// Tool config helpers
// ---------------------------------------------------------------------------

interface ToolDef {
  id: string;
  name: string;
  maxDurability: number;
}

const TOOLS_WITH_DURABILITY: ToolDef[] = (toolsData as ToolDef[]).filter(
  (t) => t.maxDurability > 0,
);

// ---------------------------------------------------------------------------
// Types: Smelting display data
// ---------------------------------------------------------------------------

export type ForgingTab = "smelt" | "upgrade";

export interface SmeltRecipeRow {
  recipe: SmeltRecipe;
  /** True when the player has enough resources. */
  canAfford: boolean;
  /** Inputs formatted for display: e.g. [{ label: "Ore", amount: 3, have: 5 }] */
  inputRows: { label: string; amount: number; have: number; enough: boolean }[];
  /** Output formatted for display. */
  outputLabel: string;
  /** Smelt time in seconds. */
  timeSec: number;
}

/** Build display rows for every smelt recipe. */
export function buildSmeltRows(inventory: Record<string, number>): SmeltRecipeRow[] {
  return getSmeltRecipes().map((recipe) => {
    const inputRows = Object.entries(recipe.inputs).map(([resource, amount]) => {
      const have = inventory[resource] ?? 0;
      return {
        label: capitalize(resource),
        amount,
        have,
        enough: have >= amount,
      };
    });
    return {
      recipe,
      canAfford: canSmelt(recipe, inventory),
      inputRows,
      outputLabel: `${recipe.output.amount}x ${recipe.name}`,
      timeSec: recipe.smeltTimeSec,
    };
  });
}

// ---------------------------------------------------------------------------
// Types: Tool upgrade display data
// ---------------------------------------------------------------------------

export interface ToolUpgradeRow {
  toolId: string;
  toolName: string;
  currentTier: ToolTier;
  currentTierLabel: string;
  /** null when already at max tier. */
  upgrade: ToolTierUpgrade | null;
  nextTierLabel: string | null;
  canAfford: boolean;
  /** Cost rows formatted for display (empty if at max). */
  costRows: { label: string; amount: number; have: number; enough: boolean }[];
}

const TIER_LABELS: Record<ToolTier, string> = {
  basic: "Basic",
  iron: "Iron",
  grovekeeper: "Grovekeeper",
};

/** Build display rows for every upgradeable tool. */
export function buildUpgradeRows(
  toolUpgrades: Record<string, number>,
  inventory: Record<string, number>,
): ToolUpgradeRow[] {
  return TOOLS_WITH_DURABILITY.map((tool) => {
    const tierNum = toolUpgrades[tool.id] ?? 0;
    const currentTier = tierNumToTier(tierNum);
    const upgrade = getToolTierUpgrade(currentTier);
    const canAfford = upgrade ? canUpgradeTool(currentTier, inventory) : false;
    const costRows = upgrade
      ? Object.entries(upgrade.cost).map(([resource, amount]) => {
          const have = inventory[resource] ?? 0;
          return {
            label: capitalize(resource.replace(/-/g, " ")),
            amount,
            have,
            enough: have >= amount,
          };
        })
      : [];

    return {
      toolId: tool.id,
      toolName: tool.name,
      currentTier,
      currentTierLabel: TIER_LABELS[currentTier],
      upgrade,
      nextTierLabel: upgrade ? TIER_LABELS[upgrade.toTier] : null,
      canAfford,
      costRows,
    };
  });
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function capitalize(s: string): string {
  if (s.length === 0) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Map numeric tier stored in gameState.toolUpgrades to ToolTier union. */
export function tierNumToTier(n: number): ToolTier {
  if (n <= 0) return "basic";
  if (n === 1) return "iron";
  return "grovekeeper";
}

/** Format seconds to a human-readable duration label (e.g. "20s"). */
export function formatSmeltTime(sec: number): string {
  if (sec < 60) return `${sec}s`;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}
