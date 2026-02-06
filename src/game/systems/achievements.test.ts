import { describe, it, expect } from "vitest";
import {
  checkAchievements,
  ACHIEVEMENT_DEFS,
  ALL_BASE_SPECIES,
  ALL_SEASONS,
  type AchievementCheckContext,
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
    treesMatured: 0,
    treesHarvested: 0,
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
  it("contains exactly 15 achievements", () => {
    expect(ACHIEVEMENT_DEFS).toHaveLength(15);
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
  it("requires all 8 species in speciesPlanted", () => {
    const result = checkAchievements(
      makeCtx({ speciesPlanted: [...ALL_BASE_SPECIES] }),
    );
    expect(result).toContain("one-of-each");
  });

  it("does not trigger with only 7 species", () => {
    const result = checkAchievements(
      makeCtx({ speciesPlanted: ALL_BASE_SPECIES.slice(0, 7) }),
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
        currentTreeData: [{ speciesId: "white-oak", stage: 3, gridX: 0, gridZ: 0 }],
      }),
    );
    expect(result).toContain("patient-gardener");
  });

  it("patient-gardener also triggers with stage 4", () => {
    const result = checkAchievements(
      makeCtx({
        currentTreeData: [{ speciesId: "white-oak", stage: 4, gridX: 0, gridZ: 0 }],
      }),
    );
    expect(result).toContain("patient-gardener");
  });

  it("patient-gardener does not trigger with stage 2", () => {
    const result = checkAchievements(
      makeCtx({
        currentTreeData: [{ speciesId: "white-oak", stage: 2, gridX: 0, gridZ: 0 }],
      }),
    );
    expect(result).not.toContain("patient-gardener");
  });

  it("old-growth-guardian triggers with a stage 4 tree", () => {
    const result = checkAchievements(
      makeCtx({
        currentTreeData: [{ speciesId: "white-oak", stage: 4, gridX: 0, gridZ: 0 }],
      }),
    );
    expect(result).toContain("old-growth-guardian");
  });

  it("old-growth-guardian does not trigger with stage 3", () => {
    const result = checkAchievements(
      makeCtx({
        currentTreeData: [{ speciesId: "white-oak", stage: 3, gridX: 0, gridZ: 0 }],
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
  it("triggers when currentTreeData.length >= gridSize^2", () => {
    const trees = Array.from({ length: 144 }, (_, i) => ({
      speciesId: "white-oak",
      stage: 0,
      gridX: i % 12,
      gridZ: Math.floor(i / 12),
    }));
    const result = checkAchievements(makeCtx({ currentTreeData: trees }));
    expect(result).toContain("full-grove");
  });

  it("does not trigger at 143 trees on a 12x12 grid", () => {
    const trees = Array.from({ length: 143 }, (_, i) => ({
      speciesId: "white-oak",
      stage: 0,
      gridX: i % 12,
      gridZ: Math.floor(i / 12),
    }));
    const result = checkAchievements(makeCtx({ currentTreeData: trees }));
    expect(result).not.toContain("full-grove");
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
        lifetimeResources: { timber: 9999, sap: 9999, fruit: 9999, acorns: 9999 },
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
    const result = checkAchievements(
      makeCtx({ lifetimeResources: {} }),
    );
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
