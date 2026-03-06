/**
 * Resource conversion recipes.
 * 24 recipes across 4 progression tiers.
 */
import type { ResourceType } from "@/game/config/resources";

// ---------------------------------------------------------------------------
// Output types
// ---------------------------------------------------------------------------

export interface ResourceOutput {
  kind: "resource";
  type: ResourceType;
  amount: number;
}

export interface SeedOutput {
  kind: "seed";
  speciesPool: string[];
  amount: number;
}

export interface EffectOutput {
  kind: "effect";
  effect:
    | "growth_boost"
    | "harvest_boost"
    | "stamina_restore"
    | "weather_protection"
    | "rain_call"
    | "xp_multiplier"
    | "all_resources_double"
    | "permanent_growth_boost";
  magnitude: number;
  durationSec: number;
}

export interface XpOutput {
  kind: "xp";
  amount: number;
}

export type RecipeOutput =
  | ResourceOutput
  | SeedOutput
  | EffectOutput
  | XpOutput;

// ---------------------------------------------------------------------------
// Recipe tier
// ---------------------------------------------------------------------------

export type RecipeTier = 1 | 2 | 3 | 4;

export const TIER_LABELS: Record<RecipeTier, string> = {
  1: "Basic",
  2: "Intermediate",
  3: "Advanced",
  4: "Master",
};

// ---------------------------------------------------------------------------
// Recipe interface
// ---------------------------------------------------------------------------

export interface Recipe {
  id: string;
  name: string;
  description: string;
  tier: RecipeTier;
  requiredLevel: number;
  inputs: { type: ResourceType; amount: number }[];
  outputs: RecipeOutput[];
  craftTime?: number;
  requiredStructure?: string;
}

// ---------------------------------------------------------------------------
// Recipe catalog -- 24 recipes
// ---------------------------------------------------------------------------

