/** Goal pools: growth and seasonal goals. */
import type { GoalTemplate } from "./types";

export const GROWTH_GOALS: GoalTemplate[] = [
  {
    id: "grow_sprout",
    category: "growth",
    name: "New Beginnings",
    description: "Grow a seed to sprout stage",
    targetType: "sprouts_grown",
    targetAmount: 1,
    rewards: { xp: { min: 10, max: 15 } },
    difficulty: "easy",
    repeatable: true,
  },
  {
    id: "grow_sapling",
    category: "growth",
    name: "Steady Growth",
    description: "Grow a tree to sapling stage",
    targetType: "saplings_grown",
    targetAmount: 1,
    rewards: {
      xp: { min: 20, max: 30 },
      resources: [{ type: "timber", amount: 3 }],
    },
    difficulty: "easy",
    repeatable: true,
  },
  {
    id: "grow_mature_5",
    category: "growth",
    name: "Patient Cultivator",
    description: "Grow 5 trees to maturity",
    targetType: "mature_trees_grown",
    targetAmount: 5,
    rewards: {
      xp: { min: 100, max: 150 },
      resources: [
        { type: "timber", amount: 15 },
        { type: "fruit", amount: 8 },
      ],
    },
    difficulty: "hard",
    repeatable: true,
  },
  {
    id: "grow_ancient",
    category: "growth",
    name: "Elder Tree",
    description: "Grow a tree to ancient stage",
    targetType: "ancient_trees_grown",
    targetAmount: 1,
    rewards: {
      xp: { min: 200, max: 300 },
      resources: [
        { type: "timber", amount: 20 },
        { type: "acorns", amount: 15 },
      ],
    },
    difficulty: "epic",
    repeatable: true,
  },
];

export const SEASONAL_GOALS: GoalTemplate[] = [
  {
    id: "spring_planting",
    category: "seasonal",
    name: "Spring Awakening",
    description: "Plant 5 trees during spring",
    targetType: "trees_planted_spring",
    targetAmount: 5,
    seasonRequired: "spring",
    rewards: {
      xp: { min: 50, max: 75 },
      seeds: [{ speciesId: "white-oak", amount: 5 }],
    },
    difficulty: "medium",
    repeatable: true,
  },
  {
    id: "summer_growth",
    category: "seasonal",
    name: "Summer Bloom",
    description: "Have 10 trees growing during summer",
    targetType: "trees_during_summer",
    targetAmount: 10,
    seasonRequired: "summer",
    rewards: {
      xp: { min: 75, max: 100 },
      resources: [{ type: "sap", amount: 10 }],
    },
    difficulty: "medium",
    repeatable: true,
  },
  {
    id: "autumn_harvest",
    category: "seasonal",
    name: "Autumn Bounty",
    description: "Harvest 5 trees during autumn",
    targetType: "trees_harvested_autumn",
    targetAmount: 5,
    seasonRequired: "autumn",
    rewards: {
      xp: { min: 100, max: 125 },
      resources: [
        { type: "fruit", amount: 10 },
        { type: "acorns", amount: 8 },
      ],
    },
    difficulty: "hard",
    repeatable: true,
  },
  {
    id: "winter_survive",
    category: "seasonal",
    name: "Winter Resilience",
    description: "Keep 5 trees alive through winter",
    targetType: "trees_survived_winter",
    targetAmount: 5,
    seasonRequired: "winter",
    rewards: {
      xp: { min: 150, max: 200 },
      resources: [
        { type: "timber", amount: 15 },
        { type: "sap", amount: 10 },
      ],
    },
    difficulty: "hard",
    repeatable: true,
  },
];
