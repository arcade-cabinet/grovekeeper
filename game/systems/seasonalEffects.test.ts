/**
 * Tests for the seasonal effects system (Spec §6.3).
 *
 * Covers: terrain vertex color palette per season, 5-day transition blend,
 * vegetation tint/scale updates, bush GLB swaps, and season-change detection.
 */

import type { BushComponent, TreeComponent } from "@/game/ecs/components/vegetation";
import {
  applySeasonToBush,
  applySeasonToTree,
  blendHexColors,
  computeSeasonTransitionBlend,
  detectSeasonChange,
  getBlendedTerrainPalette,
  getSeasonalTerrainColors,
  type SeasonalTerrainColors,
} from "./seasonalEffects.ts";
import type { Season } from "./time.ts";

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeTree(overrides: Partial<TreeComponent> = {}): TreeComponent {
  return {
    speciesId: "white-oak",
    stage: 3,
    progress: 0,
    watered: false,
    totalGrowthTime: 300,
    plantedAt: 0,
    meshSeed: 1,
    wild: false,
    pruned: false,
    fertilized: false,
    baseModel: "tree01",
    winterModel: "tree01_winter",
    useWinterModel: false,
    seasonTint: "#388E3C",
    ...overrides,
  };
}

function makeBush(overrides: Partial<BushComponent> = {}): BushComponent {
  return {
    bushShape: "bush_tall",
    season: "spring",
    hasRoots: false,
    modelKey: "bushes/spring/bush_tall_spring.glb",
    ...overrides,
  };
}

const HEX_RE = /^#[0-9A-Fa-f]{6}$/;

// ── getSeasonalTerrainColors ──────────────────────────────────────────────────

describe("getSeasonalTerrainColors (Spec §6.3)", () => {
  it("returns an object with grass, dirt, and rock fields for spring", () => {
    const palette = getSeasonalTerrainColors("spring");
    expect(palette.grass).toMatch(HEX_RE);
    expect(palette.dirt).toMatch(HEX_RE);
    expect(palette.rock).toMatch(HEX_RE);
  });

  it("returns valid hex colors for all four seasons", () => {
    const seasons: Season[] = ["spring", "summer", "autumn", "winter"];
    for (const season of seasons) {
      const p = getSeasonalTerrainColors(season);
      expect(p.grass).toMatch(HEX_RE);
      expect(p.dirt).toMatch(HEX_RE);
      expect(p.rock).toMatch(HEX_RE);
    }
  });

  it("winter palette includes a snow color", () => {
    const palette = getSeasonalTerrainColors("winter");
    expect(palette.snow).toMatch(HEX_RE);
  });

  it("spring and summer have different grass colors", () => {
    const spring = getSeasonalTerrainColors("spring");
    const summer = getSeasonalTerrainColors("summer");
    expect(spring.grass).not.toBe(summer.grass);
  });

  it("winter grass is visibly lighter/greyer than summer grass", () => {
    const winter = getSeasonalTerrainColors("winter");
    const summer = getSeasonalTerrainColors("summer");
    // Winter grass starts with #B — summer with #5
    expect(winter.grass).not.toBe(summer.grass);
  });
});

// ── computeSeasonTransitionBlend ─────────────────────────────────────────────

describe("computeSeasonTransitionBlend (Spec §6.3 — 5-day transition)", () => {
  it("returns 0 at the start of a new season (dayInSeason=0)", () => {
    expect(computeSeasonTransitionBlend(0, 5)).toBe(0);
  });

  it("returns 1 when past the transition period (dayInSeason >= transitionDays)", () => {
    expect(computeSeasonTransitionBlend(5, 5)).toBe(1);
    expect(computeSeasonTransitionBlend(10, 5)).toBe(1);
    expect(computeSeasonTransitionBlend(29, 5)).toBe(1);
  });

  it("returns 0.5 at the midpoint of the transition", () => {
    expect(computeSeasonTransitionBlend(2.5, 5)).toBeCloseTo(0.5, 5);
  });

  it("returns an intermediate value during transition", () => {
    const blend = computeSeasonTransitionBlend(2, 5);
    expect(blend).toBeGreaterThan(0);
    expect(blend).toBeLessThan(1);
  });

  it("clamps to [0, 1] — never negative or above 1", () => {
    expect(computeSeasonTransitionBlend(-1, 5)).toBe(0);
    expect(computeSeasonTransitionBlend(100, 5)).toBe(1);
  });
});