export const RECIPES: Recipe[] = [
  // TIER 1 -- Basic (Level 1-5)
  {
    id: "refine-timber",
    name: "Wooden Plank",
    description: "Process raw timber into premium sap",
    tier: 1,
    requiredLevel: 1,
    inputs: [{ type: "timber", amount: 8 }],
    outputs: [{ kind: "resource", type: "sap", amount: 4 }],
  },
  {
    id: "simple-fertilizer",
    name: "Simple Fertilizer",
    description: "Mix fruit and acorns into a mild growth booster",
    tier: 1,
    requiredLevel: 2,
    inputs: [
      { type: "fruit", amount: 5 },
      { type: "acorns", amount: 3 },
    ],
    outputs: [
      {
        kind: "effect",
        effect: "growth_boost",
        magnitude: 0.15,
        durationSec: 120,
      },
    ],
  },
  {
    id: "seed-pouch",
    name: "Seed Pouch",
    description: "Crack open acorns to find viable seeds",
    tier: 1,
    requiredLevel: 2,
    inputs: [{ type: "acorns", amount: 10 }],
    outputs: [
      {
        kind: "seed",
        speciesPool: ["white-oak", "elder-pine", "weeping-willow"],
        amount: 3,
      },
    ],
  },
  {
    id: "basic-tonic",
    name: "Basic Tonic",
    description: "Brew a restorative tonic from sap and fruit",
    tier: 1,
    requiredLevel: 3,
    inputs: [
      { type: "sap", amount: 5 },
      { type: "fruit", amount: 3 },
    ],
    outputs: [
      {
        kind: "effect",
        effect: "stamina_restore",
        magnitude: 30,
        durationSec: 0,
      },
    ],
  },
  {
    id: "bark-mulch",
    name: "Bark Mulch",
    description: "Shred timber and sap into nutrient-rich mulch",
    tier: 1,
    requiredLevel: 4,
    inputs: [
      { type: "timber", amount: 6 },
      { type: "sap", amount: 4 },
    ],
    outputs: [
      {
        kind: "effect",
        effect: "growth_boost",
        magnitude: 0.1,
        durationSec: 180,
      },
    ],
  },
  {
    id: "fruit-preserve",
    name: "Fruit Preserve",
    description: "Preserve excess fruit into storable acorns",
    tier: 1,
    requiredLevel: 5,
    inputs: [{ type: "fruit", amount: 8 }],
    outputs: [{ kind: "resource", type: "acorns", amount: 12 }],
  },

  // TIER 2 -- Intermediate (Level 6-10)
  {
    id: "sturdy-plank",
    name: "Sturdy Plank",
    description: "Craft durable planks and gain crafting experience",
    tier: 2,
    requiredLevel: 6,
    inputs: [
      { type: "timber", amount: 15 },
      { type: "sap", amount: 5 },
    ],
    outputs: [
      { kind: "resource", type: "sap", amount: 8 },
      { kind: "xp", amount: 25 },
    ],
  },
  {
    id: "growth-elixir",
    name: "Growth Elixir",
    description: "A potent elixir that dramatically accelerates growth",
    tier: 2,
    requiredLevel: 7,
    inputs: [
      { type: "sap", amount: 10 },
      { type: "fruit", amount: 8 },
    ],
    outputs: [
      {
        kind: "effect",
        effect: "growth_boost",
        magnitude: 0.35,
        durationSec: 180,
      },
    ],
  },
  {
    id: "weather-charm",
    name: "Weather Charm",
    description: "An acorn-and-sap charm that calls the rain",
    tier: 2,
    requiredLevel: 7,
    inputs: [
      { type: "acorns", amount: 12 },
      { type: "sap", amount: 8 },
    ],
    outputs: [
      { kind: "effect", effect: "rain_call", magnitude: 1, durationSec: 300 },
    ],
  },
  {
    id: "pruning-oil",
    name: "Pruning Oil",
    description: "Oil your tools for a temporary harvest yield boost",
    tier: 2,
    requiredLevel: 8,
    inputs: [
      { type: "sap", amount: 8 },
      { type: "timber", amount: 5 },
    ],
    outputs: [
      {
        kind: "effect",
        effect: "harvest_boost",
        magnitude: 0.25,
        durationSec: 240,
      },
    ],
  },
  {
    id: "seed-bundle",
    name: "Seed Bundle",
    description: "A curated bundle of uncommon seeds",
    tier: 2,
    requiredLevel: 9,
    inputs: [
      { type: "acorns", amount: 15 },
      { type: "fruit", amount: 10 },
    ],
    outputs: [
      {
        kind: "seed",
        speciesPool: ["cherry-blossom", "ghost-birch", "silver-birch"],
        amount: 5,
      },
    ],
  },
  {
    id: "compost-heap",
    name: "Compost Heap",
    description: "Decompose timber and fruit into slow-release growth fuel",
    tier: 2,
    requiredLevel: 10,
    inputs: [
      { type: "timber", amount: 10 },
      { type: "fruit", amount: 10 },
    ],
    outputs: [
      {
        kind: "effect",
        effect: "growth_boost",
        magnitude: 0.2,
        durationSec: 600,
      },
    ],
    requiredStructure: "trading-post",
  },

  // TIER 3 -- Advanced (Level 11-18)
  {
    id: "hardwood-beam",
    name: "Hardwood Beam",
    description: "Premium building material refined from old-growth timber",
    tier: 3,
    requiredLevel: 11,
    inputs: [
      { type: "timber", amount: 25 },
      { type: "sap", amount: 10 },
    ],
    outputs: [{ kind: "resource", type: "acorns", amount: 15 }],
    requiredStructure: "trading-post",
  },
  {
    id: "essence-of-growth",
    name: "Essence of Growth",
    description:
      "Distilled essence that massively accelerates all nearby trees",
    tier: 3,
    requiredLevel: 13,
    inputs: [
      { type: "sap", amount: 20 },
      { type: "fruit", amount: 15 },
      { type: "acorns", amount: 10 },
    ],
    outputs: [
      {
        kind: "effect",
        effect: "growth_boost",
        magnitude: 0.5,
        durationSec: 300,
      },
    ],
  },
  {
    id: "storm-shield",
    name: "Storm Shield",
    description: "Protect your grove from the next windstorm",
    tier: 3,
    requiredLevel: 14,
    inputs: [
      { type: "acorns", amount: 20 },
      { type: "timber", amount: 15 },
    ],
    outputs: [
      {
        kind: "effect",
        effect: "weather_protection",
        magnitude: 1,
        durationSec: 600,
      },
    ],
  },
  {
    id: "ancient-fertilizer",
    name: "Ancient Fertilizer",
    description: "A legendary fertilizer using all three organic ingredients",
    tier: 3,
    requiredLevel: 15,
    inputs: [
      { type: "sap", amount: 15 },
      { type: "fruit", amount: 15 },
      { type: "timber", amount: 15 },
    ],
    outputs: [
      {
        kind: "effect",
        effect: "growth_boost",
        magnitude: 0.6,
        durationSec: 420,
      },
    ],
  },
  {
    id: "rare-seed-kit",
    name: "Rare Seed Kit",
    description: "A kit containing seeds of rare and exotic species",
    tier: 3,
    requiredLevel: 16,
    inputs: [
      { type: "acorns", amount: 25 },
      { type: "fruit", amount: 20 },
    ],
    outputs: [
      {
        kind: "seed",
        speciesPool: ["redwood", "flame-maple", "ironbark"],
        amount: 3,
      },
    ],
  },
  {
    id: "master-tonic",
    name: "Master Tonic",
    description: "A master-brewed tonic that fully restores stamina",
    tier: 3,
    requiredLevel: 18,
    inputs: [
      { type: "sap", amount: 15 },
      { type: "fruit", amount: 10 },
      { type: "timber", amount: 10 },
    ],
    outputs: [
      {
        kind: "effect",
        effect: "stamina_restore",
        magnitude: 100,
        durationSec: 0,
      },
    ],
  },

  // TIER 4 -- Master (Level 19-25+)
  {
    id: "worldtree-sap",
    name: "Worldtree Sap",
    description: "Legendary sap distilled for prestige-tier crafting",
    tier: 4,
    requiredLevel: 19,
    inputs: [
      { type: "sap", amount: 40 },
      { type: "timber", amount: 30 },
      { type: "fruit", amount: 20 },
    ],
    outputs: [
      { kind: "resource", type: "acorns", amount: 50 },
      { kind: "xp", amount: 100 },
    ],
  },
  {
    id: "eternal-fertilizer",
    name: "Eternal Fertilizer",
    description: "Apply a permanent growth boost to a single tree",
    tier: 4,
    requiredLevel: 20,
    inputs: [
      { type: "sap", amount: 35 },
      { type: "fruit", amount: 25 },
      { type: "acorns", amount: 25 },
    ],
    outputs: [
      {
        kind: "effect",
        effect: "permanent_growth_boost",
        magnitude: 0.25,
        durationSec: -1,
      },
    ],
  },
  {
    id: "forest-heart",
    name: "Forest Heart",
    description: "A crystallized heart of the forest for structure upgrades",
    tier: 4,
    requiredLevel: 21,
    inputs: [
      { type: "timber", amount: 50 },
      { type: "sap", amount: 30 },
      { type: "acorns", amount: 20 },
    ],
    outputs: [
      { kind: "resource", type: "timber", amount: 25 },
      { kind: "resource", type: "sap", amount: 25 },
      { kind: "xp", amount: 150 },
    ],
  },
  {
    id: "alchemists-brew",
    name: "Alchemist's Brew",
    description: "Double all resource yields for your next harvest cycle",
    tier: 4,
    requiredLevel: 22,
    inputs: [
      { type: "sap", amount: 30 },
      { type: "fruit", amount: 25 },
      { type: "timber", amount: 15 },
      { type: "acorns", amount: 15 },
    ],
    outputs: [
      {
        kind: "effect",
        effect: "all_resources_double",
        magnitude: 2,
        durationSec: 300,
      },
    ],
  },
  {
    id: "ancient-seed",
    name: "Ancient Seed",
    description: "Unearth a seed of a prestige-tier tree species",
    tier: 4,
    requiredLevel: 23,
    inputs: [
      { type: "acorns", amount: 40 },
      { type: "fruit", amount: 30 },
      { type: "sap", amount: 20 },
    ],
    outputs: [
      {
        kind: "seed",
        speciesPool: ["crystal-oak", "moonwood-ash", "worldtree"],
        amount: 1,
      },
    ],
  },
  {
    id: "grove-blessing",
    name: "Grove Blessing",
    description: "Bless the entire grove with an XP multiplier for a full day",
    tier: 4,
    requiredLevel: 25,
    inputs: [
      { type: "timber", amount: 25 },
      { type: "sap", amount: 25 },
      { type: "fruit", amount: 25 },
      { type: "acorns", amount: 25 },
    ],
    outputs: [
      {
        kind: "effect",
        effect: "xp_multiplier",
        magnitude: 2,
        durationSec: 1440,
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// Query helpers
// ---------------------------------------------------------------------------

export function getRecipes(): Recipe[] {
  return [...RECIPES];
}

export function getRecipeById(id: string): Recipe | undefined {
  return RECIPES.find((r) => r.id === id);
}

export function getRecipesByTier(tier: RecipeTier): Recipe[] {
  return RECIPES.filter((r) => r.tier === tier);
}

export function getRecipesForLevel(level: number): Recipe[] {
  return RECIPES.filter((r) => r.requiredLevel <= level);
}

export function canCraft(
  recipe: Recipe,
  resources: Record<ResourceType, number>,
): boolean {
  return recipe.inputs.every(
    (input) => (resources[input.type] ?? 0) >= input.amount,
  );
}

export function calculateCraftCost(
  recipe: Recipe,
): Partial<Record<ResourceType, number>> {
  const cost: Partial<Record<ResourceType, number>> = {};
  for (const input of recipe.inputs) {
    cost[input.type] = (cost[input.type] ?? 0) + input.amount;
  }
  return cost;
}
