/** Tier 1 (Basic, level 1-5) and Tier 2 (Intermediate, level 6-10) recipes. */
import type { Recipe } from "./types";

export const TIER_1_RECIPES: Recipe[] = [
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
];

export const TIER_2_RECIPES: Recipe[] = [
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
    outputs: [{ kind: "effect", effect: "rain_call", magnitude: 1, durationSec: 300 }],
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
];