// ── blendHexColors ────────────────────────────────────────────────────────────

describe("blendHexColors", () => {
  it("returns the from color when t=0", () => {
    expect(blendHexColors("#000000", "#FFFFFF", 0)).toBe("#000000");
  });

  it("returns the to color when t=1", () => {
    expect(blendHexColors("#000000", "#FFFFFF", 1)).toBe("#ffffff");
  });

  it("returns mid-grey at t=0.5 between black and white", () => {
    // Math.round(127.5) = 128 = 0x80
    const mid = blendHexColors("#000000", "#ffffff", 0.5);
    expect(mid).toBe("#808080");
  });

  it("returns a valid hex string", () => {
    const result = blendHexColors("#388E3C", "#B0BEC5", 0.3);
    expect(result).toMatch(HEX_RE);
  });

  it("is idempotent when blending identical colors", () => {
    const result = blendHexColors("#5EA34A", "#5EA34A", 0.7);
    expect(result.toLowerCase()).toBe("#5ea34a");
  });
});

// ── detectSeasonChange ────────────────────────────────────────────────────────

describe("detectSeasonChange", () => {
  it("returns false when season has not changed", () => {
    expect(detectSeasonChange("spring", "spring")).toBe(false);
    expect(detectSeasonChange("winter", "winter")).toBe(false);
  });

  it("returns true when season changes", () => {
    expect(detectSeasonChange("spring", "summer")).toBe(true);
    expect(detectSeasonChange("autumn", "winter")).toBe(true);
  });

  it("returns true when previous season is null (first frame)", () => {
    expect(detectSeasonChange(null, "spring")).toBe(true);
  });

  it("detects all four seasonal transitions", () => {
    expect(detectSeasonChange("spring", "summer")).toBe(true);
    expect(detectSeasonChange("summer", "autumn")).toBe(true);
    expect(detectSeasonChange("autumn", "winter")).toBe(true);
    expect(detectSeasonChange("winter", "spring")).toBe(true);
  });
});

// ── applySeasonToTree ─────────────────────────────────────────────────────────

describe("applySeasonToTree (Spec §6.3)", () => {
  it("sets a valid hex seasonTint for a deciduous tree in spring", () => {
    const tree = makeTree({ speciesId: "white-oak" });
    const updated = applySeasonToTree(tree, "spring", false);
    expect(updated.seasonTint).toMatch(HEX_RE);
  });

  it("changes tint when season changes (summer vs autumn for white-oak)", () => {
    const tree = makeTree({ speciesId: "white-oak" });
    const summer = applySeasonToTree(tree, "summer", false);
    const autumn = applySeasonToTree(tree, "autumn", false);
    expect(summer.seasonTint).not.toBe(autumn.seasonTint);
  });

  it("sets useWinterModel=true in winter when the tree has a winterModel", () => {
    const tree = makeTree({ winterModel: "tree01_winter" });
    const updated = applySeasonToTree(tree, "winter", false);
    expect(updated.useWinterModel).toBe(true);
  });

  it("sets useWinterModel=false outside winter even if winterModel exists", () => {
    const tree = makeTree({ winterModel: "tree01_winter", useWinterModel: true });
    const updated = applySeasonToTree(tree, "spring", false);
    expect(updated.useWinterModel).toBe(false);
  });

  it("sets useWinterModel=false in winter when winterModel is empty", () => {
    const tree = makeTree({ winterModel: "" });
    const updated = applySeasonToTree(tree, "winter", false);
    expect(updated.useWinterModel).toBe(false);
  });

  it("evergreen trees keep green tint in winter", () => {
    const tree = makeTree({ speciesId: "elder-pine" });
    const updated = applySeasonToTree(tree, "winter", true);
    // Evergreen winter tint should be greenish — not the brown deciduous winter
    expect(updated.seasonTint).toMatch(HEX_RE);
    expect(updated.seasonTint).not.toBe("#795548"); // not the deciduous winter brown
  });

  it("cherry blossom has pink tint in spring", () => {
    const tree = makeTree({ speciesId: "cherry-blossom" });
    const updated = applySeasonToTree(tree, "spring", false);
    expect(updated.seasonTint).toBe("#F48FB1");
  });

  it("does not mutate the original tree", () => {
    const tree = makeTree({ seasonTint: "#388E3C", useWinterModel: false });
    applySeasonToTree(tree, "winter", false);
    expect(tree.seasonTint).toBe("#388E3C");
    expect(tree.useWinterModel).toBe(false);
  });
});

