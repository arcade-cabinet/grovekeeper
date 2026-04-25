/**
 * Cross-System Integration Tests
 *
 * Tests interactions between multiple game systems:
 * - Difficulty tiers affecting growth, weather, harvest, stamina
 * - Weather affecting growth and stamina
 * - Season transitions affecting growth, harvest, market prices
 * - Prestige bonuses affecting game mechanics
 * - Growth → Harvest lifecycle
 * - Grid expansion with resource spending
 */
import type { Entity } from "koota";
import { beforeEach, describe, expect, it } from "vitest";
import { actions as gameActions } from "@/actions";
import { MAX_STAGE } from "@/config/config";
import { DIFFICULTY_TIERS, getDifficultyById } from "@/config/difficulty";
import { destroyAllEntitiesExceptWorld, koota, spawnPlayer } from "@/koota";
import { spawnTree } from "@/startup";
import { Difficulty, FarmerState, Harvestable, Tree } from "@/traits";
import {
  canAffordExpansion,
  GRID_EXPANSION_TIERS,
  getMaxGridSizeForLevel,
} from "./gridExpansion";
import { calcGrowthRate, getStageScale, growthSystem } from "./growth";
import { collectHarvest, harvestSystem, initHarvestable } from "./harvest";
import { calculatePrestigeBonus, canPrestige } from "./prestige";
import {
  getSeasonalSeedCostMultiplier,
  getSeasonalTradeBonus,
} from "./seasonalMarket";
import { staminaSystem } from "./stamina";
import {
  getWeatherGrowthMultiplier,
  initializeWeather,
  rollWindstormDamage,
  updateWeather,
} from "./weather";

function difficulty(id: string) {
  const tier = getDifficultyById(id);
  if (!tier) throw new Error(`Unknown difficulty: ${id}`);
  return tier;
}

function setTreeStage(entity: Entity, stage: 0 | 1 | 2 | 3 | 4): void {
  entity.set(Tree, { ...entity.get(Tree), stage });
}

function setReady(entity: Entity, ready: boolean): void {
  entity.set(Harvestable, { ...entity.get(Harvestable), ready });
}

/** Helper: create a harvestable tree at given stage, added to world. */
function makeHarvestableTree(speciesId: string, stage: 3 | 4 = 3): Entity {
  const tree = spawnTree(0, 0, speciesId);
  setTreeStage(tree, stage);
  initHarvestable(tree);
  setReady(tree, true);
  return tree;
}

/** Helper: measure growth progress for a white-oak over small delta. */
function measureProgress(
  difficultyId: string,
  season = "summer",
  weatherMult = 1,
) {
  const tree = spawnTree(0, 0, "white-oak");
  koota.set(Difficulty, { id: difficultyId, permadeath: false });
  growthSystem(0.5, season, weatherMult);
  const progress = tree.get(Tree).progress;
  tree.destroy();
  return progress;
}

