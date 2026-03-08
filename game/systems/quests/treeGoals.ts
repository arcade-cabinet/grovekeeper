/** Goal pools: planting, harvesting, watering goals. */
import type { GoalTemplate } from "./types.ts";

export const PLANTING_GOALS: GoalTemplate[] = [
  {
    id: "plant_any_1",
    category: "planting",
    name: "First Seed",
    description: "Plant your first tree",
    targetType: "trees_planted",
    targetAmount: 1,
    rewards: {
      xp: { min: 10, max: 15 },
      resources: [{ type: "timber", amount: 2 }],
    },
    difficulty: "easy",
    repeatable: false,
  },
  {
    id: "plant_any_5",
    category: "planting",
    name: "Growing Grove",
    description: "Plant 5 trees",
    targetType: "trees_planted",
    targetAmount: 5,
    rewards: {
      xp: { min: 25, max: 40 },
      resources: [{ type: "timber", amount: 5 }],
    },
    difficulty: "easy",
    repeatable: true,
  },
  {
    id: "plant_any_10",
    category: "planting",
    name: "Forest Starter",
    description: "Plant 10 trees",
    targetType: "trees_planted",
    targetAmount: 10,
    rewards: {
      xp: { min: 50, max: 75 },
      resources: [
        { type: "timber", amount: 10 },
        { type: "sap", amount: 5 },
      ],
    },
    difficulty: "medium",
    repeatable: true,
  },
  {
    id: "plant_oak_3",
    category: "planting",
    name: "Oak Grove",
    description: "Plant 3 oak trees",
    targetType: "oak_planted",
    targetAmount: 3,
    rewards: {
      xp: { min: 30, max: 45 },
      seeds: [{ speciesId: "white-oak", amount: 3 }],
    },
    difficulty: "easy",
    repeatable: true,
  },
  {
    id: "plant_birch_3",
    category: "planting",
    name: "White Forest",
    description: "Plant 3 birch trees",
    targetType: "birch_planted",
    targetAmount: 3,
    rewards: {
      xp: { min: 25, max: 40 },
      resources: [{ type: "sap", amount: 5 }],
    },
    difficulty: "easy",
    repeatable: true,
  },
  {
    id: "plant_pine_3",
    category: "planting",
    name: "Evergreen Stand",
    description: "Plant 3 pine trees",
    targetType: "pine_planted",
    targetAmount: 3,
    rewards: {
      xp: { min: 40, max: 55 },
      resources: [
        { type: "timber", amount: 5 },
        { type: "sap", amount: 3 },
      ],
    },
    difficulty: "medium",
    repeatable: true,
  },
  {
    id: "plant_variety_3",
    category: "planting",
    name: "Biodiversity",
    description: "Plant 3 different species",
    targetType: "unique_species_planted",
    targetAmount: 3,
    rewards: {
      xp: { min: 45, max: 60 },
      resources: [{ type: "acorns", amount: 5 }],
    },
    difficulty: "medium",
    repeatable: true,
  },
  {
    id: "plant_row",
    category: "planting",
    name: "Perfect Row",
    description: "Plant 5 trees in a row",
    targetType: "trees_in_row",
    targetAmount: 5,
    rewards: {
      xp: { min: 75, max: 100 },
      resources: [
        { type: "timber", amount: 10 },
        { type: "acorns", amount: 5 },
      ],
    },
    difficulty: "hard",
    repeatable: true,
  },
];

export const HARVESTING_GOALS: GoalTemplate[] = [
  {
    id: "harvest_1",
    category: "harvesting",
    name: "First Harvest",
    description: "Harvest your first mature tree",
    targetType: "trees_harvested",
    targetAmount: 1,
    rewards: {
      xp: { min: 25, max: 35 },
      resources: [{ type: "timber", amount: 5 }],
    },
    difficulty: "easy",
    repeatable: false,
  },
  {
    id: "harvest_5",
    category: "harvesting",
    name: "Lumber Time",
    description: "Harvest 5 mature trees",
    targetType: "trees_harvested",
    targetAmount: 5,
    rewards: {
      xp: { min: 50, max: 75 },
      resources: [
        { type: "timber", amount: 10 },
        { type: "sap", amount: 5 },
      ],
    },
    difficulty: "medium",
    repeatable: true,
  },
  {
    id: "harvest_ancient",
    category: "harvesting",
    name: "Ancient Wisdom",
    description: "Harvest an ancient tree",
    targetType: "ancient_harvested",
    targetAmount: 1,
    rewards: {
      xp: { min: 100, max: 150 },
      resources: [
        { type: "timber", amount: 15 },
        { type: "acorns", amount: 10 },
      ],
    },
    difficulty: "hard",
    repeatable: true,
  },
];

export const WATERING_GOALS: GoalTemplate[] = [
  {
    id: "water_5",
    category: "watering",
    name: "Tender Care",
    description: "Water 5 trees",
    targetType: "trees_watered",
    targetAmount: 5,
    rewards: {
      xp: { min: 15, max: 25 },
      resources: [{ type: "sap", amount: 3 }],
    },
    difficulty: "easy",
    repeatable: true,
  },
  {
    id: "water_all",
    category: "watering",
    name: "Full Service",
    description: "Water all trees in your grove",
    targetType: "grove_fully_watered",
    targetAmount: 1,
    rewards: {
      xp: { min: 30, max: 45 },
      resources: [
        { type: "sap", amount: 5 },
        { type: "fruit", amount: 3 },
      ],
    },
    difficulty: "medium",
    repeatable: true,
  },
  {
    id: "water_streak",
    category: "watering",
    name: "Diligent Gardener",
    description: "Water trees for 3 days in a row",
    targetType: "watering_streak_days",
    targetAmount: 3,
    rewards: {
      xp: { min: 50, max: 75 },
      resources: [{ type: "sap", amount: 8 }],
    },
    difficulty: "medium",
    repeatable: true,
  },
];
