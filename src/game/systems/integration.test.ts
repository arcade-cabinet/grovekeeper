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
import { describe, it, expect, beforeEach } from "vitest";
import { world } from "../ecs/world";
import { createTreeEntity, createPlayerEntity } from "../ecs/archetypes";
import { growthSystem, calcGrowthRate, getStageScale } from "./growth";
import { initHarvestable, harvestSystem, collectHarvest } from "./harvest";
import { staminaSystem } from "./stamina";
import {
  getWeatherGrowthMultiplier,
  initializeWeather,
  updateWeather,
  rollWindstormDamage,
} from "./weather";
import { useGameStore } from "../stores/gameStore";
import { DIFFICULTY_TIERS, getDifficultyById } from "../constants/difficulty";
import { calculatePrestigeBonus, canPrestige } from "./prestige";
import {
  getSeasonalSeedCostMultiplier,
  getSeasonalTradeBonus,
} from "./seasonalMarket";
import { getMaxGridSizeForLevel, canAffordExpansion, GRID_EXPANSION_TIERS } from "./gridExpansion";
import { MAX_STAGE } from "../constants/config";

/** Helper: get difficulty tier, asserting it exists. */
function difficulty(id: string) {
  const tier = getDifficultyById(id);
  if (!tier) throw new Error(`Unknown difficulty: ${id}`);
  return tier;
}

/** Helper: create a harvestable tree at given stage, added to world. */
function makeHarvestableTree(speciesId: string, stage: 3 | 4 = 3) {
  const tree = createTreeEntity(0, 0, speciesId);
  tree.tree!.stage = stage;
  world.add(tree);
  initHarvestable(tree);
  tree.harvestable!.ready = true;
  return tree;
}

/** Helper: measure growth progress for a white-oak over small delta. */
function measureProgress(difficultyId: string, season = "summer", weatherMult = 1) {
  const tree = createTreeEntity(0, 0, "white-oak");
  world.add(tree);
  useGameStore.setState({ difficulty: difficultyId });
  growthSystem(0.5, season, weatherMult);
  const progress = tree.tree!.progress;
  world.remove(tree);
  return progress;
}

