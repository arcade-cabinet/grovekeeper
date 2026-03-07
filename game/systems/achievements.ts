/**
 * Achievements -- 35 achievements (15 base + 20 expansion), pure checker function.
 * NO external imports. Self-contained with ALL_BASE_SPECIES constant.
 */

// ── Types ────────────────────────────────────────────────────────────────────

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  category:
    | "planting"
    | "harvesting"
    | "growing"
    | "collection"
    | "mastery"
    | "social"
    | "exploration"
    | "seasonal"
    | "economy";
  check: (stats: PlayerStats) => boolean;
}

export interface PlayerStats {
  treesPlanted: number;
  treesHarvested: number;
  treesWatered: number;
  totalTimber: number;
  totalSap: number;
  totalFruit: number;
  totalAcorns: number;
  level: number;
  speciesPlanted: string[];
  maxStageReached: number;
  currentGridSize: number;
  prestigeCount: number;
  questsCompleted: number;
  recipesUnlocked: number;
  structuresPlaced: number;
  oldGrowthCount: number;
  npcsFriended: number;
  totalDaysPlayed: number;
  tradeCount: number;
  festivalCount: number;
  discoveryCount: number;
}

// ── Base species list ────────────────────────────────────────────────────────

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

// ── Achievement definitions ──────────────────────────────────────────────────

export const ACHIEVEMENTS: Achievement[] = [
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

  // ── Expansion achievements ─────────────────────

  // Social
  {
    id: "first-friend",
    name: "First Friend",
    description: "Befriend an NPC",
    icon: "heart",
    category: "social",
    check: (s) => s.npcsFriended >= 1,
  },
  {
    id: "social-butterfly",
    name: "Social Butterfly",
    description: "Befriend 5 NPCs",
    icon: "users",
    category: "social",
    check: (s) => s.npcsFriended >= 5,
  },
  {
    id: "quest-starter",
    name: "Quest Starter",
    description: "Complete your first quest chain",
    icon: "scroll",
    category: "social",
    check: (s) => s.questsCompleted >= 1,
  },
  {
    id: "quest-master",
    name: "Quest Master",
    description: "Complete 8 quest chains",
    icon: "scroll",
    category: "social",
    check: (s) => s.questsCompleted >= 8,
  },

  // Exploration
  {
    id: "first-discovery",
    name: "Keen Eye",
    description: "Discover your first species in the codex",
    icon: "eye",
    category: "exploration",
    check: (s) => s.discoveryCount >= 1,
  },
  {
    id: "codex-scholar",
    name: "Codex Scholar",
    description: "Discover 8 species in the codex",
    icon: "book-open",
    category: "exploration",
    check: (s) => s.discoveryCount >= 8,
  },
  {
    id: "long-haul",
    name: "Long Haul",
    description: "Play for 30 in-game days",
    icon: "calendar",
    category: "exploration",
    check: (s) => s.totalDaysPlayed >= 30,
  },
  {
    id: "century",
    name: "Century",
    description: "Play for 100 in-game days",
    icon: "calendar",
    category: "exploration",
    check: (s) => s.totalDaysPlayed >= 100,
  },

  // Economy
  {
    id: "first-trade",
    name: "Market Opener",
    description: "Complete your first trade",
    icon: "handshake",
    category: "economy",
    check: (s) => s.tradeCount >= 1,
  },
  {
    id: "merchant-class",
    name: "Merchant Class",
    description: "Complete 20 trades",
    icon: "coins",
    category: "economy",
    check: (s) => s.tradeCount >= 20,
  },
  {
    id: "first-craft",
    name: "Apprentice Crafter",
    description: "Unlock your first recipe",
    icon: "hammer",
    category: "economy",
    check: (s) => s.recipesUnlocked >= 1,
  },
  {
    id: "recipe-collector",
    name: "Recipe Collector",
    description: "Unlock 12 recipes",
    icon: "book",
    category: "economy",
    check: (s) => s.recipesUnlocked >= 12,
  },
  {
    id: "builder",
    name: "Builder",
    description: "Place your first structure",
    icon: "building",
    category: "economy",
    check: (s) => s.structuresPlaced >= 1,
  },
  {
    id: "architect",
    name: "Architect",
    description: "Place 10 structures",
    icon: "building",
    category: "economy",
    check: (s) => s.structuresPlaced >= 10,
  },

  // Seasonal
  {
    id: "festival-goer",
    name: "Festival Goer",
    description: "Complete a seasonal festival",
    icon: "party-popper",
    category: "seasonal",
    check: (s) => s.festivalCount >= 1,
  },
  {
    id: "season-veteran",
    name: "Season Veteran",
    description: "Complete all four seasonal festivals",
    icon: "sun",
    category: "seasonal",
    check: (s) => s.festivalCount >= 4,
  },
];

// ── Checker ──────────────────────────────────────────────────────────────────

/**
 * Check all achievements and return the IDs of any newly earned ones.
 */
export function checkAchievements(stats: PlayerStats, alreadyEarned: string[]): string[] {
  const earned = new Set(alreadyEarned);
  const newlyEarned: string[] = [];

  for (const achievement of ACHIEVEMENTS) {
    if (earned.has(achievement.id)) continue;
    if (achievement.check(stats)) {
      newlyEarned.push(achievement.id);
    }
  }

  return newlyEarned;
}

/** Look up an achievement definition by ID. */
export function getAchievementById(id: string): Achievement | undefined {
  return ACHIEVEMENTS.find((a) => a.id === id);
}
