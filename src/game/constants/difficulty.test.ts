import { beforeEach, describe, expect, it } from "vitest";
import { useGameStore } from "../stores/gameStore";
import {
  DIFFICULTY_TIERS,
  getActiveDifficulty,
  getDifficultyById,
} from "./difficulty";

describe("Difficulty System", () => {
  beforeEach(() => {
    useGameStore.getState().resetGame();
  });

  describe("DIFFICULTY_TIERS", () => {
    it("has exactly 5 tiers", () => {
      expect(DIFFICULTY_TIERS).toHaveLength(5);
    });

    it("contains all expected difficulty ids", () => {
      const ids = DIFFICULTY_TIERS.map((t) => t.id);
      expect(ids).toEqual([
        "explore",
        "normal",
        "hard",
        "brutal",
        "ultra-brutal",
      ]);
    });

    it("each tier has required string fields", () => {
      for (const tier of DIFFICULTY_TIERS) {
        expect(typeof tier.id).toBe("string");
        expect(typeof tier.name).toBe("string");
        expect(typeof tier.tagline).toBe("string");
        expect(typeof tier.description).toBe("string");
        expect(typeof tier.color).toBe("string");
        expect(typeof tier.icon).toBe("string");
      }
    });

    it("each tier has valid permadeathForced value", () => {
      for (const tier of DIFFICULTY_TIERS) {
        expect(["on", "off", "optional"]).toContain(tier.permadeathForced);
      }
    });

    it("explore has permadeath forced off", () => {
      const explore = getDifficultyById("explore")!;
      expect(explore.permadeathForced).toBe("off");
    });

    it("ultra-brutal has permadeath forced on", () => {
      const ultra = getDifficultyById("ultra-brutal")!;
      expect(ultra.permadeathForced).toBe("on");
    });
  });

  describe("Numeric multipliers", () => {
    it("normal tier has 1.0x baseline multipliers", () => {
      const normal = getDifficultyById("normal")!;
      expect(normal.growthSpeedMult).toBe(1.0);
      expect(normal.resourceYieldMult).toBe(1.0);
      expect(normal.seedCostMult).toBe(1.0);
      expect(normal.structureCostMult).toBe(1.0);
      expect(normal.staminaDrainMult).toBe(1.0);
      expect(normal.staminaRegenMult).toBe(1.0);
      expect(normal.weatherFrequencyMult).toBe(1.0);
      expect(normal.weatherDurationMult).toBe(1.0);
    });

    it("explore has boosted growth and yields", () => {
      const explore = getDifficultyById("explore")!;
      expect(explore.growthSpeedMult).toBeGreaterThan(1.0);
      expect(explore.resourceYieldMult).toBeGreaterThan(1.0);
    });

    it("harder tiers have lower growth multipliers", () => {
      const tiers = DIFFICULTY_TIERS;
      for (let i = 1; i < tiers.length; i++) {
        expect(tiers[i].growthSpeedMult).toBeLessThanOrEqual(
          tiers[i - 1].growthSpeedMult,
        );
      }
    });

    it("harder tiers have lower resource yield multipliers", () => {
      const tiers = DIFFICULTY_TIERS;
      for (let i = 1; i < tiers.length; i++) {
        expect(tiers[i].resourceYieldMult).toBeLessThanOrEqual(
          tiers[i - 1].resourceYieldMult,
        );
      }
    });

    it("explore has zero windstorm damage chance", () => {
      const explore = getDifficultyById("explore")!;
      expect(explore.windstormDamageChance).toBe(0);
    });
  });

  describe("Feature flags", () => {
    it("explore has no exposure system", () => {
      const explore = getDifficultyById("explore")!;
      expect(explore.exposureEnabled).toBe(false);
      expect(explore.exposureDriftRate).toBe(0);
    });

    it("normal has exposure system enabled", () => {
      const normal = getDifficultyById("normal")!;
      expect(normal.exposureEnabled).toBe(true);
      expect(normal.exposureDriftRate).toBeGreaterThan(0);
    });

    it("only brutal+ have split inventory", () => {
      expect(getDifficultyById("explore")!.splitInventory).toBe(false);
      expect(getDifficultyById("normal")!.splitInventory).toBe(false);
      expect(getDifficultyById("hard")!.splitInventory).toBe(false);
      expect(getDifficultyById("brutal")!.splitInventory).toBe(true);
      expect(getDifficultyById("ultra-brutal")!.splitInventory).toBe(true);
    });

    it("only ultra-brutal has deathLosesSeason", () => {
      for (const tier of DIFFICULTY_TIERS) {
        if (tier.id === "ultra-brutal") {
          expect(tier.deathLosesSeason).toBe(true);
        } else {
          expect(tier.deathLosesSeason).toBe(false);
        }
      }
    });
  });

  describe("Starting resources", () => {
    it("each tier has starting resources for all 4 types", () => {
      for (const tier of DIFFICULTY_TIERS) {
        expect(tier.startingResources).toHaveProperty("timber");
        expect(tier.startingResources).toHaveProperty("sap");
        expect(tier.startingResources).toHaveProperty("fruit");
        expect(tier.startingResources).toHaveProperty("acorns");
      }
    });

    it("explore has the most generous starting resources", () => {
      const explore = getDifficultyById("explore")!;
      const ultra = getDifficultyById("ultra-brutal")!;
      expect(explore.startingResources.timber).toBeGreaterThan(
        ultra.startingResources.timber,
      );
    });

    it("each tier has white-oak starting seeds", () => {
      for (const tier of DIFFICULTY_TIERS) {
        expect(tier.startingSeeds["white-oak"]).toBeGreaterThan(0);
      }
    });
  });

  describe("getDifficultyById", () => {
    it("returns correct tier for valid id", () => {
      const hard = getDifficultyById("hard");
      expect(hard).toBeDefined();
      expect(hard!.name).toBe("Hard");
    });

    it("returns undefined for invalid id", () => {
      expect(getDifficultyById("nonexistent")).toBeUndefined();
    });
  });

  describe("getActiveDifficulty", () => {
    it("returns normal tier by default", () => {
      const active = getActiveDifficulty();
      expect(active.id).toBe("normal");
    });

    it("returns the tier matching store difficulty", () => {
      useGameStore.setState({ difficulty: "hard" });
      const active = getActiveDifficulty();
      expect(active.id).toBe("hard");
    });

    it("falls back to normal for unrecognized difficulty", () => {
      useGameStore.setState({ difficulty: "invalid-id" });
      const active = getActiveDifficulty();
      expect(active.id).toBe("normal");
    });

    it("returns explore when difficulty is explore", () => {
      useGameStore.setState({ difficulty: "explore" });
      const active = getActiveDifficulty();
      expect(active.id).toBe("explore");
      expect(active.growthSpeedMult).toBe(1.3);
    });
  });
});
