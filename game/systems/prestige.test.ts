import {
  calculatePrestigeBonus,
  canPrestige,
  generateNewWorldSeed,
  getActiveCosmetic,
  getCosmeticById,
  getPrestigeResetState,
  getUnlockedCosmetics,
  getUnlockedPrestigeSpecies,
  PRESTIGE_MIN_LEVEL,
} from "./prestige";
import { emptyResources } from "@/game/config/resources";

describe("prestige system", () => {
  describe("canPrestige", () => {
    it("returns false below level 25", () => {
      expect(canPrestige(24)).toBe(false);
      expect(canPrestige(1)).toBe(false);
      expect(canPrestige(0)).toBe(false);
    });

    it("returns true at level 25", () => {
      expect(canPrestige(25)).toBe(true);
    });

    it("returns true above level 25", () => {
      expect(canPrestige(30)).toBe(true);
    });

    it("uses PRESTIGE_MIN_LEVEL constant (25)", () => {
      expect(PRESTIGE_MIN_LEVEL).toBe(25);
    });
  });

  describe("calculatePrestigeBonus", () => {
    it("returns neutral bonuses for prestige count 0", () => {
      const bonus = calculatePrestigeBonus(0);
      expect(bonus.growthSpeedMultiplier).toBe(1.0);
      expect(bonus.xpMultiplier).toBe(1.0);
      expect(bonus.staminaBonus).toBe(0);
      expect(bonus.harvestYieldMultiplier).toBe(1.0);
      expect(bonus.buildCostMultiplier).toBe(1.0);
    });

    it("returns neutral bonuses for negative prestige count", () => {
      const bonus = calculatePrestigeBonus(-1);
      expect(bonus.growthSpeedMultiplier).toBe(1.0);
    });

    it("returns prestige 1 bonuses", () => {
      const bonus = calculatePrestigeBonus(1);
      expect(bonus.growthSpeedMultiplier).toBe(1.1);
      expect(bonus.xpMultiplier).toBe(1.1);
      expect(bonus.staminaBonus).toBe(10);
      expect(bonus.harvestYieldMultiplier).toBe(1.05);
    });

    it("returns prestige 2 bonuses", () => {
      const bonus = calculatePrestigeBonus(2);
      expect(bonus.growthSpeedMultiplier).toBe(1.2);
      expect(bonus.xpMultiplier).toBe(1.2);
      expect(bonus.staminaBonus).toBe(20);
      expect(bonus.harvestYieldMultiplier).toBe(1.1);
    });

    it("returns prestige 3 bonuses", () => {
      const bonus = calculatePrestigeBonus(3);
      expect(bonus.growthSpeedMultiplier).toBe(1.35);
      expect(bonus.xpMultiplier).toBe(1.3);
      expect(bonus.staminaBonus).toBe(30);
      expect(bonus.harvestYieldMultiplier).toBe(1.2);
    });

    it("scales linearly beyond prestige 3", () => {
      const bonus4 = calculatePrestigeBonus(4);
      expect(bonus4.growthSpeedMultiplier).toBeCloseTo(1.4, 10);
      expect(bonus4.xpMultiplier).toBeCloseTo(1.35, 10);
      expect(bonus4.staminaBonus).toBe(35);
      expect(bonus4.harvestYieldMultiplier).toBeCloseTo(1.25, 10);
    });

    it("scales correctly at prestige 6", () => {
      const bonus = calculatePrestigeBonus(6);
      // overflow = 3
      expect(bonus.growthSpeedMultiplier).toBeCloseTo(1.5, 10);
      expect(bonus.xpMultiplier).toBeCloseTo(1.45, 10);
      expect(bonus.staminaBonus).toBe(45);
      expect(bonus.harvestYieldMultiplier).toBeCloseTo(1.35, 10);
    });
  });

  describe("getUnlockedPrestigeSpecies", () => {
    it("returns empty array at prestige 0", () => {
      expect(getUnlockedPrestigeSpecies(0)).toEqual([]);
    });

    it("unlocks Crystal Oak at prestige 1", () => {
      const species = getUnlockedPrestigeSpecies(1);
      expect(species).toHaveLength(1);
      expect(species[0].id).toBe("crystal-oak");
    });

    it("unlocks Moonwood Ash at prestige 2", () => {
      const species = getUnlockedPrestigeSpecies(2);
      expect(species).toHaveLength(2);
      expect(species.map((s) => s.id)).toContain("moonwood-ash");
    });

    it("unlocks all 3 prestige species at prestige 3+", () => {
      const species = getUnlockedPrestigeSpecies(3);
      expect(species).toHaveLength(3);
      expect(species.map((s) => s.id)).toEqual(["crystal-oak", "moonwood-ash", "worldtree"]);
    });
  });

  describe("getUnlockedCosmetics", () => {
    it("returns empty at prestige 0", () => {
      expect(getUnlockedCosmetics(0)).toEqual([]);
    });

    it("unlocks Stone Wall at prestige 1", () => {
      const cosmetics = getUnlockedCosmetics(1);
      expect(cosmetics).toHaveLength(1);
      expect(cosmetics[0].id).toBe("stone-wall");
    });

    it("unlocks all 5 cosmetics at prestige 5+", () => {
      const cosmetics = getUnlockedCosmetics(5);
      expect(cosmetics).toHaveLength(5);
    });
  });

  describe("getActiveCosmetic", () => {
    it("returns null at prestige 0", () => {
      expect(getActiveCosmetic(0)).toBeNull();
    });

    it("returns the highest unlocked cosmetic", () => {
      const cosmetic = getActiveCosmetic(3);
      expect(cosmetic).not.toBeNull();
      expect(cosmetic!.id).toBe("fairy-lights");
    });

    it("returns Ancient Runes at prestige 5", () => {
      const cosmetic = getActiveCosmetic(5);
      expect(cosmetic!.id).toBe("ancient-runes");
    });
  });

  describe("getCosmeticById", () => {
    it("finds a cosmetic by ID", () => {
      const cosmetic = getCosmeticById("flower-hedge");
      expect(cosmetic).not.toBeNull();
      expect(cosmetic!.name).toBe("Flower Hedge");
    });

    it("returns null for unknown ID", () => {
      expect(getCosmeticById("nonexistent")).toBeNull();
    });
  });

  describe("getPrestigeResetState", () => {
    it("resets to level 1 with zero resources", () => {
      const state = getPrestigeResetState();
      expect(state.level).toBe(1);
      expect(state.xp).toBe(0);
      expect(state.resources).toEqual(emptyResources());
    });

    it("gives 10 white-oak seeds", () => {
      const state = getPrestigeResetState();
      expect(state.seeds).toEqual({ "white-oak": 10 });
    });

    it("resets all stats to zero", () => {
      const state = getPrestigeResetState();
      expect(state.treesPlanted).toBe(0);
      expect(state.treesHarvested).toBe(0);
      expect(state.treesWatered).toBe(0);
      expect(state.treesMatured).toBe(0);
    });

    it("nullifies grove data", () => {
      const state = getPrestigeResetState();
      expect(state.groveData).toBeNull();
    });
  });

  describe("buildCostMultiplier bonus (Spec §16.3)", () => {
    it("returns 0.95 build cost discount at prestige 1", () => {
      expect(calculatePrestigeBonus(1).buildCostMultiplier).toBe(0.95);
    });

    it("returns 0.9 at prestige 2", () => {
      expect(calculatePrestigeBonus(2).buildCostMultiplier).toBe(0.9);
    });

    it("returns 0.85 at prestige 3", () => {
      expect(calculatePrestigeBonus(3).buildCostMultiplier).toBe(0.85);
    });

    it("decreases by 0.05 per prestige beyond 3", () => {
      expect(calculatePrestigeBonus(4).buildCostMultiplier).toBeCloseTo(0.8, 10);
      expect(calculatePrestigeBonus(5).buildCostMultiplier).toBeCloseTo(0.75, 10);
    });

    it("floors at 0.5 for very high prestige", () => {
      const bonus = calculatePrestigeBonus(100);
      expect(bonus.buildCostMultiplier).toBeGreaterThanOrEqual(0.5);
      expect(bonus.buildCostMultiplier).toBe(0.5);
    });
  });

  describe("generateNewWorldSeed (Spec §16.3)", () => {
    it("returns a non-empty string", () => {
      const seed = generateNewWorldSeed();
      expect(typeof seed).toBe("string");
      expect(seed.length).toBeGreaterThan(0);
    });

    it("returns a different seed on each call", () => {
      const seed1 = generateNewWorldSeed();
      const seed2 = generateNewWorldSeed();
      expect(seed1).not.toBe(seed2);
    });

    it("seed starts with ng prefix to distinguish from manual seeds", () => {
      const seed = generateNewWorldSeed();
      expect(seed.startsWith("ng")).toBe(true);
    });
  });
});