describe("Cross-System Integration Tests", () => {
  beforeEach(() => {
    destroyAllEntitiesExceptWorld();
    gameActions().resetGame();
  });

  describe("Difficulty tiers affect growth rates", () => {
    it("explore difficulty has 1.3x growth multiplier", () => {
      expect(
        difficulty("explore").growthSpeedMult /
          difficulty("normal").growthSpeedMult,
      ).toBeCloseTo(1.3, 1);
    });

    it("ultra-brutal difficulty has 0.4x growth multiplier", () => {
      expect(
        difficulty("ultra-brutal").growthSpeedMult /
          difficulty("normal").growthSpeedMult,
      ).toBeCloseTo(0.4, 1);
    });

    it("all 5 difficulty tiers produce strictly ordered growth rates", () => {
      const mults = ["explore", "normal", "hard", "brutal", "ultra-brutal"].map(
        (d) => difficulty(d).growthSpeedMult,
      );
      for (let i = 1; i < mults.length; i++) {
        expect(mults[i]).toBeLessThan(mults[i - 1]);
      }
    });

    it("growthSystem applies difficulty multiplier to tree progress", () => {
      const exploreProgress = measureProgress("explore");
      const normalProgress = measureProgress("normal");

      expect(exploreProgress).toBeGreaterThan(normalProgress);
      expect(exploreProgress / normalProgress).toBeCloseTo(1.3, 1);
    });
  });

  describe("Difficulty tiers affect harvest yields", () => {
    it("explore difficulty gives higher yields than normal", () => {
      koota.set(Difficulty, { id: "explore", permadeath: false });
      const tree = makeHarvestableTree("white-oak");
      const exploreResult = collectHarvest(tree)!;

      koota.set(Difficulty, { id: "normal", permadeath: false });
      initHarvestable(tree);
      setReady(tree, true);
      const normalResult = collectHarvest(tree)!;

      expect(exploreResult[0].amount).toBeGreaterThanOrEqual(
        normalResult[0].amount,
      );
    });

    it("ultra-brutal difficulty gives lower yields than normal", () => {
      koota.set(Difficulty, { id: "normal", permadeath: false });
      const tree = makeHarvestableTree("white-oak");
      const normalResult = collectHarvest(tree)!;

      koota.set(Difficulty, { id: "ultra-brutal", permadeath: false });
      initHarvestable(tree);
      setReady(tree, true);
      const brutalResult = collectHarvest(tree)!;

      expect(brutalResult[0].amount).toBeLessThanOrEqual(
        normalResult[0].amount,
      );
    });
  });

  describe("Difficulty tiers affect weather system", () => {
    it("explore difficulty has 0 windstorm damage chance", () => {
      koota.set(Difficulty, { id: "explore", permadeath: false });
      expect(rollWindstormDamage(0)).toBe(false);
      expect(rollWindstormDamage(0.05)).toBe(false);
    });

    it("normal difficulty has 10% windstorm damage chance", () => {
      koota.set(Difficulty, { id: "normal", permadeath: false });
      expect(rollWindstormDamage(0.05)).toBe(true);
      expect(rollWindstormDamage(0.1)).toBe(false);
    });

    it("ultra-brutal difficulty has 25% windstorm damage chance", () => {
      koota.set(Difficulty, { id: "ultra-brutal", permadeath: false });
      expect(rollWindstormDamage(0.2)).toBe(true);
      expect(rollWindstormDamage(0.25)).toBe(false);
    });

    it("difficulty affects drought growth penalty", () => {
      const droughtByDifficulty = ["explore", "normal", "ultra-brutal"].map(
        (d) => {
          koota.set(Difficulty, { id: d, permadeath: false });
          return getWeatherGrowthMultiplier("drought");
        },
      );
      expect(droughtByDifficulty[0]).toBeGreaterThan(droughtByDifficulty[1]);
      expect(droughtByDifficulty[1]).toBeGreaterThan(droughtByDifficulty[2]);
    });

    it("difficulty scales weather check interval", () => {
      expect(300 / difficulty("hard").weatherFrequencyMult).toBeLessThan(
        300 / difficulty("normal").weatherFrequencyMult,
      );
    });

    it("difficulty scales weather duration", () => {
      expect(difficulty("hard").weatherDurationMult).toBeGreaterThan(
        difficulty("normal").weatherDurationMult,
      );
    });
  });

  describe("Difficulty tiers affect stamina", () => {
    function measureRegen(difficultyId: string) {
      const player = spawnPlayer();
      koota.set(Difficulty, { id: difficultyId, permadeath: false });
      player.set(FarmerState, { stamina: 50, maxStamina: 100 });
      staminaSystem(1);
      const result = player.get(FarmerState).stamina;
      player.destroy();
      return result;
    }

    it("explore difficulty regenerates stamina fastest (1.5x regen)", () => {
      expect(measureRegen("explore")).toBeGreaterThan(measureRegen("normal"));
    });

    it("ultra-brutal difficulty regenerates stamina slowest (0.4x regen)", () => {
      expect(measureRegen("ultra-brutal")).toBeLessThan(measureRegen("normal"));
    });
  });

  describe("Weather affects growth via weather multiplier", () => {
    it("rain weather boosts growth by the rain multiplier", () => {
      const rainMult = getWeatherGrowthMultiplier("rain");
      const clearProgress = measureProgress("normal", "summer", 1);
      const rainProgress = measureProgress("normal", "summer", rainMult);
      expect(rainProgress / clearProgress).toBeCloseTo(rainMult, 1);
    });

    it("drought weather slows growth by the drought multiplier", () => {
      const droughtMult = getWeatherGrowthMultiplier("drought");
      const clearProgress = measureProgress("normal", "summer", 1);
      const droughtProgress = measureProgress("normal", "summer", droughtMult);
      expect(droughtProgress / clearProgress).toBeCloseTo(droughtMult, 1);
    });
  });

  describe("Seasons affect growth rates", () => {
    it("spring grows 1.5x faster than summer", () => {
      const springRate = calcGrowthRate({
        baseTime: 15,
        difficulty: 1,
        season: "spring",
        watered: false,
        evergreen: false,
      });
      const summerRate = calcGrowthRate({
        baseTime: 15,
        difficulty: 1,
        season: "summer",
        watered: false,
        evergreen: false,
      });
      expect(springRate / summerRate).toBeCloseTo(1.5, 1);
    });

    it("autumn grows at 0.8x summer rate", () => {
      const autumnRate = calcGrowthRate({
        baseTime: 15,
        difficulty: 1,
        season: "autumn",
        watered: false,
        evergreen: false,
      });
      const summerRate = calcGrowthRate({
        baseTime: 15,
        difficulty: 1,
        season: "summer",
        watered: false,
        evergreen: false,
      });
      expect(autumnRate / summerRate).toBeCloseTo(0.8, 1);
    });

    it("winter stops non-evergreen growth completely", () => {
      const tree = spawnTree(0, 0, "white-oak");
      growthSystem(100, "winter");
      expect(tree.get(Tree).progress).toBe(0);
    });

    it("evergreen trees still grow in winter (slow)", () => {
      const tree = spawnTree(0, 0, "elder-pine");
      growthSystem(100, "winter");
      expect(tree.get(Tree).progress).toBeGreaterThan(0);
    });
  });

  describe("Season × Harvest special multipliers", () => {
    it("golden apple yields 3x fruit in autumn vs summer", () => {
      const tree = makeHarvestableTree("golden-apple");
      const summerResult = collectHarvest(tree, "summer")!;
      setReady(tree, true);
      const autumnResult = collectHarvest(tree, "autumn")!;

      const summerFruit =
        summerResult.find((r) => r.type === "fruit")?.amount ?? 0;
      const autumnFruit =
        autumnResult.find((r) => r.type === "fruit")?.amount ?? 0;
      expect(autumnFruit).toBe(summerFruit * 3);
    });

    it("ironbark yields more timber at old growth", () => {
      const tree = makeHarvestableTree("ironbark");
      const matureResult = collectHarvest(tree)!;

      setTreeStage(tree, 4);
      initHarvestable(tree);
      setReady(tree, true);
      const oldResult = collectHarvest(tree)!;

      const matureTimber =
        matureResult.find((r) => r.type === "timber")?.amount ?? 0;
      const oldTimber = oldResult.find((r) => r.type === "timber")?.amount ?? 0;
      expect(oldTimber).toBeGreaterThan(matureTimber);
    });
  });

  describe("Seasons affect market prices", () => {
    it("spring halves seed costs", () => {
      expect(getSeasonalSeedCostMultiplier("spring")).toBe(0.5);
    });

    it("summer boosts timber trade by 50%", () => {
      const bonus = getSeasonalTradeBonus("summer", "timber");
      expect(bonus).toBe(1.5);
    });

    it("autumn boosts fruit and acorn trades by 50%", () => {
      expect(getSeasonalTradeBonus("autumn", "fruit")).toBe(1.5);
      expect(getSeasonalTradeBonus("autumn", "acorns")).toBe(1.5);
    });

    it("winter boosts sap trade by 50%", () => {
      expect(getSeasonalTradeBonus("winter", "sap")).toBe(1.5);
    });

    it("non-bonus season+resource combos return 1", () => {
      expect(getSeasonalTradeBonus("spring", "timber")).toBe(1);
      expect(getSeasonalTradeBonus("summer", "sap")).toBe(1);
    });
  });

  describe("Growth to Harvest lifecycle", () => {
    it("tree must reach stage 3 before becoming harvestable", () => {
      const tree = spawnTree(0, 0, "white-oak");
      setTreeStage(tree, 2);
      initHarvestable(tree);
      expect(tree.has(Harvestable)).toBe(false);

      setTreeStage(tree, 3);
      initHarvestable(tree);
      expect(tree.has(Harvestable)).toBe(true);
    });

    it("harvest cooldown must complete before collection", () => {
      const tree = spawnTree(0, 0, "white-oak");
      setTreeStage(tree, 3);
      initHarvestable(tree);

      expect(collectHarvest(tree)).toBeNull();
      harvestSystem(20);
      expect(collectHarvest(tree)).toBeNull();
      harvestSystem(30);
      expect(tree.get(Harvestable).ready).toBe(true);
      expect(collectHarvest(tree)).not.toBeNull();
    });

    it("pruned bonus is consumed after harvest", () => {
      const tree = makeHarvestableTree("white-oak");
      tree.set(Tree, { ...tree.get(Tree), pruned: true });
      collectHarvest(tree);
      expect(tree.get(Tree).pruned).toBe(false);
    });

    it("stacked multipliers: old growth + pruned", () => {
      const tree = makeHarvestableTree("white-oak");
      const baseResult = collectHarvest(tree)!;

      setTreeStage(tree, 4);
      tree.set(Tree, { ...tree.get(Tree), pruned: true });
      initHarvestable(tree);
      setReady(tree, true);
      const boostedResult = collectHarvest(tree)!;

      expect(boostedResult[0].amount).toBeGreaterThan(baseResult[0].amount);
    });
  });

  describe("Weather state machine transitions", () => {
    it("clear → new weather roll → clear cycle", () => {
      let state = initializeWeather(0);
      expect(state.current.type).toBe("clear");

      state = updateWeather(state, 300, "spring", 42);
      const firstWeather = state.current.type;
      expect(["clear", "rain", "drought", "windstorm"]).toContain(firstWeather);

      if (firstWeather !== "clear") {
        const eventEnd = state.current.startTime + state.current.duration;
        state = updateWeather(state, eventEnd + 1, "spring", 42);
        expect(state.current.type).toBe("clear");
      }
    });

    it("multiple consecutive weather rolls with different seeds produce variety", () => {
      const types = new Set<string>();
      for (let seed = 0; seed < 200; seed++) {
        const state = initializeWeather(0);
        const result = updateWeather(state, 300, "spring", seed);
        types.add(result.current.type);
      }
      expect(types.size).toBeGreaterThanOrEqual(3);
    });
  });

  describe("Grid expansion with resource economy", () => {
    it("expansion from 12 to 16 requires level 5 and resources", () => {
      const tier = GRID_EXPANSION_TIERS[1];
      expect(tier.requiredLevel).toBe(5);
      expect(canAffordExpansion(tier, { timber: 100, sap: 50 }, 5)).toBe(true);
      expect(canAffordExpansion(tier, { timber: 99, sap: 50 }, 5)).toBe(false);
      expect(canAffordExpansion(tier, { timber: 100, sap: 50 }, 4)).toBe(false);
    });

    it("level gates match grid size correctly", () => {
      expect(getMaxGridSizeForLevel(1)).toBe(12);
      expect(getMaxGridSizeForLevel(4)).toBe(12);
      expect(getMaxGridSizeForLevel(5)).toBe(16);
      expect(getMaxGridSizeForLevel(10)).toBe(20);
      expect(getMaxGridSizeForLevel(15)).toBe(24);
      expect(getMaxGridSizeForLevel(20)).toBe(32);
      expect(getMaxGridSizeForLevel(99)).toBe(32);
    });
  });

  describe("Prestige bonuses scale correctly", () => {
    it("prestige count 0 returns neutral bonuses", () => {
      const bonus = calculatePrestigeBonus(0);
      expect(bonus.growthSpeedMultiplier).toBe(1);
      expect(bonus.xpMultiplier).toBe(1);
      expect(bonus.staminaBonus).toBe(0);
      expect(bonus.harvestYieldMultiplier).toBe(1);
    });

    it("prestige count 1 gives +10% growth, +10% xp, +10 stamina, +5% harvest", () => {
      const bonus = calculatePrestigeBonus(1);
      expect(bonus.growthSpeedMultiplier).toBe(1.1);
      expect(bonus.xpMultiplier).toBe(1.1);
      expect(bonus.staminaBonus).toBe(10);
      expect(bonus.harvestYieldMultiplier).toBe(1.05);
    });

    it("prestige bonuses scale with prestige count", () => {
      const bonus4 = calculatePrestigeBonus(4);
      expect(bonus4.growthSpeedMultiplier).toBeCloseTo(1.4);
      expect(bonus4.xpMultiplier).toBeCloseTo(1.35);
      expect(bonus4.staminaBonus).toBe(35);
      expect(bonus4.harvestYieldMultiplier).toBeCloseTo(1.25);
    });

    it("prestige requires level 25+", () => {
      expect(canPrestige(24)).toBe(false);
      expect(canPrestige(25)).toBe(true);
      expect(canPrestige(30)).toBe(true);
    });
  });

  describe("Multiple multiplier stacking in growth", () => {
    it("watered + spring stacks multiplicatively", () => {
      const rate = calcGrowthRate({
        baseTime: 15,
        difficulty: 1,
        season: "spring",
        watered: true,
        evergreen: false,
      });

      const baseRate = calcGrowthRate({
        baseTime: 15,
        difficulty: 1,
        season: "summer",
        watered: false,
        evergreen: false,
      });

      expect(rate / baseRate).toBeCloseTo(1.5 * 1.3, 1);
    });

    it("ghost-birch grows at 0.5x in winter (special override)", () => {
      const rate = calcGrowthRate({
        baseTime: 15,
        difficulty: 1,
        season: "winter",
        watered: false,
        evergreen: false,
        speciesId: "ghost-birch",
      });
      expect(rate).toBeGreaterThan(0);

      const summerRate = calcGrowthRate({
        baseTime: 15,
        difficulty: 1,
        season: "summer",
        watered: false,
        evergreen: false,
        speciesId: "ghost-birch",
      });

      expect(rate / summerRate).toBeCloseTo(0.5, 1);
    });
  });

  describe("Stage transitions update visual scale", () => {
    it("scale increases with each stage", () => {
      const scales = [0, 1, 2, 3, 4].map((s) => getStageScale(s, 0));
      for (let i = 1; i < scales.length; i++) {
        expect(scales[i]).toBeGreaterThan(scales[i - 1]);
      }
    });

    it("progress interpolation adds partial scale", () => {
      const baseScale = getStageScale(2, 0);
      const halfScale = getStageScale(2, 0.5);
      const fullScale = getStageScale(3, 0);

      expect(halfScale).toBeGreaterThan(baseScale);
      expect(halfScale).toBeLessThan(fullScale);
    });

    it("max stage scale is fixed regardless of progress", () => {
      const scale0 = getStageScale(MAX_STAGE, 0);
      const scale99 = getStageScale(MAX_STAGE, 0.99);
      expect(scale0).toBe(scale99);
    });
  });

  describe("Difficulty tier data integrity", () => {
    it("all 5 tiers exist with valid multipliers", () => {
      expect(DIFFICULTY_TIERS).toHaveLength(5);
      const ids = DIFFICULTY_TIERS.map((t) => t.id);
      expect(ids).toContain("explore");
      expect(ids).toContain("normal");
      expect(ids).toContain("hard");
      expect(ids).toContain("brutal");
      expect(ids).toContain("ultra-brutal");
    });

    it("normal tier has all 1.0 multipliers as baseline", () => {
      const normal = difficulty("normal");
      expect(normal.growthSpeedMult).toBe(1);
      expect(normal.resourceYieldMult).toBe(1);
      expect(normal.seedCostMult).toBe(1);
      expect(normal.structureCostMult).toBe(1);
      expect(normal.staminaDrainMult).toBe(1);
      expect(normal.staminaRegenMult).toBe(1);
      expect(normal.weatherFrequencyMult).toBe(1);
      expect(normal.weatherDurationMult).toBe(1);
    });

    it("explore tier has boosted growth and resources", () => {
      const explore = difficulty("explore");
      expect(explore.growthSpeedMult).toBeGreaterThan(1);
      expect(explore.resourceYieldMult).toBeGreaterThan(1);
      expect(explore.seedCostMult).toBeLessThan(1);
      expect(explore.staminaRegenMult).toBeGreaterThan(1);
    });

    it("harder tiers strictly reduce growth and yields", () => {
      const tiers = ["normal", "hard", "brutal", "ultra-brutal"];
      for (let i = 1; i < tiers.length; i++) {
        const prev = difficulty(tiers[i - 1]);
        const curr = difficulty(tiers[i]);
        expect(curr.growthSpeedMult).toBeLessThanOrEqual(prev.growthSpeedMult);
        expect(curr.resourceYieldMult).toBeLessThanOrEqual(
          prev.resourceYieldMult,
        );
      }
    });

    it("all tiers have valid starting resources", () => {
      for (const tier of DIFFICULTY_TIERS) {
        expect(tier.startingResources.timber).toBeGreaterThanOrEqual(0);
        expect(tier.startingResources.sap).toBeGreaterThanOrEqual(0);
        expect(tier.startingSeeds["white-oak"]).toBeGreaterThan(0);
      }
    });
  });
});
