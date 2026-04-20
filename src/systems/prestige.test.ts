import { describe, expect, it } from "vitest";
import {
  calculatePrestigeBonus,
  canPrestige,
  getActiveCosmetic,
  getCosmeticById,
  getPrestigeResetState,
  getUnlockedCosmetics,
  getUnlockedPrestigeSpecies,
  PRESTIGE_COSMETICS,
  PRESTIGE_MIN_LEVEL,
  PRESTIGE_SPECIES,
} from "./prestige";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

describe("PRESTIGE_SPECIES", () => {
  it("contains exactly 3 prestige species", () => {
    expect(PRESTIGE_SPECIES).toHaveLength(3);
  });

  it("has unique IDs", () => {
    const ids = PRESTIGE_SPECIES.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("species are ordered by ascending requiredPrestiges", () => {
    for (let i = 1; i < PRESTIGE_SPECIES.length; i++) {
      expect(PRESTIGE_SPECIES[i].requiredPrestiges).toBeGreaterThanOrEqual(
        PRESTIGE_SPECIES[i - 1].requiredPrestiges,
      );
    }
  });

  it("every species has a non-empty name", () => {
    for (const species of PRESTIGE_SPECIES) {
      expect(species.name.length).toBeGreaterThan(0);
    }
  });

  it("contains crystal-oak, moonwood-ash, and worldtree", () => {
    const ids = PRESTIGE_SPECIES.map((s) => s.id);
    expect(ids).toContain("crystal-oak");
    expect(ids).toContain("moonwood-ash");
    expect(ids).toContain("worldtree");
  });
});

describe("PRESTIGE_MIN_LEVEL", () => {
  it("is 25", () => {
    expect(PRESTIGE_MIN_LEVEL).toBe(25);
  });
});

// ---------------------------------------------------------------------------
// canPrestige
// ---------------------------------------------------------------------------

describe("canPrestige", () => {
  it("returns false at level 1", () => {
    expect(canPrestige(1)).toBe(false);
  });

  it("returns false at level 24", () => {
    expect(canPrestige(24)).toBe(false);
  });

  it("returns true at level 25", () => {
    expect(canPrestige(25)).toBe(true);
  });

  it("returns true at level 26", () => {
    expect(canPrestige(26)).toBe(true);
  });

  it("returns true at very high levels", () => {
    expect(canPrestige(100)).toBe(true);
  });

  it("returns false at level 0", () => {
    expect(canPrestige(0)).toBe(false);
  });

  it("returns false for negative levels", () => {
    expect(canPrestige(-5)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// calculatePrestigeBonus
// ---------------------------------------------------------------------------

describe("calculatePrestigeBonus", () => {
  it("returns neutral bonuses for prestige count 0", () => {
    const bonus = calculatePrestigeBonus(0);
    expect(bonus.growthSpeedMultiplier).toBe(1.0);
    expect(bonus.xpMultiplier).toBe(1.0);
    expect(bonus.staminaBonus).toBe(0);
    expect(bonus.harvestYieldMultiplier).toBe(1.0);
  });

  it("returns neutral bonuses for negative prestige count", () => {
    const bonus = calculatePrestigeBonus(-3);
    expect(bonus.growthSpeedMultiplier).toBe(1.0);
    expect(bonus.xpMultiplier).toBe(1.0);
    expect(bonus.staminaBonus).toBe(0);
    expect(bonus.harvestYieldMultiplier).toBe(1.0);
  });

  it("returns correct bonuses for prestige count 1", () => {
    const bonus = calculatePrestigeBonus(1);
    expect(bonus.growthSpeedMultiplier).toBeCloseTo(1.1);
    expect(bonus.xpMultiplier).toBeCloseTo(1.1);
    expect(bonus.staminaBonus).toBe(10);
    expect(bonus.harvestYieldMultiplier).toBeCloseTo(1.05);
  });

  it("returns correct bonuses for prestige count 2", () => {
    const bonus = calculatePrestigeBonus(2);
    expect(bonus.growthSpeedMultiplier).toBeCloseTo(1.2);
    expect(bonus.xpMultiplier).toBeCloseTo(1.2);
    expect(bonus.staminaBonus).toBe(20);
    expect(bonus.harvestYieldMultiplier).toBeCloseTo(1.1);
  });

  it("returns correct bonuses for prestige count 3", () => {
    const bonus = calculatePrestigeBonus(3);
    expect(bonus.growthSpeedMultiplier).toBeCloseTo(1.35);
    expect(bonus.xpMultiplier).toBeCloseTo(1.3);
    expect(bonus.staminaBonus).toBe(30);
    expect(bonus.harvestYieldMultiplier).toBeCloseTo(1.2);
  });

  it("returns correct bonuses for prestige count 4 (overflow formula)", () => {
    const bonus = calculatePrestigeBonus(4);
    // growth = 1.35 + 0.05*(4-3) = 1.40
    expect(bonus.growthSpeedMultiplier).toBeCloseTo(1.4);
    // xp = 1.30 + 0.05*(4-3) = 1.35
    expect(bonus.xpMultiplier).toBeCloseTo(1.35);
    // stamina = 30 + 5*(4-3) = 35
    expect(bonus.staminaBonus).toBe(35);
    // harvest = 1.20 + 0.05*(4-3) = 1.25
    expect(bonus.harvestYieldMultiplier).toBeCloseTo(1.25);
  });

  it("returns correct bonuses for prestige count 5", () => {
    const bonus = calculatePrestigeBonus(5);
    // growth = 1.35 + 0.05*(5-3) = 1.45
    expect(bonus.growthSpeedMultiplier).toBeCloseTo(1.45);
    // xp = 1.30 + 0.05*(5-3) = 1.40
    expect(bonus.xpMultiplier).toBeCloseTo(1.4);
    // stamina = 30 + 5*(5-3) = 40
    expect(bonus.staminaBonus).toBe(40);
    // harvest = 1.20 + 0.05*(5-3) = 1.30
    expect(bonus.harvestYieldMultiplier).toBeCloseTo(1.3);
  });

  it("scales correctly for high prestige count (10)", () => {
    const bonus = calculatePrestigeBonus(10);
    // growth = 1.35 + 0.05*(10-3) = 1.35 + 0.35 = 1.70
    expect(bonus.growthSpeedMultiplier).toBeCloseTo(1.7);
    // xp = 1.30 + 0.05*(10-3) = 1.30 + 0.35 = 1.65
    expect(bonus.xpMultiplier).toBeCloseTo(1.65);
    // stamina = 30 + 5*(10-3) = 30 + 35 = 65
    expect(bonus.staminaBonus).toBe(65);
    // harvest = 1.20 + 0.05*(10-3) = 1.20 + 0.35 = 1.55
    expect(bonus.harvestYieldMultiplier).toBeCloseTo(1.55);
  });

  it("scales correctly for very high prestige count (20)", () => {
    const bonus = calculatePrestigeBonus(20);
    // growth = 1.35 + 0.05*17 = 1.35 + 0.85 = 2.20
    expect(bonus.growthSpeedMultiplier).toBeCloseTo(2.2);
    // xp = 1.30 + 0.05*17 = 1.30 + 0.85 = 2.15
    expect(bonus.xpMultiplier).toBeCloseTo(2.15);
    // stamina = 30 + 5*17 = 30 + 85 = 115
    expect(bonus.staminaBonus).toBe(115);
    // harvest = 1.20 + 0.05*17 = 1.20 + 0.85 = 2.05
    expect(bonus.harvestYieldMultiplier).toBeCloseTo(2.05);
  });

  it("returns a new object each call (no shared references)", () => {
    const a = calculatePrestigeBonus(1);
    const b = calculatePrestigeBonus(1);
    expect(a).not.toBe(b);
    expect(a).toEqual(b);
  });

  it("bonuses increase monotonically from count 1 to 10", () => {
    let prev = calculatePrestigeBonus(1);
    for (let n = 2; n <= 10; n++) {
      const curr = calculatePrestigeBonus(n);
      expect(curr.growthSpeedMultiplier).toBeGreaterThan(
        prev.growthSpeedMultiplier,
      );
      expect(curr.xpMultiplier).toBeGreaterThan(prev.xpMultiplier);
      expect(curr.staminaBonus).toBeGreaterThan(prev.staminaBonus);
      expect(curr.harvestYieldMultiplier).toBeGreaterThan(
        prev.harvestYieldMultiplier,
      );
      prev = curr;
    }
  });
});

// ---------------------------------------------------------------------------
// getUnlockedPrestigeSpecies
// ---------------------------------------------------------------------------

describe("getUnlockedPrestigeSpecies", () => {
  it("returns empty array for prestige count 0", () => {
    const result = getUnlockedPrestigeSpecies(0);
    expect(result).toEqual([]);
  });

  it("returns empty array for negative prestige count", () => {
    const result = getUnlockedPrestigeSpecies(-1);
    expect(result).toEqual([]);
  });

  it("returns 1 species at prestige count 1 (crystal-oak)", () => {
    const result = getUnlockedPrestigeSpecies(1);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("crystal-oak");
  });

  it("returns 2 species at prestige count 2", () => {
    const result = getUnlockedPrestigeSpecies(2);
    expect(result).toHaveLength(2);
    const ids = result.map((s) => s.id);
    expect(ids).toContain("crystal-oak");
    expect(ids).toContain("moonwood-ash");
  });

  it("returns all 3 species at prestige count 3", () => {
    const result = getUnlockedPrestigeSpecies(3);
    expect(result).toHaveLength(3);
    const ids = result.map((s) => s.id);
    expect(ids).toContain("crystal-oak");
    expect(ids).toContain("moonwood-ash");
    expect(ids).toContain("worldtree");
  });

  it("returns all 3 species at prestige count above 3", () => {
    const result = getUnlockedPrestigeSpecies(10);
    expect(result).toHaveLength(3);
  });

  it("returns copies — no shared references with PRESTIGE_SPECIES", () => {
    const result = getUnlockedPrestigeSpecies(3);
    // The filtered array is a new array
    expect(result).not.toBe(PRESTIGE_SPECIES);
  });
});

// ---------------------------------------------------------------------------
// getPrestigeResetState
// ---------------------------------------------------------------------------

describe("getPrestigeResetState", () => {
  it("resets level to 1", () => {
    const state = getPrestigeResetState();
    expect(state.level).toBe(1);
  });

  it("resets xp to 0", () => {
    const state = getPrestigeResetState();
    expect(state.xp).toBe(0);
  });

  it("resets all tree counters to 0", () => {
    const state = getPrestigeResetState();
    expect(state.treesPlanted).toBe(0);
    expect(state.treesHarvested).toBe(0);
    expect(state.treesWatered).toBe(0);
    expect(state.treesMatured).toBe(0);
  });

  it("resets all resources to 0", () => {
    const state = getPrestigeResetState();
    expect(state.resources).toEqual({
      timber: 0,
      sap: 0,
      fruit: 0,
      acorns: 0,
    });
  });

  it("resets seeds to starter kit (10 white-oak)", () => {
    const state = getPrestigeResetState();
    expect(state.seeds).toEqual({ "white-oak": 10 });
  });

  it("resets groveData to null", () => {
    const state = getPrestigeResetState();
    expect(state.groveData).toBeNull();
  });

  it("returns a new object each call (no shared references)", () => {
    const a = getPrestigeResetState();
    const b = getPrestigeResetState();
    expect(a).not.toBe(b);
    expect(a.resources).not.toBe(b.resources);
    expect(a.seeds).not.toBe(b.seeds);
    expect(a).toEqual(b);
  });

  it("does not include achievements, settings, or prestige count", () => {
    const state = getPrestigeResetState();
    const keys = Object.keys(state);
    expect(keys).not.toContain("achievements");
    expect(keys).not.toContain("prestigeCount");
    expect(keys).not.toContain("hapticsEnabled");
    expect(keys).not.toContain("soundEnabled");
    expect(keys).not.toContain("hasSeenRules");
    expect(keys).not.toContain("seasonsExperienced");
    expect(keys).not.toContain("speciesPlanted");
  });
});

// ---------------------------------------------------------------------------
// PRESTIGE_COSMETICS
// ---------------------------------------------------------------------------

describe("PRESTIGE_COSMETICS", () => {
  it("contains exactly 5 cosmetics", () => {
    expect(PRESTIGE_COSMETICS).toHaveLength(5);
  });

  it("has unique IDs", () => {
    const ids = PRESTIGE_COSMETICS.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("cosmetics are ordered by ascending prestigeRequired", () => {
    for (let i = 1; i < PRESTIGE_COSMETICS.length; i++) {
      expect(PRESTIGE_COSMETICS[i].prestigeRequired).toBeGreaterThanOrEqual(
        PRESTIGE_COSMETICS[i - 1].prestigeRequired,
      );
    }
  });

  it("every cosmetic has a non-empty name and description", () => {
    for (const cosmetic of PRESTIGE_COSMETICS) {
      expect(cosmetic.name.length).toBeGreaterThan(0);
      expect(cosmetic.description.length).toBeGreaterThan(0);
    }
  });

  it("every cosmetic has borderColor and borderStyle", () => {
    for (const cosmetic of PRESTIGE_COSMETICS) {
      expect(cosmetic.borderColor.length).toBeGreaterThan(0);
      expect(cosmetic.borderStyle.length).toBeGreaterThan(0);
    }
  });

  it("first cosmetic requires prestige 1", () => {
    expect(PRESTIGE_COSMETICS[0].prestigeRequired).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// getUnlockedCosmetics
// ---------------------------------------------------------------------------

describe("getUnlockedCosmetics", () => {
  it("returns empty array for prestige count 0", () => {
    const result = getUnlockedCosmetics(0);
    expect(result).toEqual([]);
  });

  it("returns empty array for negative prestige count", () => {
    const result = getUnlockedCosmetics(-1);
    expect(result).toEqual([]);
  });

  it("returns 1 cosmetic at prestige count 1", () => {
    const result = getUnlockedCosmetics(1);
    expect(result).toHaveLength(1);
    expect(result[0].prestigeRequired).toBe(1);
  });

  it("returns 2 cosmetics at prestige count 2", () => {
    const result = getUnlockedCosmetics(2);
    expect(result).toHaveLength(2);
    expect(result.every((c) => c.prestigeRequired <= 2)).toBe(true);
  });

  it("returns 3 cosmetics at prestige count 3", () => {
    const result = getUnlockedCosmetics(3);
    expect(result).toHaveLength(3);
  });

  it("returns 4 cosmetics at prestige count 4", () => {
    const result = getUnlockedCosmetics(4);
    expect(result).toHaveLength(4);
  });

  it("returns all 5 cosmetics at prestige count 5", () => {
    const result = getUnlockedCosmetics(5);
    expect(result).toHaveLength(5);
  });

  it("returns all 5 cosmetics at prestige count above 5", () => {
    const result = getUnlockedCosmetics(10);
    expect(result).toHaveLength(5);
  });

  it("returns new array each call", () => {
    const a = getUnlockedCosmetics(3);
    const b = getUnlockedCosmetics(3);
    expect(a).not.toBe(b);
    expect(a).toEqual(b);
  });
});

// ---------------------------------------------------------------------------
// getActiveCosmetic
// ---------------------------------------------------------------------------

describe("getActiveCosmetic", () => {
  it("returns null for prestige count 0", () => {
    const result = getActiveCosmetic(0);
    expect(result).toBeNull();
  });

  it("returns null for negative prestige count", () => {
    const result = getActiveCosmetic(-1);
    expect(result).toBeNull();
  });

  it("returns the tier-1 cosmetic at prestige count 1", () => {
    const result = getActiveCosmetic(1);
    expect(result).not.toBeNull();
    expect(result?.prestigeRequired).toBe(1);
  });

  it("returns the tier-2 cosmetic at prestige count 2", () => {
    const result = getActiveCosmetic(2);
    expect(result).not.toBeNull();
    expect(result?.prestigeRequired).toBe(2);
  });

  it("returns the highest-tier unlocked cosmetic at prestige count 3", () => {
    const result = getActiveCosmetic(3);
    expect(result).not.toBeNull();
    expect(result?.prestigeRequired).toBe(3);
  });

  it("returns the tier-5 cosmetic at prestige count 5", () => {
    const result = getActiveCosmetic(5);
    expect(result).not.toBeNull();
    expect(result?.prestigeRequired).toBe(5);
  });

  it("returns the tier-5 cosmetic at prestige count above 5", () => {
    const result = getActiveCosmetic(10);
    expect(result).not.toBeNull();
    expect(result?.prestigeRequired).toBe(5);
  });
});

// ---------------------------------------------------------------------------
// getCosmeticById
// ---------------------------------------------------------------------------

describe("getCosmeticById", () => {
  it("returns null for unknown ID", () => {
    const result = getCosmeticById("unknown-id");
    expect(result).toBeNull();
  });

  it("returns the cosmetic for a valid ID", () => {
    const firstCosmetic = PRESTIGE_COSMETICS[0];
    const result = getCosmeticById(firstCosmetic.id);
    expect(result).not.toBeNull();
    expect(result?.id).toBe(firstCosmetic.id);
    expect(result?.name).toBe(firstCosmetic.name);
  });

  it("returns stone-wall cosmetic", () => {
    const result = getCosmeticById("stone-wall");
    expect(result).not.toBeNull();
    expect(result?.name).toBe("Stone Wall");
  });

  it("returns fairy-lights cosmetic", () => {
    const result = getCosmeticById("fairy-lights");
    expect(result).not.toBeNull();
    expect(result?.name).toBe("Fairy Lights");
    expect(result?.glowColor).toBeTruthy();
  });

  it("returns ancient-runes cosmetic", () => {
    const result = getCosmeticById("ancient-runes");
    expect(result).not.toBeNull();
    expect(result?.name).toBe("Ancient Runes");
  });
});
