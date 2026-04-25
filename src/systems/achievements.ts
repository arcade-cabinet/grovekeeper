/**
 * Achievement checking system for Grovekeeper.
 *
 * Pure function that compares player progress against achievement
 * triggers and returns newly earned achievement IDs.
 *
 * Spec reference: section 22 — 35 achievements (15 base + 20 expansion).
 */

// All 12 base species IDs (spec order).
export const ALL_BASE_SPECIES = [
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
] as const;

export const ALL_SEASONS = ["spring", "summer", "autumn", "winter"] as const;

// ---------------------------------------------------------------------------
// Achievement definitions
// ---------------------------------------------------------------------------

export interface AchievementDef {
  id: string;
  name: string;
  description: string;
  /** 1-sentence cozy celebratory line shown in the achievement unlock toast/popup. */
  flavor?: string;
}

export const ACHIEVEMENT_DEFS: AchievementDef[] = [
  {
    id: "first-seed",
    name: "First Seed",
    description: "Plant your first tree.",
    flavor: "Every great forest began exactly like this.",
  },
  {
    id: "seed-spreader",
    name: "Seed Spreader",
    description: "Plant 50 trees (cumulative).",
    flavor: "Fifty small promises to the earth, and the earth is listening.",
  },
  {
    id: "forest-founder",
    name: "Forest Founder",
    description: "Plant 200 trees (cumulative).",
    flavor: "Two hundred roots drinking deep — a real forest is taking shape.",
  },
  {
    id: "one-of-each",
    name: "One of Each",
    description: "Plant every base species at least once.",
    flavor:
      "Twelve different voices, one grove — what a wonderful conversation.",
  },
  {
    id: "patient-gardener",
    name: "Patient Gardener",
    description: "Grow any tree to Mature (stage 3).",
    flavor: "Good things grow slowly, and yours is growing beautifully.",
  },
  {
    id: "old-growth-guardian",
    name: "Old Growth Guardian",
    description: "Grow any tree to Old Growth (stage 4).",
    flavor:
      "Old Growth is the forest's highest honour — you earned every ring.",
  },
  {
    id: "timber-baron",
    name: "Timber Baron",
    description: "Accumulate 1,000 timber (lifetime).",
    flavor: "A thousand timbers gathered, one careful harvest at a time.",
  },
  {
    id: "sap-collector",
    name: "Sap Collector",
    description: "Accumulate 500 sap (lifetime).",
    flavor:
      "Five hundred drops of sweetness, drawn patiently from living wood.",
  },
  {
    id: "the-giving-tree",
    name: "The Giving Tree",
    description: "Harvest 500 fruit (lifetime).",
    flavor: "The grove gives freely to those who tend it with care.",
  },
  {
    id: "canopy-complete",
    name: "Canopy Complete",
    description: "Fill an entire grid row with mature+ trees.",
    flavor:
      "A wall of leafy green, shoulder to shoulder, sheltering everything beneath.",
  },
  {
    id: "full-grove",
    name: "Full Grove",
    description: "Fill the entire grid with trees.",
    flavor: "Not a patch of bare earth remains — the grove is gloriously full.",
  },
  {
    id: "biodiversity",
    name: "Biodiversity",
    description: "Have 5 or more species growing simultaneously.",
    flavor: "A grove with many voices sings the richest song.",
  },
  {
    id: "seasonal-veteran",
    name: "Seasonal Veteran",
    description: "Experience all 4 seasons.",
    flavor:
      "Spring's hope, summer's warmth, autumn's gold, winter's quiet — you know them all.",
  },
  {
    id: "enchanted-grove",
    name: "Enchanted Grove",
    description: "Have 5 Old Growth trees simultaneously.",
    flavor:
      "Five ancient pillars standing tall — the grove hums with deep magic.",
  },
  {
    id: "new-beginnings",
    name: "New Beginnings",
    description: "Prestige for the first time.",
    flavor: "To begin again is the forest's oldest wisdom.",
  },

  // --- Exploration (4) ---
  {
    id: "zone-hopper",
    name: "Zone Hopper",
    description: "Visit all 5 zone types.",
    flavor:
      "Five landscapes, five different skies — the valley has no more secrets from you.",
  },
  {
    id: "cartographer",
    name: "Cartographer",
    description: "Discover 10 zones.",
    flavor: "Ten new clearings mapped, each one a story waiting to be grown.",
  },
  {
    id: "wild-harvester",
    name: "Wild Harvester",
    description: "Harvest 10 wild trees.",
    flavor: "The wild forest shares what it has grown, and you are grateful.",
  },
  {
    id: "forest-keeper",
    name: "Forest Keeper",
    description: "Let 10 wild trees regrow.",
    flavor:
      "Giving the forest space to breathe is the quietest kind of kindness.",
  },

  // --- Tool Mastery (4) ---
  {
    id: "hydration-hero",
    name: "Hydration Hero",
    description: "Water 100 trees.",
    flavor:
      "A hundred times you carried water to a thirsty root — the grove remembers.",
  },
  {
    id: "master-pruner",
    name: "Master Pruner",
    description: "Prune 50 trees.",
    flavor:
      "Clean cuts and careful hands: fifty trees are stronger for your attention.",
  },
  {
    id: "rock-breaker",
    name: "Rock Breaker",
    description: "Clear 25 rocks with the shovel.",
    flavor: "Every rock cleared is a welcome mat rolled out for a new seed.",
  },
  {
    id: "tool-collector",
    name: "Tool Collector",
    description: "Unlock all 12 tools.",
    flavor:
      "A grovekeeper with every tool is ready for anything the forest asks.",
  },

  // --- Seasonal (3) ---
  {
    id: "spring-planter",
    name: "Spring Planter",
    description: "Plant 20 trees in spring.",
    flavor:
      "Twenty seeds tucked into warm spring soil — by autumn, what a sight.",
  },
  {
    id: "autumn-harvester",
    name: "Autumn Harvester",
    description: "Harvest 30 trees in autumn.",
    flavor: "Thirty generous trees gave everything they had, right on time.",
  },
  {
    id: "winter-survivor",
    name: "Winter Survivor",
    description: "Have 20 trees survive winter.",
    flavor:
      "Twenty trees made it through the cold, roots firm and hearts patient.",
  },

  // --- Structure (3) ---
  {
    id: "first-builder",
    name: "First Builder",
    description: "Build your first structure.",
    flavor:
      "The grove now has a home within its home — your first small wonder.",
  },
  {
    id: "architect",
    name: "Architect",
    description: "Build all structure types.",
    flavor:
      "Well, greenhouse, shed, and more — every corner of the grove is cared for.",
  },
  {
    id: "master-builder",
    name: "Master Builder",
    description: "Upgrade any structure to tier 3.",
    flavor:
      "A tier-3 structure is craftsmanship at its finest — the grove stands proud.",
  },

  // --- Collector (3) ---
  {
    id: "lumber-lord",
    name: "Lumber Lord",
    description: "Accumulate 5,000 timber (lifetime).",
    flavor:
      "Five thousand timbers stacked — enough to build a whole village, twice over.",
  },
  {
    id: "resource-mogul",
    name: "Resource Mogul",
    description: "Have 1,000 of each resource (lifetime).",
    flavor:
      "Timber, sap, fruit, and acorns in abundance — the grove holds nothing back.",
  },
  {
    id: "seed-hoarder",
    name: "Seed Hoarder",
    description: "Collect 50 seeds of one species.",
    flavor:
      "Fifty seeds in your pocket, each one a tree that hasn't happened yet.",
  },

  // --- Wild Forest (3) ---
  {
    id: "forager",
    name: "Forager",
    description: "Harvest 50 wild trees.",
    flavor:
      "Fifty wild trees gave their gifts freely — you accepted with grateful hands.",
  },
  {
    id: "reforestation",
    name: "Reforestation",
    description: "Let 10 wild trees regrow after chopping.",
    flavor: "The forest grows back where you let it — your trust is rewarded.",
  },
  {
    id: "wild-collector",
    name: "Wild Collector",
    description: "Harvest all wild species at least once.",
    flavor:
      "Every wild species harvested at least once — the full tapestry, gathered.",
  },
];

