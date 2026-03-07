/** Tier 3 (Advanced, level 11-18) and Tier 4 (Master, level 19-25+) recipes. */
import type { Recipe } from "./types";

export const TIER_3_RECIPES: Recipe[] = [
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
    description: "Distilled essence that massively accelerates all nearby trees",
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
];

export const TIER_4_RECIPES: Recipe[] = [
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
