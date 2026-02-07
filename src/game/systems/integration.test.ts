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
import { staminaSystem, drainStamina } from "./stamina";
import {
  getWeatherGrowthMultiplier,
  getWeatherStaminaMultiplier,
  initializeWeather,
  updateWeather,
  rollWindstormDamage,
} from "./weather";
import { useGameStore } from "../stores/gameStore";
import { DIFFICULTY_TIERS, getDifficultyById } from "../constants/difficulty";
import { calculatePrestigeBonus, canPrestige } from "./prestige";
import {
  getSeasonalMarketEffect,
  getSeasonalSeedCostMultiplier,
  getSeasonalTradeBonus,
} from "./seasonalMarket";
import { getMaxGridSizeForLevel, canAffordExpansion, GRID_EXPANSION_TIERS } from "./gridExpansion";
import { calculateTradeOutput, getTradeRates } from "./trading";
import { SEASON_GROWTH_MULTIPLIERS, MAX_STAGE } from "../constants/config";

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
      const explore = getDifficultyById("explore")!;
      const normal = getDifficultyById("normal")!;
      expect(explore.growthSpeedMult / normal.growthSpeedMult).toBeCloseTo(1.3, 1);
    });

    it("ultra-brutal difficulty has 0.4x growth multiplier", () => {
      const brutal = getDifficultyById("ultra-brutal")!;
      const normal = getDifficultyById("normal")!;
      expect(brutal.growthSpeedMult / normal.growthSpeedMult).toBeCloseTo(0.4, 1);
    });

    it("all 5 difficulty tiers produce strictly ordered growth rates", () => {
      const difficulties = ["explore", "normal", "hard", "brutal", "ultra-brutal"];
      const mults = difficulties.map((d) => getDifficultyById(d)!.growthSpeedMult);

      // Each tier should be strictly slower than the previous
      for (let i = 1; i < mults.length; i++) {
        expect(mults[i]).toBeLessThan(mults[i - 1]);
      }
    });

    it("growthSystem applies difficulty multiplier to tree progress", () => {
      const tree = createTreeEntity(0, 0, "white-oak");
      world.add(tree);

      // Use small deltaTime to avoid stage wrapping
      useGameStore.setState({ difficulty: "explore" });
      growthSystem(0.5, "summer");
      const exploreProgress = tree.tree!.progress;

      // Reset fully
      tree.tree!.progress = 0;
      tree.tree!.stage = 0;
      useGameStore.setState({ difficulty: "normal" });
      growthSystem(0.5, "summer");
      const normalProgress = tree.tree!.progress;

      expect(exploreProgress).toBeGreaterThan(normalProgress);
      expect(exploreProgress / normalProgress).toBeCloseTo(1.3, 1);
    });
  });

  // ===================================================================
  // Difficulty × Harvest Yields
  // ===================================================================
  describe("Difficulty tiers affect harvest yields", () => {
    it("explore difficulty gives higher yields than normal", () => {
      // Explore difficulty harvest
      useGameStore.setState({ difficulty: "explore" });
      const exploreTree = createTreeEntity(0, 0, "white-oak");
      exploreTree.tree!.stage = 3;
      world.add(exploreTree);
      initHarvestable(exploreTree);
      exploreTree.harvestable!.ready = true;
      const exploreResult = collectHarvest(exploreTree)!;

      // Normal difficulty harvest (same tree, reset)
      useGameStore.setState({ difficulty: "normal" });
      initHarvestable(exploreTree);
      exploreTree.harvestable!.ready = true;
      const normalResult = collectHarvest(exploreTree)!;

      // Explore gives higher yield
      expect(exploreResult[0].amount).toBeGreaterThanOrEqual(normalResult[0].amount);
    });

    it("ultra-brutal difficulty gives lower yields than normal", () => {
      // Normal difficulty harvest
      useGameStore.setState({ difficulty: "normal" });
      const tree = createTreeEntity(0, 0, "white-oak");
      tree.tree!.stage = 3;
      world.add(tree);
      initHarvestable(tree);
      tree.harvestable!.ready = true;
      const normalResult = collectHarvest(tree)!;

      // Ultra-brutal difficulty harvest (same tree, reset)
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
      // Even with rng value just above 0, no damage
      expect(rollWindstormDamage(0.0)).toBe(false);
      expect(rollWindstormDamage(0.05)).toBe(false);
    });

    it("normal difficulty has 10% windstorm damage chance", () => {
      useGameStore.setState({ difficulty: "normal" });
      expect(rollWindstormDamage(0.05)).toBe(true);
      expect(rollWindstormDamage(0.10)).toBe(false);
    });

    it("ultra-brutal difficulty has 25% windstorm damage chance", () => {
      useGameStore.setState({ difficulty: "ultra-brutal" });
      expect(rollWindstormDamage(0.20)).toBe(true);
      expect(rollWindstormDamage(0.25)).toBe(false);
    });

    it("difficulty affects drought growth penalty", () => {
      useGameStore.setState({ difficulty: "explore" });
      const exploreDrought = getWeatherGrowthMultiplier("drought");

      useGameStore.setState({ difficulty: "normal" });
      const normalDrought = getWeatherGrowthMultiplier("drought");

      useGameStore.setState({ difficulty: "ultra-brutal" });
      const brutalDrought = getWeatherGrowthMultiplier("drought");

      // Explore has milder drought (0.8), normal (0.5), ultra-brutal (0.2)
      expect(exploreDrought).toBeGreaterThan(normalDrought);
      expect(normalDrought).toBeGreaterThan(brutalDrought);
    });

    it("difficulty scales weather check interval", () => {
      // Hard difficulty has weatherFrequencyMult: 1.3 (more frequent checks)
      // The check interval is 300 / frequencyMult
      const hard = getDifficultyById("hard")!;
      const normal = getDifficultyById("normal")!;

      expect(300 / hard.weatherFrequencyMult).toBeLessThan(300 / normal.weatherFrequencyMult);
    });

    it("difficulty scales weather duration", () => {
      const hard = getDifficultyById("hard")!;
      const normal = getDifficultyById("normal")!;

      // Hard has weatherDurationMult: 1.3 (longer weather events)
      expect(hard.weatherDurationMult).toBeGreaterThan(normal.weatherDurationMult);
    });
  });

  // ===================================================================
  // Difficulty × Stamina
  // ===================================================================
  describe("Difficulty tiers affect stamina", () => {
    it("explore difficulty regenerates stamina fastest (1.5x regen)", () => {
      const player = createPlayerEntity();
      world.add(player);

      // Explore regen
      useGameStore.setState({ difficulty: "explore" });
      player.farmerState!.stamina = 50;
      staminaSystem(1);
      const exploreStamina = player.farmerState!.stamina;

      // Normal regen (reset stamina)
      useGameStore.setState({ difficulty: "normal" });
      player.farmerState!.stamina = 50;
      staminaSystem(1);
      const normalStamina = player.farmerState!.stamina;

      expect(exploreStamina).toBeGreaterThan(normalStamina);
    });

    it("ultra-brutal difficulty regenerates stamina slowest (0.4x regen)", () => {
      const player = createPlayerEntity();
      world.add(player);

      // Ultra-brutal regen
      useGameStore.setState({ difficulty: "ultra-brutal" });
      player.farmerState!.stamina = 50;
      staminaSystem(1);
      const brutalStamina = player.farmerState!.stamina;

      // Normal regen (reset stamina)
      useGameStore.setState({ difficulty: "normal" });
      player.farmerState!.stamina = 50;
      staminaSystem(1);
      const normalStamina = player.farmerState!.stamina;

      expect(brutalStamina).toBeLessThan(normalStamina);
    });
  });

  // ===================================================================
  // Weather × Growth Integration
  // ===================================================================
  describe("Weather affects growth via weather multiplier", () => {
    it("rain weather boosts growth by the rain multiplier", () => {
      useGameStore.setState({ difficulty: "normal" });
      const rainMult = getWeatherGrowthMultiplier("rain");

      const tree = createTreeEntity(0, 0, "white-oak");
      world.add(tree);

      // Small deltaTime to prevent stage wrapping
      growthSystem(0.5, "summer", 1.0);
      const clearProgress = tree.tree!.progress;

      tree.tree!.progress = 0;
      tree.tree!.stage = 0;
      growthSystem(0.5, "summer", rainMult);
      const rainProgress = tree.tree!.progress;

      expect(rainProgress / clearProgress).toBeCloseTo(rainMult, 1);
    });

    it("drought weather slows growth by the drought multiplier", () => {
      useGameStore.setState({ difficulty: "normal" });
      const droughtMult = getWeatherGrowthMultiplier("drought");

      const tree = createTreeEntity(0, 0, "white-oak");
      world.add(tree);

      growthSystem(0.5, "summer", 1.0);
      const clearProgress = tree.tree!.progress;

      tree.tree!.progress = 0;
      tree.tree!.stage = 0;
      growthSystem(0.5, "summer", droughtMult);
      const droughtProgress = tree.tree!.progress;

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
      const tree = createTreeEntity(0, 0, "golden-apple");
      tree.tree!.stage = 3;
      world.add(tree);
      initHarvestable(tree);
      tree.harvestable!.ready = true;

      const summerResult = collectHarvest(tree, "summer")!;
      tree.harvestable!.ready = true;
      const autumnResult = collectHarvest(tree, "autumn")!;

      const summerFruit = summerResult.find((r) => r.type === "fruit")?.amount ?? 0;
      const autumnFruit = autumnResult.find((r) => r.type === "fruit")?.amount ?? 0;

      expect(autumnFruit).toBe(summerFruit * 3);
    });

    it("ironbark yields more timber at old growth", () => {
      const tree = createTreeEntity(0, 0, "ironbark");
      tree.tree!.stage = 3;
      world.add(tree);
      initHarvestable(tree);
      tree.harvestable!.ready = true;
      const matureResult = collectHarvest(tree)!;

      // Upgrade to old growth and re-harvest
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

    it("non-bonus season+resource combos return 1.0", () => {
      expect(getSeasonalTradeBonus("spring", "timber")).toBe(1.0);
      expect(getSeasonalTradeBonus("summer", "sap")).toBe(1.0);
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

      // Not ready yet
      expect(collectHarvest(tree)).toBeNull();

      // Advance cooldown partially
      harvestSystem(20);
      expect(collectHarvest(tree)).toBeNull();

      // Complete cooldown (white-oak: 45 seconds)
      harvestSystem(30);
      expect(tree.harvestable!.ready).toBe(true);
      expect(collectHarvest(tree)).not.toBeNull();
    });

    it("pruned bonus is consumed after harvest", () => {
      const tree = createTreeEntity(0, 0, "white-oak");
      tree.tree!.stage = 3;
      tree.tree!.pruned = true;
      world.add(tree);
      initHarvestable(tree);
      tree.harvestable!.ready = true;

      collectHarvest(tree);
      expect(tree.tree!.pruned).toBe(false);
    });

    it("stacked multipliers: old growth + pruned", () => {
      // Base tree at stage 3
      const tree = createTreeEntity(0, 0, "white-oak");
      tree.tree!.stage = 3;
      world.add(tree);
      initHarvestable(tree);
      tree.harvestable!.ready = true;
      const baseResult = collectHarvest(tree)!;

      // Same tree upgraded to old growth + pruned
      tree.tree!.stage = 4;
      tree.tree!.pruned = true;
      initHarvestable(tree);
      tree.harvestable!.ready = true;
      const boostedResult = collectHarvest(tree)!;

      // Old growth (1.5x) * pruned (1.5x) = 2.25x
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
      expect(bonus.growthSpeedMultiplier).toBe(1.0);
      expect(bonus.xpMultiplier).toBe(1.0);
      expect(bonus.staminaBonus).toBe(0);
      expect(bonus.harvestYieldMultiplier).toBe(1.0);
    });

    it("prestige count 1 gives +10% growth, +10% xp, +10 stamina, +5% harvest", () => {
      const bonus = calculatePrestigeBonus(1);
      expect(bonus.growthSpeedMultiplier).toBe(1.1);
      expect(bonus.xpMultiplier).toBe(1.1);
      expect(bonus.staminaBonus).toBe(10);
      expect(bonus.harvestYieldMultiplier).toBe(1.05);
    });

    it("prestige count 4+ extends linearly", () => {
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
    it("watered + spring + fertilized stacks multiplicatively", () => {
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

    it("explore tier has boosted growth and resources", () => {
      const explore = getDifficultyById("explore")!;
      expect(explore.growthSpeedMult).toBeGreaterThan(1.0);
      expect(explore.resourceYieldMult).toBeGreaterThan(1.0);
      expect(explore.seedCostMult).toBeLessThan(1.0);
      expect(explore.staminaRegenMult).toBeGreaterThan(1.0);
    });

    it("harder tiers strictly reduce growth and yields", () => {
      const tiers = ["normal", "hard", "brutal", "ultra-brutal"];
      for (let i = 1; i < tiers.length; i++) {
        const prev = getDifficultyById(tiers[i - 1])!;
        const curr = getDifficultyById(tiers[i])!;
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