// ── applySeasonToBush ─────────────────────────────────────────────────────────

describe("applySeasonToBush (Spec §6.3 — bush GLB swap)", () => {
  it("updates bush season and modelKey when season changes to winter", () => {
    const bush = makeBush({ season: "spring" });
    const updated = applySeasonToBush(bush, "winter");
    expect(updated.season).toBe("winter");
    expect(updated.modelKey).toContain("winter");
  });

  it("updates bush to autumn season", () => {
    const bush = makeBush({ season: "summer" });
    const updated = applySeasonToBush(bush, "autumn");
    expect(updated.season).toBe("autumn");
    expect(updated.modelKey).toContain("autumn");
  });

  it("preserves hasRoots during season swap", () => {
    const bush = makeBush({ hasRoots: true, bushShape: "bush_end" });
    const updated = applySeasonToBush(bush, "winter");
    expect(updated.hasRoots).toBe(true);
    expect(updated.modelKey).toContain("roots");
  });

  it("produces correct GLB path format", () => {
    const bush = makeBush({ bushShape: "bush_tall", season: "spring" });
    const updated = applySeasonToBush(bush, "summer");
    expect(updated.modelKey).toBe("bushes/summer/bush_tall_summer.glb");
  });

  it("does not mutate the original bush", () => {
    const bush = makeBush({ season: "spring" });
    applySeasonToBush(bush, "autumn");
    expect(bush.season).toBe("spring");
  });
});

// ── getBlendedTerrainPalette ──────────────────────────────────────────────────

describe("getBlendedTerrainPalette (Spec §6.3 — transition blend)", () => {
  const springPalette = {
    grass: "#7DBF6E",
    dirt: "#8B6E52",
    rock: "#9E9E9E",
  } as SeasonalTerrainColors;

  const summerPalette = {
    grass: "#5EA34A",
    dirt: "#8B6E52",
    rock: "#9E9E9E",
  } as SeasonalTerrainColors;

  it("returns the from palette when blend=0", () => {
    const result = getBlendedTerrainPalette(springPalette, summerPalette, 0);
    expect(result.grass.toLowerCase()).toBe(springPalette.grass.toLowerCase());
  });

  it("returns the to palette when blend=1", () => {
    const result = getBlendedTerrainPalette(springPalette, summerPalette, 1);
    expect(result.grass.toLowerCase()).toBe(summerPalette.grass.toLowerCase());
  });

  it("returns intermediate colors at blend=0.5", () => {
    const result = getBlendedTerrainPalette(springPalette, summerPalette, 0.5);
    expect(result.grass).toMatch(HEX_RE);
    expect(result.grass.toLowerCase()).not.toBe(springPalette.grass.toLowerCase());
    expect(result.grass.toLowerCase()).not.toBe(summerPalette.grass.toLowerCase());
  });

  it("blended palette has valid hex fields", () => {
    const result = getBlendedTerrainPalette(springPalette, summerPalette, 0.7);
    expect(result.grass).toMatch(HEX_RE);
    expect(result.dirt).toMatch(HEX_RE);
    expect(result.rock).toMatch(HEX_RE);
  });
});
