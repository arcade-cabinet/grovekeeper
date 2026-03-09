/**
 * Core grove achievements -- planting, harvesting, growing, collection, mastery.
 * Spec §25.1
 */

import type { Achievement } from "./types.ts";

// All 12 base species that must be planted for the collector achievement
const ALL_BASE_SPECIES = [
  "white-oak",
  "weeping-willow",
  "elder-pine",
  "cherry-blossom",
  "ghost-birch",
  "redwood",
  "flame-maple",
  "baobab",
  "silver-birch",
  "ironbark",
  "golden-apple",
  "mystic-fern",
];

export const CORE_ACHIEVEMENTS: Achievement[] = [
  // ── Planting ───────────────────────────────────
  {
    id: "first-seed",
    name: "First Seed",
    description: "Plant your first tree",
    icon: "seedling",
    category: "planting",
    check: (s) => s.treesPlanted >= 1,
  },
  {
    id: "green-thumb",
    name: "Green Thumb",
    description: "Plant 25 trees",
    icon: "hand",
    category: "planting",
    check: (s) => s.treesPlanted >= 25,
  },
  {
    id: "forest-founder",
    name: "Forest Founder",
    description: "Plant 100 trees",
    icon: "trees",
    category: "planting",
    check: (s) => s.treesPlanted >= 100,
  },
  {
    id: "grove-master",
    name: "Grove Master",
    description: "Plant 500 trees",
    icon: "crown",
    category: "planting",
    check: (s) => s.treesPlanted >= 500,
  },

  // ── Harvesting ─────────────────────────────────
  {
    id: "first-harvest",
    name: "First Harvest",
    description: "Harvest your first tree",
    icon: "axe",
    category: "harvesting",
    check: (s) => s.treesHarvested >= 1,
  },
  {
    id: "lumberjack",
    name: "Lumberjack",
    description: "Harvest 50 trees",
    icon: "axe",
    category: "harvesting",
    check: (s) => s.treesHarvested >= 50,
  },
  {
    id: "master-harvester",
    name: "Master Harvester",
    description: "Harvest 200 trees",
    icon: "trophy",
    category: "harvesting",
    check: (s) => s.treesHarvested >= 200,
  },

  // ── Growing ────────────────────────────────────
  {
    id: "patient-keeper",
    name: "Patient Keeper",
    description: "Grow a tree to Old Growth (stage 4)",
    icon: "hourglass",
    category: "growing",
    check: (s) => s.maxStageReached >= 4,
  },
  {
    id: "ancient-grove",
    name: "Ancient Grove",
    description: "Have 10 Old Growth trees at once",
    icon: "landmark",
    category: "growing",
    check: (s) => s.oldGrowthCount >= 10,
  },
  {
    id: "watering-wizard",
    name: "Watering Wizard",
    description: "Water 100 trees",
    icon: "droplets",
    category: "growing",
    check: (s) => s.treesWatered >= 100,
  },

  // ── Collection ─────────────────────────────────
  {
    id: "timber-baron",
    name: "Timber Baron",
    description: "Collect 500 timber",
    icon: "warehouse",
    category: "collection",
    check: (s) => s.totalTimber >= 500,
  },
  {
    id: "sap-tapper",
    name: "Sap Tapper",
    description: "Collect 200 sap",
    icon: "droplet",
    category: "collection",
    check: (s) => s.totalSap >= 200,
  },
  {
    id: "fruit-gatherer",
    name: "Fruit Gatherer",
    description: "Collect 200 fruit",
    icon: "apple",
    category: "collection",
    check: (s) => s.totalFruit >= 200,
  },
  {
    id: "acorn-hoarder",
    name: "Acorn Hoarder",
    description: "Collect 300 acorns",
    icon: "nut",
    category: "collection",
    check: (s) => s.totalAcorns >= 300,
  },

  // ── Mastery ────────────────────────────────────
  {
    id: "species-collector",
    name: "Species Collector",
    description: "Plant all 12 base species",
    icon: "book",
    category: "mastery",
    check: (s) => ALL_BASE_SPECIES.every((species) => s.speciesPlanted.includes(species)),
  },
  {
    id: "level-5",
    name: "Apprentice Keeper",
    description: "Reach level 5",
    icon: "star",
    category: "mastery",
    check: (s) => s.level >= 5,
  },
  {
    id: "level-10",
    name: "Journeyman Keeper",
    description: "Reach level 10",
    icon: "star",
    category: "mastery",
    check: (s) => s.level >= 10,
  },
  {
    id: "level-25",
    name: "Grand Keeper",
    description: "Reach level 25",
    icon: "medal",
    category: "mastery",
    check: (s) => s.level >= 25,
  },
  {
    id: "first-prestige",
    name: "Rebirth",
    description: "Complete your first prestige",
    icon: "refresh-cw",
    category: "mastery",
    check: (s) => s.prestigeCount >= 1,
  },
  {
    id: "grid-master",
    name: "Grid Master",
    description: "Expand your grid to 32x32",
    icon: "maximize",
    category: "mastery",
    check: (s) => s.currentGridSize >= 32,
  },
];