describe("Cross-System Integration Tests", () => {
  beforeEach(() => {
    for (const entity of [...world]) {
      world.remove(entity);
    }
    useGameStore.getState().resetGame();
  });

  // ===================================================================
  // Difficulty × Growth
  // ===================================================================
  describe("Difficulty tiers affect growth rates", () => {
    it("explore difficulty has 1.3x growth multiplier", () => {
      expect(difficulty("explore").growthSpeedMult / difficulty("normal").growthSpeedMult).toBeCloseTo(1.3, 1);
    });

    it("ultra-brutal difficulty has 0.4x growth multiplier", () => {
      expect(difficulty("ultra-brutal").growthSpeedMult / difficulty("normal").growthSpeedMult).toBeCloseTo(0.4, 1);
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

  // ===================================================================
  // Difficulty × Harvest Yields
  // ===================================================================
  describe("Difficulty tiers affect harvest yields", () => {
    it("explore difficulty gives higher yields than normal", () => {
      useGameStore.setState({ difficulty: "explore" });
      const tree = makeHarvestableTree("white-oak");
      const exploreResult = collectHarvest(tree)!;

      useGameStore.setState({ difficulty: "normal" });
      initHarvestable(tree);
      tree.harvestable!.ready = true;
      const normalResult = collectHarvest(tree)!;

      expect(exploreResult[0].amount).toBeGreaterThanOrEqual(normalResult[0].amount);
    });

    it("ultra-brutal difficulty gives lower yields than normal", () => {
      useGameStore.setState({ difficulty: "normal" });
      const tree = makeHarvestableTree("white-oak");
      const normalResult = collectHarvest(tree)!;

      useGameStore.setState({ difficulty: "ultra-brutal" });
      initHarvestable(tree);
      tree.harvestable!.ready = true;
      const brutalResult = collectHarvest(tree)!;

      expect(brutalResult[0].amount).toBeLessThanOrEqual(normalResult[0].amount);
    });
  });

  // ===================================================================
  // Difficulty × Weather
  // ===================================================================
  describe("Difficulty tiers affect weather system", () => {
    it("explore difficulty has 0 windstorm damage chance", () => {
      useGameStore.setState({ difficulty: "explore" });
      expect(rollWindstormDamage(0)).toBe(false);
      expect(rollWindstormDamage(0.05)).toBe(false);
    });

    it("normal difficulty has 10% windstorm damage chance", () => {
      useGameStore.setState({ difficulty: "normal" });
      expect(rollWindstormDamage(0.05)).toBe(true);
      expect(rollWindstormDamage(0.1)).toBe(false);
    });

    it("ultra-brutal difficulty has 25% windstorm damage chance", () => {
      useGameStore.setState({ difficulty: "ultra-brutal" });
      expect(rollWindstormDamage(0.2)).toBe(true);
      expect(rollWindstormDamage(0.25)).toBe(false);
    });

    it("difficulty affects drought growth penalty", () => {
      const droughtByDifficulty = ["explore", "normal", "ultra-brutal"].map((d) => {
        useGameStore.setState({ difficulty: d });
        return getWeatherGrowthMultiplier("drought");
      });
      // Each tier has harsher drought: explore (0.8) > normal (0.5) > ultra-brutal (0.2)
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

  // ===================================================================
  // Difficulty × Stamina
  // ===================================================================
  describe("Difficulty tiers affect stamina", () => {
    /** Measure stamina regen from 50 over 1 second at given difficulty. */
    function measureRegen(difficultyId: string) {
      const player = createPlayerEntity();
      world.add(player);
      useGameStore.setState({ difficulty: difficultyId });
      player.farmerState!.stamina = 50;
      staminaSystem(1);
      const result = player.farmerState!.stamina;
      world.remove(player);
      return result;
    }

    it("explore difficulty regenerates stamina fastest (1.5x regen)", () => {
      expect(measureRegen("explore")).toBeGreaterThan(measureRegen("normal"));
    });

    it("ultra-brutal difficulty regenerates stamina slowest (0.4x regen)", () => {
      expect(measureRegen("ultra-brutal")).toBeLessThan(measureRegen("normal"));
    });
  });

  // ===================================================================
  // Weather × Growth Integration
  // ===================================================================
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

  // ===================================================================
  // Season × Growth
  // ===================================================================
  describe("Seasons affect growth rates", () => {
    it("spring grows 1.5x faster than summer", () => {
      // Use calcGrowthRate directly (pure function, no stage wrapping)
      const springRate = calcGrowthRate({
        baseTime: 15, difficulty: 1, season: "spring",
        watered: false, evergreen: false,
      });
      const summerRate = calcGrowthRate({
        baseTime: 15, difficulty: 1, season: "summer",
        watered: false, evergreen: false,
      });
      expect(springRate / summerRate).toBeCloseTo(1.5, 1);
    });

    it("autumn grows at 0.8x summer rate", () => {
      const autumnRate = calcGrowthRate({
        baseTime: 15, difficulty: 1, season: "autumn",
        watered: false, evergreen: false,
      });
      const summerRate = calcGrowthRate({
        baseTime: 15, difficulty: 1, season: "summer",
        watered: false, evergreen: false,
      });
      expect(autumnRate / summerRate).toBeCloseTo(0.8, 1);
    });

    it("winter stops non-evergreen growth completely", () => {
      const tree = createTreeEntity(0, 0, "white-oak");
      world.add(tree);
      growthSystem(100, "winter");
      expect(tree.tree!.progress).toBe(0);
    });

    it("evergreen trees still grow in winter (slow)", () => {
      const tree = createTreeEntity(0, 0, "elder-pine");
      world.add(tree);
      growthSystem(100, "winter");
      expect(tree.tree!.progress).toBeGreaterThan(0);
    });
  });

  // ===================================================================
  // Season × Harvest (Golden Apple)
  // ===================================================================
  describe("Season × Harvest special multipliers", () => {
    it("golden apple yields 3x fruit in autumn vs summer", () => {
      const tree = makeHarvestableTree("golden-apple");
      const summerResult = collectHarvest(tree, "summer")!;
      tree.harvestable!.ready = true;
      const autumnResult = collectHarvest(tree, "autumn")!;

      const summerFruit = summerResult.find((r) => r.type === "fruit")?.amount ?? 0;
      const autumnFruit = autumnResult.find((r) => r.type === "fruit")?.amount ?? 0;
      expect(autumnFruit).toBe(summerFruit * 3);
    });

    it("ironbark yields more timber at old growth", () => {
      const tree = makeHarvestableTree("ironbark");
      const matureResult = collectHarvest(tree)!;

      tree.tree!.stage = 4;
      initHarvestable(tree);
      tree.harvestable!.ready = true;
      const oldResult = collectHarvest(tree)!;

      const matureTimber = matureResult.find((r) => r.type === "timber")?.amount ?? 0;
      const oldTimber = oldResult.find((r) => r.type === "timber")?.amount ?? 0;
      expect(oldTimber).toBeGreaterThan(matureTimber);
    });
  });

  // ===================================================================
  // Season × Market Prices
  // ===================================================================
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

  // ===================================================================
  // Growth → Harvest Lifecycle
  // ===================================================================
  describe("Growth to Harvest lifecycle", () => {
    it("tree must reach stage 3 before becoming harvestable", () => {
      const tree = createTreeEntity(0, 0, "white-oak");
      tree.tree!.stage = 2;
      world.add(tree);
      initHarvestable(tree);
      expect(tree.harvestable).toBeUndefined();

      tree.tree!.stage = 3;
      initHarvestable(tree);
      expect(tree.harvestable).toBeDefined();
    });

    it("harvest cooldown must complete before collection", () => {
      const tree = createTreeEntity(0, 0, "white-oak");
      tree.tree!.stage = 3;
      world.add(tree);
      initHarvestable(tree);

      expect(collectHarvest(tree)).toBeNull();
      harvestSystem(20);
      expect(collectHarvest(tree)).toBeNull();
      harvestSystem(30); // white-oak: 45 sec cooldown
      expect(tree.harvestable!.ready).toBe(true);
      expect(collectHarvest(tree)).not.toBeNull();
    });

    it("pruned bonus is consumed after harvest", () => {
      const tree = makeHarvestableTree("white-oak");
      tree.tree!.pruned = true;
      collectHarvest(tree);
      expect(tree.tree!.pruned).toBe(false);
    });

    it("stacked multipliers: old growth + pruned", () => {
      const tree = makeHarvestableTree("white-oak");
      const baseResult = collectHarvest(tree)!;

      tree.tree!.stage = 4;
      tree.tree!.pruned = true;
      initHarvestable(tree);
      tree.harvestable!.ready = true;
      const boostedResult = collectHarvest(tree)!;

      expect(boostedResult[0].amount).toBeGreaterThan(baseResult[0].amount);
    });
  });

  // ===================================================================
  // Weather State Machine
  // ===================================================================
  describe("Weather state machine transitions", () => {
    it("clear → new weather roll → clear cycle", () => {
      let state = initializeWeather(0);
      expect(state.current.type).toBe("clear");

      // Advance past first check
      state = updateWeather(state, 300, "spring", 42);
      const firstWeather = state.current.type;
      expect(["clear", "rain", "drought", "windstorm"]).toContain(firstWeather);

      // If non-clear, let it expire and go to clear waiting state
      if (firstWeather !== "clear") {
        const eventEnd = state.current.startTime + state.current.duration;
        state = updateWeather(state, eventEnd + 1, "spring", 42);
        // Should be waiting in clear state until next check
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
      // Should see at least 3 different types over 200 rolls
      expect(types.size).toBeGreaterThanOrEqual(3);
    });
  });

  // ===================================================================
  // Grid Expansion + Resource Spending
  // ===================================================================
  describe("Grid expansion with resource economy", () => {
    it("expansion from 12 to 16 requires level 5 and resources", () => {
      const tier = GRID_EXPANSION_TIERS[1]; // 16x16
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

  // ===================================================================
  // Prestige Bonus Stacking
  // ===================================================================
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

  // ===================================================================
  // Multiple Multiplier Stacking
  // ===================================================================
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

      // spring (1.5x) * water (1.3x) = 1.95x
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

      // Compare to summer as baseline
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

  // ===================================================================
  // Stage Transitions with Visual Updates
  // ===================================================================
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

  // ===================================================================
  // Difficulty Tier Data Integrity
  // ===================================================================
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
        expect(curr.resourceYieldMult).toBeLessThanOrEqual(prev.resourceYieldMult);
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
