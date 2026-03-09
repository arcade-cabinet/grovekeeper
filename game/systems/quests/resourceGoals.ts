/** Goal pools: economic, mastery, collection, and exploration goals. */
import type { GoalTemplate } from "./types.ts";

export const ECONOMIC_GOALS: GoalTemplate[] = [
  {
    id: "gather_timber_25",
    category: "economic",
    name: "Timber Stockpile",
    description: "Gather 25 timber",
    targetType: "timber_earned",
    targetAmount: 25,
    rewards: {
      xp: { min: 20, max: 30 },
      resources: [{ type: "sap", amount: 5 }],
    },
    difficulty: "easy",
    repeatable: true,
  },
  {
    id: "gather_mixed_50",
    category: "economic",
    name: "Resourceful",
    description: "Gather 50 total resources",
    targetType: "total_resources_earned",
    targetAmount: 50,
    rewards: {
      xp: { min: 50, max: 75 },
      resources: [{ type: "acorns", amount: 8 }],
    },
    difficulty: "medium",
    repeatable: true,
  },
  {
    id: "gather_all_types",
    category: "economic",
    name: "Diversified Holdings",
    description: "Collect at least 10 of each resource type",
    targetType: "all_resources_10",
    targetAmount: 1,
    rewards: {
      xp: { min: 100, max: 150 },
      resources: [
        { type: "timber", amount: 10 },
        { type: "sap", amount: 10 },
        { type: "fruit", amount: 10 },
        { type: "acorns", amount: 10 },
      ],
    },
    difficulty: "hard",
    repeatable: true,
  },
];

export const MASTERY_GOALS: GoalTemplate[] = [
  {
    id: "level_5",
    category: "mastery",
    name: "Apprentice Forester",
    description: "Reach level 5",
    targetType: "player_level",
    targetAmount: 5,
    rewards: {
      xp: { min: 0, max: 0 },
      seeds: [{ speciesId: "elder-pine", amount: 3 }],
      unlocks: ["pine"],
    },
    difficulty: "medium",
    repeatable: false,
  },
  {
    id: "level_10",
    category: "mastery",
    name: "Journeyman Forester",
    description: "Reach level 10",
    targetType: "player_level",
    targetAmount: 10,
    rewards: {
      xp: { min: 0, max: 0 },
      resources: [
        { type: "timber", amount: 25 },
        { type: "sap", amount: 15 },
      ],
      unlocks: ["maple"],
    },
    difficulty: "hard",
    repeatable: false,
  },
  {
    id: "level_20",
    category: "mastery",
    name: "Master Forester",
    description: "Reach level 20",
    targetType: "player_level",
    targetAmount: 20,
    rewards: {
      xp: { min: 0, max: 0 },
      resources: [
        { type: "timber", amount: 50 },
        { type: "sap", amount: 30 },
        { type: "fruit", amount: 20 },
        { type: "acorns", amount: 20 },
      ],
      unlocks: ["cherry"],
    },
    difficulty: "epic",
    repeatable: false,
  },
  {
    id: "unlock_species_4",
    category: "mastery",
    name: "Collector",
    description: "Unlock 4 tree species",
    targetType: "species_unlocked",
    targetAmount: 4,
    rewards: {
      xp: { min: 75, max: 100 },
      seeds: [{ speciesId: "white-oak", amount: 5 }],
    },
    difficulty: "medium",
    repeatable: false,
  },
];

export const COLLECTION_GOALS: GoalTemplate[] = [
  {
    id: "collect_timber_50",
    category: "collection",
    name: "Timber Hoard",
    description: "Collect 50 timber",
    targetType: "timber_collected",
    targetAmount: 50,
    rewards: {
      xp: { min: 40, max: 60 },
      resources: [{ type: "sap", amount: 8 }],
    },
    difficulty: "medium",
    repeatable: true,
  },
  {
    id: "collect_sap_30",
    category: "collection",
    name: "Sap Tapper",
    description: "Collect 30 sap",
    targetType: "sap_collected",
    targetAmount: 30,
    rewards: {
      xp: { min: 40, max: 60 },
      resources: [{ type: "fruit", amount: 5 }],
    },
    difficulty: "medium",
    repeatable: true,
  },
  {
    id: "collect_fruit_20",
    category: "collection",
    name: "Fruit Picker",
    description: "Collect 20 fruit",
    targetType: "fruit_collected",
    targetAmount: 20,
    rewards: {
      xp: { min: 50, max: 70 },
      resources: [{ type: "acorns", amount: 5 }],
    },
    difficulty: "medium",
    repeatable: true,
  },
  {
    id: "collect_acorns_15",
    category: "collection",
    name: "Acorn Squirrel",
    description: "Collect 15 acorns",
    targetType: "acorns_collected",
    targetAmount: 15,
    rewards: {
      xp: { min: 50, max: 70 },
      seeds: [{ speciesId: "white-oak", amount: 3 }],
    },
    difficulty: "medium",
    repeatable: true,
  },
];

export const EXPLORATION_GOALS: GoalTemplate[] = [
  {
    id: "visit_non_starting",
    category: "exploration",
    name: "Beyond the Grove",
    description: "Visit a zone other than your starting grove",
    targetType: "zones_visited_non_starting",
    targetAmount: 1,
    rewards: {
      xp: { min: 30, max: 50 },
      resources: [{ type: "timber", amount: 5 }],
    },
    difficulty: "easy",
    repeatable: false,
  },
  {
    id: "visit_3_zones",
    category: "exploration",
    name: "Wanderer",
    description: "Visit 3 different zones",
    targetType: "zones_visited",
    targetAmount: 3,
    rewards: {
      xp: { min: 60, max: 80 },
      resources: [
        { type: "sap", amount: 5 },
        { type: "fruit", amount: 3 },
      ],
    },
    difficulty: "medium",
    repeatable: false,
  },
  {
    id: "visit_wild_forest",
    category: "exploration",
    name: "Into the Wild",
    description: "Visit a wild forest zone",
    targetType: "wild_forest_visited",
    targetAmount: 1,
    zoneType: "forest",
    rewards: {
      xp: { min: 50, max: 75 },
      seeds: [{ speciesId: "elder-pine", amount: 2 }],
    },
    difficulty: "medium",
    repeatable: false,
  },
  {
    id: "visit_settlement",
    category: "exploration",
    name: "Civilization",
    description: "Visit a settlement",
    targetType: "settlement_visited",
    targetAmount: 1,
    zoneType: "settlement",
    rewards: {
      xp: { min: 75, max: 100 },
      resources: [
        { type: "timber", amount: 10 },
        { type: "acorns", amount: 5 },
      ],
    },
    difficulty: "hard",
    repeatable: false,
  },
];
