/**
 * Achievement checking system for Grovekeeper.
 *
 * Pure function that compares player progress against achievement
 * triggers and returns newly earned achievement IDs.
 *
 * Spec reference: section 22 — 15 achievements.
 */

// All 8 base species IDs (spec order).
export const ALL_BASE_SPECIES = [
  "white-oak",
  "weeping-willow",
  "elder-pine",
  "cherry-blossom",
  "ghost-birch",
  "redwood",
  "flame-maple",
  "baobab",
] as const;

export const ALL_SEASONS = ["spring", "summer", "autumn", "winter"] as const;

// ---------------------------------------------------------------------------
// Achievement definitions
// ---------------------------------------------------------------------------

export interface AchievementDef {
  id: string;
  name: string;
  description: string;
}

export const ACHIEVEMENT_DEFS: AchievementDef[] = [
  {
    id: "first-seed",
    name: "First Seed",
    description: "Plant your first tree.",
  },
  {
    id: "seed-spreader",
    name: "Seed Spreader",
    description: "Plant 50 trees (cumulative).",
  },
  {
    id: "forest-founder",
    name: "Forest Founder",
    description: "Plant 200 trees (cumulative).",
  },
  {
    id: "one-of-each",
    name: "One of Each",
    description: "Plant every base species at least once.",
  },
  {
    id: "patient-gardener",
    name: "Patient Gardener",
    description: "Grow any tree to Mature (stage 3).",
  },
  {
    id: "old-growth-guardian",
    name: "Old Growth Guardian",
    description: "Grow any tree to Old Growth (stage 4).",
  },
  {
    id: "timber-baron",
    name: "Timber Baron",
    description: "Accumulate 1,000 timber (lifetime).",
  },
  {
    id: "sap-collector",
    name: "Sap Collector",
    description: "Accumulate 500 sap (lifetime).",
  },
  {
    id: "the-giving-tree",
    name: "The Giving Tree",
    description: "Harvest 500 fruit (lifetime).",
  },
  {
    id: "canopy-complete",
    name: "Canopy Complete",
    description: "Fill an entire grid row with mature+ trees.",
  },
  {
    id: "full-grove",
    name: "Full Grove",
    description: "Fill the entire grid with trees.",
  },
  {
    id: "biodiversity",
    name: "Biodiversity",
    description: "Have 5 or more species growing simultaneously.",
  },
  {
    id: "seasonal-veteran",
    name: "Seasonal Veteran",
    description: "Experience all 4 seasons.",
  },
  {
    id: "enchanted-grove",
    name: "Enchanted Grove",
    description: "Have 5 Old Growth trees simultaneously.",
  },
  {
    id: "new-beginnings",
    name: "New Beginnings",
    description: "Prestige for the first time.",
  },
];

// ---------------------------------------------------------------------------
// Context interface — all data the checker needs
// ---------------------------------------------------------------------------

export interface AchievementCheckContext {
  /** Cumulative trees planted across all sessions. */
  treesPlanted: number;
  /** Cumulative trees that have reached maturity. */
  treesMatured: number;
  /** Cumulative trees harvested. */
  treesHarvested: number;
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
  /** Achievement IDs already earned (will not be re-awarded). */
  unlockedAchievements: string[];
  /** Whether the player has prestiged at least once. */
  hasPrestiged?: boolean;
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

  if (ctx.currentTreeData.length >= ctx.gridSize * ctx.gridSize) {
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
  const oldGrowthCount = ctx.currentTreeData.filter(
    (t) => t.stage >= 4,
  ).length;
  if (oldGrowthCount >= 5) award("enchanted-grove");

  // --- Prestige ---
  if (ctx.hasPrestiged) award("new-beginnings");

  return earned;
}