// ---------------------------------------------------------------------------
// Context interface — all data the checker needs
// ---------------------------------------------------------------------------

export interface AchievementCheckContext {
  /** Cumulative trees planted across all sessions. */
  treesPlanted: number;
  /** Lifetime resource totals keyed by resource type. */
  lifetimeResources: Record<string, number>;
  /** Distinct species IDs the player has ever planted. */
  speciesPlanted: string[];
  /** Distinct season IDs the player has experienced. */
  seasonsExperienced: string[];
  /** Snapshot of every tree currently on the grid. */
  currentTreeData: {
    speciesId: string;
    stage: number;
    gridX: number;
    gridZ: number;
  }[];
  /** Current grid side length (e.g. 12 for 12x12). */
  gridSize: number;
  /** Number of tiles that can be planted on (excludes water, rock, path). */
  plantableTileCount?: number;
  /** Achievement IDs already earned (will not be re-awarded). */
  unlockedAchievements: string[];
  /** Whether the player has prestiged at least once. */
  hasPrestiged?: boolean;

  // --- Expansion tracking fields ---

  /** Number of times each tool has been used. */
  toolUseCounts?: Record<string, number>;
  /** Number of zones the player has discovered. */
  zonesDiscovered?: number;
  /** Number of structures the player has built. */
  structuresBuilt?: number;
  /** Number of wild trees harvested. */
  wildTreesHarvested?: number;
  /** Number of wild trees that have regrown. */
  wildTreesRegrown?: number;
  /** Whether any structure has been upgraded to tier 3. */
  hasMaxTierStructure?: boolean;
  /** Number of trees that survived winter. */
  treesSurvivedWinter?: number;
  /** Maximum upgrade tier achieved for any tool. */
  maxToolUpgradeTier?: number;
  /** Set of zone types the player has visited. */
  visitedZoneTypes?: string[];
  /** Trees planted during spring (current spring or tracked). */
  treesPlantedInSpring?: number;
  /** Trees harvested during autumn. */
  treesHarvestedInAutumn?: number;
  /** Number of unlocked tools. */
  unlockedToolCount?: number;
  /** Set of species IDs harvested from wild trees. */
  wildSpeciesHarvested?: string[];
  /** Number of distinct structure types built. */
  distinctStructureTypesBuilt?: number;
  /** Max seeds held for any single species. */
  maxSeedsOfOneSpecies?: number;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function uniqueSpeciesInGrid(
  trees: AchievementCheckContext["currentTreeData"],
): Set<string> {
  const species = new Set<string>();
  for (const t of trees) {
    species.add(t.speciesId);
  }
  return species;
}

/**
 * Check whether any row (z = 0 .. gridSize-1) is fully occupied by
 * trees at stage >= 3 (Mature or Old Growth).
 */
function hasCompleteRow(
  trees: AchievementCheckContext["currentTreeData"],
  gridSize: number,
): boolean {
  // Build a set of "x,z" keys for mature+ trees for O(1) lookup.
  const matureCells = new Set<string>();
  for (const t of trees) {
    if (t.stage >= 3) {
      matureCells.add(`${t.gridX},${t.gridZ}`);
    }
  }

  for (let z = 0; z < gridSize; z++) {
    let rowComplete = true;
    for (let x = 0; x < gridSize; x++) {
      if (!matureCells.has(`${x},${z}`)) {
        rowComplete = false;
        break;
      }
    }
    if (rowComplete) return true;
  }

  return false;
}

// ---------------------------------------------------------------------------
// Main checker
// ---------------------------------------------------------------------------

/**
 * Evaluate all achievement triggers and return IDs of newly earned
 * achievements (those not already present in `ctx.unlockedAchievements`).
 *
 * This is a pure function with no side effects — the caller is
 * responsible for persisting results to the Zustand store.
 */
export function checkAchievements(ctx: AchievementCheckContext): string[] {
  const already = new Set(ctx.unlockedAchievements);
  const earned: string[] = [];

  function award(id: string): void {
    if (!already.has(id)) {
      earned.push(id);
      // Also add to the set so later checks in the same pass
      // can see achievements unlocked earlier in this call.
      already.add(id);
    }
  }

  // --- Planting milestones ---
  if (ctx.treesPlanted >= 1) award("first-seed");
  if (ctx.treesPlanted >= 50) award("seed-spreader");
  if (ctx.treesPlanted >= 200) award("forest-founder");

  // --- Species diversity (lifetime) ---
  if (ctx.speciesPlanted.length >= ALL_BASE_SPECIES.length) {
    const planted = new Set(ctx.speciesPlanted);
    if (ALL_BASE_SPECIES.every((s) => planted.has(s))) {
      award("one-of-each");
    }
  }

  // --- Growth milestones ---
  const hasStage3 = ctx.currentTreeData.some((t) => t.stage >= 3);
  if (hasStage3) award("patient-gardener");

  const hasStage4 = ctx.currentTreeData.some((t) => t.stage >= 4);
  if (hasStage4) award("old-growth-guardian");

  // --- Lifetime resources ---
  if ((ctx.lifetimeResources.timber ?? 0) >= 1000) award("timber-baron");
  if ((ctx.lifetimeResources.sap ?? 0) >= 500) award("sap-collector");
  if ((ctx.lifetimeResources.fruit ?? 0) >= 500) award("the-giving-tree");

  // --- Grid-based achievements ---
  if (hasCompleteRow(ctx.currentTreeData, ctx.gridSize)) {
    award("canopy-complete");
  }

  const plantableCount = ctx.plantableTileCount ?? ctx.gridSize * ctx.gridSize;
  if (plantableCount > 0 && ctx.currentTreeData.length >= plantableCount) {
    award("full-grove");
  }

  // --- Simultaneous diversity ---
  if (uniqueSpeciesInGrid(ctx.currentTreeData).size >= 5) {
    award("biodiversity");
  }

  // --- Seasons ---
  if (ctx.seasonsExperienced.length >= ALL_SEASONS.length) {
    const seen = new Set(ctx.seasonsExperienced);
    if (ALL_SEASONS.every((s) => seen.has(s))) {
      award("seasonal-veteran");
    }
  }

  // --- Old Growth cluster ---
  const oldGrowthCount = ctx.currentTreeData.filter((t) => t.stage >= 4).length;
  if (oldGrowthCount >= 5) award("enchanted-grove");

  // --- Prestige ---
  if (ctx.hasPrestiged) award("new-beginnings");

  // =========================================================================
  // Expansion achievements (Phase 5)
  // =========================================================================

  // --- Exploration ---
  if ((ctx.visitedZoneTypes ?? []).length >= 5) award("zone-hopper");
  if ((ctx.zonesDiscovered ?? 0) >= 10) award("cartographer");
  if ((ctx.wildTreesHarvested ?? 0) >= 10) award("wild-harvester");
  if ((ctx.wildTreesRegrown ?? 0) >= 10) award("forest-keeper");

  // --- Tool Mastery ---
  if ((ctx.toolUseCounts?.["watering-can"] ?? 0) >= 100)
    award("hydration-hero");
  if ((ctx.toolUseCounts?.["pruning-shears"] ?? 0) >= 50)
    award("master-pruner");
  if ((ctx.toolUseCounts?.shovel ?? 0) >= 25) award("rock-breaker");
  if ((ctx.unlockedToolCount ?? 0) >= 12) award("tool-collector");

  // --- Seasonal ---
  if ((ctx.treesPlantedInSpring ?? 0) >= 20) award("spring-planter");
  if ((ctx.treesHarvestedInAutumn ?? 0) >= 30) award("autumn-harvester");
  if ((ctx.treesSurvivedWinter ?? 0) >= 20) award("winter-survivor");

  // --- Structure ---
  if ((ctx.structuresBuilt ?? 0) >= 1) award("first-builder");
  if ((ctx.distinctStructureTypesBuilt ?? 0) >= 4) award("architect");
  if (ctx.hasMaxTierStructure) award("master-builder");

  // --- Collector ---
  if ((ctx.lifetimeResources.timber ?? 0) >= 5000) award("lumber-lord");
  const allResourcesOver1000 = ["timber", "sap", "fruit", "acorns"].every(
    (r) => (ctx.lifetimeResources[r] ?? 0) >= 1000,
  );
  if (allResourcesOver1000) award("resource-mogul");
  if ((ctx.maxSeedsOfOneSpecies ?? 0) >= 50) award("seed-hoarder");

  // --- Wild Forest ---
  if ((ctx.wildTreesHarvested ?? 0) >= 50) award("forager");
  if ((ctx.wildTreesRegrown ?? 0) >= 10) award("reforestation");
  if ((ctx.wildSpeciesHarvested ?? []).length >= ALL_BASE_SPECIES.length) {
    award("wild-collector");
  }

  return earned;
}
