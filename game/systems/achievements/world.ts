/**
 * World achievements -- social, exploration (including chunk/spirit), economy,
 * seasonal, and NG+ prestige milestones.
 * Spec §25.2, §25.3, §32.3
 */

import type { Achievement } from "./types";

export const WORLD_ACHIEVEMENTS: Achievement[] = [
  // ── Social ─────────────────────────────────────
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

  // ── Exploration -- Codex & Time ────────────────
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

  // ── Exploration -- Chunk-based World (Spec §25.3) ───────────────────────────
  {
    id: "first-chunk",
    name: "First Steps",
    description: "Explore beyond the starting grove",
    icon: "map-pin",
    category: "exploration",
    check: (s) => s.chunksVisited >= 2,
  },
  {
    id: "zone-explorer",
    name: "Zone Explorer",
    description: "Discover 10 different zones",
    icon: "map",
    category: "exploration",
    check: (s) => s.chunksVisited >= 10,
  },
  {
    id: "world-wanderer",
    name: "World Wanderer",
    description: "Discover 25 different zones",
    icon: "compass",
    category: "exploration",
    check: (s) => s.chunksVisited >= 25,
  },

  // ── Exploration -- Spirit Discovery (Spec §32.3) ────────────────────────────
  {
    id: "spirit-touched",
    name: "Spirit Touched",
    description: "Discover your first Grovekeeper Spirit",
    icon: "sparkles",
    category: "exploration",
    check: (s) => s.spiritsDiscovered >= 1,
  },
  {
    id: "spirit-seeker",
    name: "Spirit Seeker",
    description: "Discover 4 Grovekeeper Spirits",
    icon: "sparkles",
    category: "exploration",
    check: (s) => s.spiritsDiscovered >= 4,
  },
  {
    id: "world-dreamer",
    name: "World Dreamer",
    description: "Commune with all 8 Grovekeeper Spirits",
    icon: "sparkles",
    category: "exploration",
    check: (s) => s.spiritsDiscovered >= 8,
  },

  // ── Economy ────────────────────────────────────
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

  // ── Seasonal ───────────────────────────────────
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

  // ── NG+ Prestige Milestones (Spec §25.3) ───────────────────────────────────
  {
    id: "twice-born",
    name: "Twice Born",
    description: "Complete your second prestige",
    icon: "refresh-cw",
    category: "mastery",
    check: (s) => s.prestigeCount >= 2,
  },
  {
    id: "thrice-born",
    name: "Thrice Born",
    description: "Complete your third prestige",
    icon: "refresh-cw",
    category: "mastery",
    check: (s) => s.prestigeCount >= 3,
  },
  {
    id: "eternal-keeper",
    name: "Eternal Keeper",
    description: "Reach Prestige Tier 5",
    icon: "infinity",
    category: "mastery",
    check: (s) => s.prestigeCount >= 5,
  },
];
