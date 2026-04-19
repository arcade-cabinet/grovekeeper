import { describe, expect, it } from "vitest";
import {
  ACHIEVEMENT_DEFS,
  type AchievementCheckContext,
  ALL_BASE_SPECIES,
  ALL_SEASONS,
  checkAchievements,
} from "./achievements";

/**
 * Build a minimal context with sensible defaults.
 * Override any field via the `overrides` parameter.
 */
function makeCtx(
  overrides: Partial<AchievementCheckContext> = {},
): AchievementCheckContext {
  return {
    treesPlanted: 0,
    lifetimeResources: { timber: 0, sap: 0, fruit: 0, acorns: 0 },
    speciesPlanted: [],
    seasonsExperienced: [],
    currentTreeData: [],
    gridSize: 12,
    unlockedAchievements: [],
    hasPrestiged: false,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Definition completeness
// ---------------------------------------------------------------------------

describe("ACHIEVEMENT_DEFS", () => {
  it("contains exactly 35 achievements", () => {
    expect(ACHIEVEMENT_DEFS).toHaveLength(35);
  });

  it("has unique IDs", () => {
    const ids = ACHIEVEMENT_DEFS.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("every definition has a non-empty name and description", () => {
    for (const def of ACHIEVEMENT_DEFS) {
      expect(def.name.length).toBeGreaterThan(0);
      expect(def.description.length).toBeGreaterThan(0);
    }
  });
});

// ---------------------------------------------------------------------------
// Planting milestones
// ---------------------------------------------------------------------------

describe("Planting achievements", () => {
  it("first-seed triggers at treesPlanted >= 1", () => {
    const result = checkAchievements(makeCtx({ treesPlanted: 1 }));
    expect(result).toContain("first-seed");
  });

  it("first-seed does not trigger at treesPlanted 0", () => {
    const result = checkAchievements(makeCtx({ treesPlanted: 0 }));
    expect(result).not.toContain("first-seed");
  });

  it("seed-spreader triggers at treesPlanted >= 50", () => {
    const result = checkAchievements(makeCtx({ treesPlanted: 50 }));
    expect(result).toContain("seed-spreader");
  });

  it("seed-spreader does not trigger at treesPlanted 49", () => {
    const result = checkAchievements(makeCtx({ treesPlanted: 49 }));
    expect(result).not.toContain("seed-spreader");
  });

  it("forest-founder triggers at treesPlanted >= 200", () => {
    const result = checkAchievements(makeCtx({ treesPlanted: 200 }));
    expect(result).toContain("forest-founder");
  });

  it("planting 200 also awards first-seed and seed-spreader", () => {
    const result = checkAchievements(makeCtx({ treesPlanted: 200 }));
    expect(result).toContain("first-seed");
    expect(result).toContain("seed-spreader");
    expect(result).toContain("forest-founder");
  });
});

// ---------------------------------------------------------------------------
// Species diversity
// ---------------------------------------------------------------------------

describe("one-of-each", () => {
  it("requires all 12 species in speciesPlanted", () => {
    const result = checkAchievements(
      makeCtx({ speciesPlanted: [...ALL_BASE_SPECIES] }),
    );
    expect(result).toContain("one-of-each");
  });

  it("does not trigger with only 11 species", () => {
    const result = checkAchievements(
      makeCtx({ speciesPlanted: ALL_BASE_SPECIES.slice(0, 11) }),
    );
    expect(result).not.toContain("one-of-each");
  });

  it("does not trigger with empty list", () => {
    const result = checkAchievements(makeCtx({ speciesPlanted: [] }));
    expect(result).not.toContain("one-of-each");
  });
});

// ---------------------------------------------------------------------------
// Growth milestones
// ---------------------------------------------------------------------------

describe("Growth achievements", () => {
  it("patient-gardener triggers with a stage 3 tree", () => {
    const result = checkAchievements(
      makeCtx({
        currentTreeData: [
          { speciesId: "white-oak", stage: 3, gridX: 0, gridZ: 0 },
        ],
      }),
    );
    expect(result).toContain("patient-gardener");
  });

  it("patient-gardener also triggers with stage 4", () => {
    const result = checkAchievements(
      makeCtx({
        currentTreeData: [
          { speciesId: "white-oak", stage: 4, gridX: 0, gridZ: 0 },
        ],
      }),
    );
    expect(result).toContain("patient-gardener");
  });

  it("patient-gardener does not trigger with stage 2", () => {
    const result = checkAchievements(
      makeCtx({
        currentTreeData: [
          { speciesId: "white-oak", stage: 2, gridX: 0, gridZ: 0 },
        ],
      }),
    );
    expect(result).not.toContain("patient-gardener");
  });

  it("old-growth-guardian triggers with a stage 4 tree", () => {
    const result = checkAchievements(
      makeCtx({
        currentTreeData: [
          { speciesId: "white-oak", stage: 4, gridX: 0, gridZ: 0 },
        ],
      }),
    );
    expect(result).toContain("old-growth-guardian");
  });

  it("old-growth-guardian does not trigger with stage 3", () => {
    const result = checkAchievements(
      makeCtx({
        currentTreeData: [
          { speciesId: "white-oak", stage: 3, gridX: 0, gridZ: 0 },
        ],
      }),
    );
    expect(result).not.toContain("old-growth-guardian");
  });
});

// ---------------------------------------------------------------------------
// Lifetime resource achievements
// ---------------------------------------------------------------------------

describe("Resource achievements", () => {
  it("timber-baron at lifetimeResources.timber >= 1000", () => {
    const result = checkAchievements(
      makeCtx({
        lifetimeResources: { timber: 1000, sap: 0, fruit: 0, acorns: 0 },
      }),
    );
    expect(result).toContain("timber-baron");
  });

  it("timber-baron does not trigger at 999", () => {
    const result = checkAchievements(
      makeCtx({
        lifetimeResources: { timber: 999, sap: 0, fruit: 0, acorns: 0 },
      }),
    );
    expect(result).not.toContain("timber-baron");
  });

  it("sap-collector at lifetimeResources.sap >= 500", () => {
    const result = checkAchievements(
      makeCtx({
        lifetimeResources: { timber: 0, sap: 500, fruit: 0, acorns: 0 },
      }),
    );
    expect(result).toContain("sap-collector");
  });

  it("the-giving-tree at lifetimeResources.fruit >= 500", () => {
    const result = checkAchievements(
      makeCtx({
        lifetimeResources: { timber: 0, sap: 0, fruit: 500, acorns: 0 },
      }),
    );
    expect(result).toContain("the-giving-tree");
  });

  it("the-giving-tree does not trigger at 499 fruit", () => {
    const result = checkAchievements(
      makeCtx({
        lifetimeResources: { timber: 0, sap: 0, fruit: 499, acorns: 0 },
      }),
    );
    expect(result).not.toContain("the-giving-tree");
  });
});

// ---------------------------------------------------------------------------
// Grid-based achievements
// ---------------------------------------------------------------------------

describe("canopy-complete", () => {
  it("triggers when a full row of mature trees exists", () => {
    // Fill row z=0 with 12 mature trees (stage 3).
    const row = Array.from({ length: 12 }, (_, x) => ({
      speciesId: "white-oak",
      stage: 3,
      gridX: x,
      gridZ: 0,
    }));
    const result = checkAchievements(makeCtx({ currentTreeData: row }));
    expect(result).toContain("canopy-complete");
  });

  it("triggers with old-growth (stage 4) trees in a row", () => {
    const row = Array.from({ length: 12 }, (_, x) => ({
      speciesId: "elder-pine",
      stage: 4,
      gridX: x,
      gridZ: 5,
    }));
    const result = checkAchievements(makeCtx({ currentTreeData: row }));
    expect(result).toContain("canopy-complete");
  });

  it("does not trigger when a row has a gap", () => {
    // 11 out of 12 cells filled in row z=0.
    const row = Array.from({ length: 11 }, (_, x) => ({
      speciesId: "white-oak",
      stage: 3,
      gridX: x,
      gridZ: 0,
    }));
    const result = checkAchievements(makeCtx({ currentTreeData: row }));
    expect(result).not.toContain("canopy-complete");
  });

  it("does not trigger when row trees are below stage 3", () => {
    const row = Array.from({ length: 12 }, (_, x) => ({
      speciesId: "white-oak",
      stage: 2,
      gridX: x,
      gridZ: 0,
    }));
    const result = checkAchievements(makeCtx({ currentTreeData: row }));
    expect(result).not.toContain("canopy-complete");
  });
});

describe("full-grove", () => {
  it("triggers when currentTreeData.length >= plantableTileCount", () => {
    // 100 plantable tiles out of a 12x12 grid (some water/rock)
    const trees = Array.from({ length: 100 }, (_, i) => ({
      speciesId: "white-oak",
      stage: 0,
      gridX: i % 12,
      gridZ: Math.floor(i / 12),
    }));
    const result = checkAchievements(
      makeCtx({ currentTreeData: trees, plantableTileCount: 100 }),
    );
    expect(result).toContain("full-grove");
  });

  it("does not trigger when trees < plantableTileCount", () => {
    const trees = Array.from({ length: 99 }, (_, i) => ({
      speciesId: "white-oak",
      stage: 0,
      gridX: i % 12,
      gridZ: Math.floor(i / 12),
    }));
    const result = checkAchievements(
      makeCtx({ currentTreeData: trees, plantableTileCount: 100 }),
    );
    expect(result).not.toContain("full-grove");
  });

  it("falls back to gridSize^2 when plantableTileCount is not provided", () => {
    const trees = Array.from({ length: 144 }, (_, i) => ({
      speciesId: "white-oak",
      stage: 0,
      gridX: i % 12,
      gridZ: Math.floor(i / 12),
    }));
    const result = checkAchievements(makeCtx({ currentTreeData: trees }));
    expect(result).toContain("full-grove");
  });

  it("respects non-default gridSize", () => {
    // 4x4 grid: 16 cells needed.
    const trees = Array.from({ length: 16 }, (_, i) => ({
      speciesId: "white-oak",
      stage: 1,
      gridX: i % 4,
      gridZ: Math.floor(i / 4),
    }));
    const result = checkAchievements(
      makeCtx({ currentTreeData: trees, gridSize: 4 }),
    );
    expect(result).toContain("full-grove");
  });
});

// ---------------------------------------------------------------------------
// Biodiversity
// ---------------------------------------------------------------------------

describe("biodiversity", () => {
  it("triggers with 5 unique species in currentTreeData", () => {
    const species = ALL_BASE_SPECIES.slice(0, 5);
    const trees = species.map((s, i) => ({
      speciesId: s,
      stage: 1,
      gridX: i,
      gridZ: 0,
    }));
    const result = checkAchievements(makeCtx({ currentTreeData: trees }));
    expect(result).toContain("biodiversity");
  });

  it("does not trigger with only 4 species", () => {
    const species = ALL_BASE_SPECIES.slice(0, 4);
    const trees = species.map((s, i) => ({
      speciesId: s,
      stage: 1,
      gridX: i,
      gridZ: 0,
    }));
    const result = checkAchievements(makeCtx({ currentTreeData: trees }));
    expect(result).not.toContain("biodiversity");
  });

  it("counts unique species, not total trees", () => {
    // 10 trees but only 3 species.
    const trees = Array.from({ length: 10 }, (_, i) => ({
      speciesId: ALL_BASE_SPECIES[i % 3],
      stage: 2,
      gridX: i,
      gridZ: 0,
    }));
    const result = checkAchievements(makeCtx({ currentTreeData: trees }));
    expect(result).not.toContain("biodiversity");
  });
});

// ---------------------------------------------------------------------------
// Seasonal veteran
// ---------------------------------------------------------------------------

describe("seasonal-veteran", () => {
  it("triggers with all 4 seasons experienced", () => {
    const result = checkAchievements(
      makeCtx({ seasonsExperienced: [...ALL_SEASONS] }),
    );
    expect(result).toContain("seasonal-veteran");
  });

  it("does not trigger with only 3 seasons", () => {
    const result = checkAchievements(
      makeCtx({
        seasonsExperienced: ["spring", "summer", "autumn"],
      }),
    );
    expect(result).not.toContain("seasonal-veteran");
  });

  it("does not trigger with empty seasons", () => {
    const result = checkAchievements(makeCtx({ seasonsExperienced: [] }));
    expect(result).not.toContain("seasonal-veteran");
  });
});

// ---------------------------------------------------------------------------
// Enchanted grove
// ---------------------------------------------------------------------------

describe("enchanted-grove", () => {
  it("triggers with 5 old-growth (stage 4) trees", () => {
    const trees = Array.from({ length: 5 }, (_, i) => ({
      speciesId: "redwood",
      stage: 4,
      gridX: i,
      gridZ: 0,
    }));
    const result = checkAchievements(makeCtx({ currentTreeData: trees }));
    expect(result).toContain("enchanted-grove");
  });

  it("does not trigger with only 4 old-growth trees", () => {
    const trees = Array.from({ length: 4 }, (_, i) => ({
      speciesId: "redwood",
      stage: 4,
      gridX: i,
      gridZ: 0,
    }));
    const result = checkAchievements(makeCtx({ currentTreeData: trees }));
    expect(result).not.toContain("enchanted-grove");
  });

  it("only counts stage >= 4, not stage 3", () => {
    const trees = [
      { speciesId: "redwood", stage: 4, gridX: 0, gridZ: 0 },
      { speciesId: "redwood", stage: 4, gridX: 1, gridZ: 0 },
      { speciesId: "redwood", stage: 3, gridX: 2, gridZ: 0 },
      { speciesId: "redwood", stage: 3, gridX: 3, gridZ: 0 },
      { speciesId: "redwood", stage: 4, gridX: 4, gridZ: 0 },
      { speciesId: "redwood", stage: 3, gridX: 5, gridZ: 0 },
      { speciesId: "redwood", stage: 4, gridX: 6, gridZ: 0 },
    ];
    const result = checkAchievements(makeCtx({ currentTreeData: trees }));
    // Only 4 stage-4 trees, not enough.
    expect(result).not.toContain("enchanted-grove");
  });
});

// ---------------------------------------------------------------------------
// Prestige
// ---------------------------------------------------------------------------

describe("new-beginnings", () => {
  it("triggers when hasPrestiged is true", () => {
    const result = checkAchievements(makeCtx({ hasPrestiged: true }));
    expect(result).toContain("new-beginnings");
  });

  it("does not trigger when hasPrestiged is false", () => {
    const result = checkAchievements(makeCtx({ hasPrestiged: false }));
    expect(result).not.toContain("new-beginnings");
  });
});

// ---------------------------------------------------------------------------
// Exploration achievements (Phase 5 expansion)
// ---------------------------------------------------------------------------

describe("zone-hopper", () => {
  it("triggers at 5 visited zone types", () => {
    const result = checkAchievements(
      makeCtx({
        visitedZoneTypes: ["forest", "meadow", "swamp", "mountain", "desert"],
      }),
    );
    expect(result).toContain("zone-hopper");
  });

  it("does not trigger with only 4 zone types", () => {
    const result = checkAchievements(
      makeCtx({
        visitedZoneTypes: ["forest", "meadow", "swamp", "mountain"],
      }),
    );
    expect(result).not.toContain("zone-hopper");
  });
});

describe("cartographer", () => {
  it("triggers at 10 zones discovered", () => {
    const result = checkAchievements(makeCtx({ zonesDiscovered: 10 }));
    expect(result).toContain("cartographer");
  });

  it("does not trigger at 9 zones discovered", () => {
    const result = checkAchievements(makeCtx({ zonesDiscovered: 9 }));
    expect(result).not.toContain("cartographer");
  });
});

describe("wild-harvester", () => {
  it("triggers at 10 wild trees harvested", () => {
    const result = checkAchievements(makeCtx({ wildTreesHarvested: 10 }));
    expect(result).toContain("wild-harvester");
  });

  it("does not trigger at 9 wild trees harvested", () => {
    const result = checkAchievements(makeCtx({ wildTreesHarvested: 9 }));
    expect(result).not.toContain("wild-harvester");
  });
});

describe("forest-keeper", () => {
  it("triggers at 10 wild trees regrown", () => {
    const result = checkAchievements(makeCtx({ wildTreesRegrown: 10 }));
    expect(result).toContain("forest-keeper");
  });

  it("does not trigger at 9 wild trees regrown", () => {
    const result = checkAchievements(makeCtx({ wildTreesRegrown: 9 }));
    expect(result).not.toContain("forest-keeper");
  });
});

// ---------------------------------------------------------------------------
// Tool Mastery achievements (Phase 5 expansion)
// ---------------------------------------------------------------------------

describe("hydration-hero", () => {
  it("triggers at 100 watering-can uses", () => {
    const result = checkAchievements(
      makeCtx({ toolUseCounts: { "watering-can": 100 } }),
    );
    expect(result).toContain("hydration-hero");
  });

  it("does not trigger at 99 watering-can uses", () => {
    const result = checkAchievements(
      makeCtx({ toolUseCounts: { "watering-can": 99 } }),
    );
    expect(result).not.toContain("hydration-hero");
  });
});

describe("master-pruner", () => {
  it("triggers at 50 pruning-shears uses", () => {
    const result = checkAchievements(
      makeCtx({ toolUseCounts: { "pruning-shears": 50 } }),
    );
    expect(result).toContain("master-pruner");
  });

  it("does not trigger at 49 pruning-shears uses", () => {
    const result = checkAchievements(
      makeCtx({ toolUseCounts: { "pruning-shears": 49 } }),
    );
    expect(result).not.toContain("master-pruner");
  });
});

describe("rock-breaker", () => {
  it("triggers at 25 shovel uses", () => {
    const result = checkAchievements(
      makeCtx({ toolUseCounts: { shovel: 25 } }),
    );
    expect(result).toContain("rock-breaker");
  });

  it("does not trigger at 24 shovel uses", () => {
    const result = checkAchievements(
      makeCtx({ toolUseCounts: { shovel: 24 } }),
    );
    expect(result).not.toContain("rock-breaker");
  });
});

describe("tool-collector", () => {
  it("triggers at 12 unlocked tools", () => {
    const result = checkAchievements(makeCtx({ unlockedToolCount: 12 }));
    expect(result).toContain("tool-collector");
  });

  it("does not trigger at 11 unlocked tools", () => {
    const result = checkAchievements(makeCtx({ unlockedToolCount: 11 }));
    expect(result).not.toContain("tool-collector");
  });
});

// ---------------------------------------------------------------------------
// Seasonal achievements (Phase 5 expansion)
// ---------------------------------------------------------------------------

describe("spring-planter", () => {
  it("triggers at 20 trees planted in spring", () => {
    const result = checkAchievements(makeCtx({ treesPlantedInSpring: 20 }));
    expect(result).toContain("spring-planter");
  });

  it("does not trigger at 19 spring plantings", () => {
    const result = checkAchievements(makeCtx({ treesPlantedInSpring: 19 }));
    expect(result).not.toContain("spring-planter");
  });
});

describe("autumn-harvester", () => {
  it("triggers at 30 autumn harvests", () => {
    const result = checkAchievements(makeCtx({ treesHarvestedInAutumn: 30 }));
    expect(result).toContain("autumn-harvester");
  });

  it("does not trigger at 29 autumn harvests", () => {
    const result = checkAchievements(makeCtx({ treesHarvestedInAutumn: 29 }));
    expect(result).not.toContain("autumn-harvester");
  });
});

describe("winter-survivor", () => {
  it("triggers at 20 trees survived winter", () => {
    const result = checkAchievements(makeCtx({ treesSurvivedWinter: 20 }));
    expect(result).toContain("winter-survivor");
  });

  it("does not trigger at 19 trees survived winter", () => {
    const result = checkAchievements(makeCtx({ treesSurvivedWinter: 19 }));
    expect(result).not.toContain("winter-survivor");
  });
});

// ---------------------------------------------------------------------------
// Structure achievements (Phase 5 expansion)
// ---------------------------------------------------------------------------

describe("first-builder", () => {
  it("triggers at 1 structure built", () => {
    const result = checkAchievements(makeCtx({ structuresBuilt: 1 }));
    expect(result).toContain("first-builder");
  });

  it("does not trigger at 0 structures built", () => {
    const result = checkAchievements(makeCtx({ structuresBuilt: 0 }));
    expect(result).not.toContain("first-builder");
  });
});

describe("architect", () => {
  it("triggers at 4 distinct structure types built", () => {
    const result = checkAchievements(
      makeCtx({ distinctStructureTypesBuilt: 4 }),
    );
    expect(result).toContain("architect");
  });

  it("does not trigger at 3 distinct structure types", () => {
    const result = checkAchievements(
      makeCtx({ distinctStructureTypesBuilt: 3 }),
    );
    expect(result).not.toContain("architect");
  });
});

describe("master-builder", () => {
  it("triggers when hasMaxTierStructure is true", () => {
    const result = checkAchievements(makeCtx({ hasMaxTierStructure: true }));
    expect(result).toContain("master-builder");
  });

  it("does not trigger when hasMaxTierStructure is false", () => {
    const result = checkAchievements(makeCtx({ hasMaxTierStructure: false }));
    expect(result).not.toContain("master-builder");
  });
});

// ---------------------------------------------------------------------------
// Collector achievements (Phase 5 expansion)
// ---------------------------------------------------------------------------

describe("lumber-lord", () => {
  it("triggers at 5000 lifetime timber", () => {
    const result = checkAchievements(
      makeCtx({
        lifetimeResources: { timber: 5000, sap: 0, fruit: 0, acorns: 0 },
      }),
    );
    expect(result).toContain("lumber-lord");
  });

  it("does not trigger at 4999 lifetime timber", () => {
    const result = checkAchievements(
      makeCtx({
        lifetimeResources: { timber: 4999, sap: 0, fruit: 0, acorns: 0 },
      }),
    );
    expect(result).not.toContain("lumber-lord");
  });
});

describe("resource-mogul", () => {
  it("triggers at 1000 of each resource", () => {
    const result = checkAchievements(
      makeCtx({
        lifetimeResources: {
          timber: 1000,
          sap: 1000,
          fruit: 1000,
          acorns: 1000,
        },
      }),
    );
    expect(result).toContain("resource-mogul");
  });

  it("does not trigger if any resource is below 1000", () => {
    const result = checkAchievements(
      makeCtx({
        lifetimeResources: {
          timber: 1000,
          sap: 999,
          fruit: 1000,
          acorns: 1000,
        },
      }),
    );
    expect(result).not.toContain("resource-mogul");
  });
});

describe("seed-hoarder", () => {
  it("triggers at 50 seeds of one species", () => {
    const result = checkAchievements(makeCtx({ maxSeedsOfOneSpecies: 50 }));
    expect(result).toContain("seed-hoarder");
  });

  it("does not trigger at 49 seeds", () => {
    const result = checkAchievements(makeCtx({ maxSeedsOfOneSpecies: 49 }));
    expect(result).not.toContain("seed-hoarder");
  });
});

// ---------------------------------------------------------------------------
// Wild Forest achievements (Phase 5 expansion)
// ---------------------------------------------------------------------------

describe("forager", () => {
  it("triggers at 50 wild trees harvested", () => {
    const result = checkAchievements(makeCtx({ wildTreesHarvested: 50 }));
    expect(result).toContain("forager");
  });

  it("does not trigger at 49 wild trees harvested", () => {
    const result = checkAchievements(makeCtx({ wildTreesHarvested: 49 }));
    expect(result).not.toContain("forager");
  });
});

describe("reforestation", () => {
  it("triggers at 10 wild trees regrown", () => {
    const result = checkAchievements(makeCtx({ wildTreesRegrown: 10 }));
    expect(result).toContain("reforestation");
  });

  it("does not trigger at 9 wild trees regrown", () => {
    const result = checkAchievements(makeCtx({ wildTreesRegrown: 9 }));
    expect(result).not.toContain("reforestation");
  });
});

describe("wild-collector", () => {
  it("triggers when all base species harvested from wild", () => {
    const result = checkAchievements(
      makeCtx({ wildSpeciesHarvested: [...ALL_BASE_SPECIES] }),
    );
    expect(result).toContain("wild-collector");
  });

  it("does not trigger with only 11 wild species harvested", () => {
    const result = checkAchievements(
      makeCtx({ wildSpeciesHarvested: ALL_BASE_SPECIES.slice(0, 11) }),
    );
    expect(result).not.toContain("wild-collector");
  });
});

// ---------------------------------------------------------------------------
// Expansion: already-unlocked filtering for new achievements
// ---------------------------------------------------------------------------

describe("expansion achievements are not re-awarded when already unlocked", () => {
  it("skips hydration-hero when already unlocked", () => {
    const result = checkAchievements(
      makeCtx({
        toolUseCounts: { "watering-can": 200 },
        unlockedAchievements: ["hydration-hero"],
      }),
    );
    expect(result).not.toContain("hydration-hero");
  });

  it("skips first-builder when already unlocked", () => {
    const result = checkAchievements(
      makeCtx({
        structuresBuilt: 5,
        unlockedAchievements: ["first-builder"],
      }),
    );
    expect(result).not.toContain("first-builder");
  });
});

// ---------------------------------------------------------------------------
// Already-unlocked filtering
// ---------------------------------------------------------------------------

describe("does not re-award already unlocked achievements", () => {
  it("skips first-seed when already unlocked", () => {
    const result = checkAchievements(
      makeCtx({
        treesPlanted: 10,
        unlockedAchievements: ["first-seed"],
      }),
    );
    expect(result).not.toContain("first-seed");
  });

  it("returns only newly earned IDs", () => {
    const result = checkAchievements(
      makeCtx({
        treesPlanted: 200,
        unlockedAchievements: ["first-seed", "seed-spreader"],
      }),
    );
    expect(result).not.toContain("first-seed");
    expect(result).not.toContain("seed-spreader");
    expect(result).toContain("forest-founder");
  });

  it("returns empty array when everything is already unlocked", () => {
    const allIds = ACHIEVEMENT_DEFS.map((a) => a.id);
    const result = checkAchievements(
      makeCtx({
        treesPlanted: 999,
        unlockedAchievements: allIds,
        hasPrestiged: true,
        seasonsExperienced: [...ALL_SEASONS],
        speciesPlanted: [...ALL_BASE_SPECIES],
        lifetimeResources: {
          timber: 9999,
          sap: 9999,
          fruit: 9999,
          acorns: 9999,
        },
        // Expansion fields fully satisfied
        visitedZoneTypes: ["forest", "meadow", "swamp", "mountain", "desert"],
        zonesDiscovered: 20,
        wildTreesHarvested: 100,
        wildTreesRegrown: 50,
        toolUseCounts: {
          "watering-can": 200,
          "pruning-shears": 100,
          shovel: 50,
        },
        unlockedToolCount: 12,
        treesPlantedInSpring: 50,
        treesHarvestedInAutumn: 50,
        treesSurvivedWinter: 50,
        structuresBuilt: 10,
        distinctStructureTypesBuilt: 4,
        hasMaxTierStructure: true,
        maxSeedsOfOneSpecies: 100,
        wildSpeciesHarvested: [...ALL_BASE_SPECIES],
      }),
    );
    expect(result).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Edge cases
// ---------------------------------------------------------------------------

describe("edge cases", () => {
  it("returns empty array for a brand-new player", () => {
    const result = checkAchievements(makeCtx());
    expect(result).toEqual([]);
  });

  it("handles missing resource keys gracefully", () => {
    const result = checkAchievements(makeCtx({ lifetimeResources: {} }));
    // Should not throw; timber-baron et al. simply not earned.
    expect(result).not.toContain("timber-baron");
    expect(result).not.toContain("sap-collector");
    expect(result).not.toContain("the-giving-tree");
  });

  it("awards multiple achievements in a single check", () => {
    const result = checkAchievements(
      makeCtx({
        treesPlanted: 55,
        seasonsExperienced: ["spring", "summer", "autumn", "winter"],
        currentTreeData: [
          { speciesId: "white-oak", stage: 4, gridX: 0, gridZ: 0 },
        ],
      }),
    );
    expect(result).toContain("first-seed");
    expect(result).toContain("seed-spreader");
    expect(result).toContain("seasonal-veteran");
    expect(result).toContain("patient-gardener");
    expect(result).toContain("old-growth-guardian");
  });
});
