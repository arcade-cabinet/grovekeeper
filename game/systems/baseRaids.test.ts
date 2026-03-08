/**
 * Base raids system tests.
 * Tests raid probability, wave generation, warnings, loot, night-only trigger,
 * and approach directions.
 *
 * Spec §18.5, §34.
 */

import type { DayNightComponent } from "../ecs/components/procedural/index.ts";
import {
  calculateRaidLoot,
  calculateRaidProbability,
  generateRaidWave,
  getApproachDirections,
  getRaidWarning,
  shouldTriggerRaid,
} from "./baseRaids.ts";

// Minimal DayNightComponent fixture for tests
const nightDayNight: DayNightComponent = {
  gameHour: 22,
  timeOfDay: "night",
  dayNumber: 5,
  season: "autumn",
  ambientColor: "#112244",
  ambientIntensity: 0.2,
  directionalColor: "#aaaacc",
  directionalIntensity: 0.3,
  sunIntensity: 0.3,
  shadowOpacity: 0.5,
  skyZenithColor: "#112244",
  skyHorizonColor: "#334466",
  starIntensity: 0.8,
};

describe("Base Raids System (Spec §18.5, §34)", () => {
  describe("calculateRaidProbability", () => {
    it("should return 0 for exploration difficulty", () => {
      expect(calculateRaidProbability(500, 30, "exploration")).toBe(0);
    });

    it("should return higher probability for higher base value", () => {
      const low = calculateRaidProbability(50, 10, "standard");
      const high = calculateRaidProbability(500, 10, "standard");
      expect(high).toBeGreaterThan(low);
    });

    it("should return higher probability for later days", () => {
      const early = calculateRaidProbability(100, 5, "standard");
      const late = calculateRaidProbability(100, 40, "standard");
      expect(late).toBeGreaterThan(early);
    });

    it("should scale with difficulty multiplier", () => {
      const gentle = calculateRaidProbability(200, 20, "gentle");
      const harsh = calculateRaidProbability(200, 20, "harsh");
      expect(harsh).toBeGreaterThan(gentle);
    });

    it("should cap at max probability", () => {
      const prob = calculateRaidProbability(10000, 1000, "ironwood");
      expect(prob).toBeLessThanOrEqual(0.7);
    });

    it("should never return negative", () => {
      const prob = calculateRaidProbability(0, 0, "gentle");
      expect(prob).toBeGreaterThanOrEqual(0);
    });
  });

  describe("shouldTriggerRaid (Spec §18.5 night-only, Survival mode)", () => {
    it("should return false in Exploration mode (affectsGameplay = false)", () => {
      expect(shouldTriggerRaid(nightDayNight, false)).toBe(false);
    });

    it("should return true at night in Survival mode", () => {
      expect(shouldTriggerRaid(nightDayNight, true)).toBe(true);
    });

    it("should return false at noon even in Survival mode", () => {
      const noon: DayNightComponent = { ...nightDayNight, timeOfDay: "noon", gameHour: 12 };
      expect(shouldTriggerRaid(noon, true)).toBe(false);
    });

    it("should return false at dawn in Survival mode", () => {
      const dawn: DayNightComponent = { ...nightDayNight, timeOfDay: "dawn", gameHour: 5 };
      expect(shouldTriggerRaid(dawn, true)).toBe(false);
    });

    it("should return false at evening in Survival mode", () => {
      const evening: DayNightComponent = { ...nightDayNight, timeOfDay: "evening", gameHour: 19 };
      expect(shouldTriggerRaid(evening, true)).toBe(false);
    });

    it("should return false at midnight in Survival mode (only 'night' triggers)", () => {
      const midnight: DayNightComponent = { ...nightDayNight, timeOfDay: "midnight", gameHour: 0 };
      expect(shouldTriggerRaid(midnight, true)).toBe(false);
    });
  });

  describe("generateRaidWave (seeded by dayNumber via scopedRNG('raid', ...))", () => {
    it("should generate at least 1 wave", () => {
      const raid = generateRaidWave(50, 1, "test-seed");
      expect(raid.waves.length).toBeGreaterThanOrEqual(1);
    });

    it("should not exceed max waves", () => {
      const raid = generateRaidWave(1000, 5, "test-seed");
      expect(raid.waves.length).toBeLessThanOrEqual(3);
    });

    it("should include enemies appropriate to base value", () => {
      const raid = generateRaidWave(50, 1, "test-seed");
      const enemyTypes = raid.waves.flatMap((w) => w.enemies.map((e) => e.enemyType));
      expect(enemyTypes).toContain("grove_pest");
    });

    it("should be deterministic with same seed", () => {
      const a = generateRaidWave(200, 3, "seed-123");
      const b = generateRaidWave(200, 3, "seed-123");
      expect(a.totalEnemyCount).toBe(b.totalEnemyCount);
      expect(a.waves.length).toBe(b.waves.length);
    });

    it("should produce different results with different seeds", () => {
      const a = generateRaidWave(200, 3, "seed-aaa");
      const b = generateRaidWave(200, 3, "seed-bbb");
      // With different seeds, at least one property should differ
      const aSerialized = JSON.stringify(a);
      const bSerialized = JSON.stringify(b);
      expect(aSerialized).not.toBe(bSerialized);
    });

    it("should have first wave with 0 delay", () => {
      const raid = generateRaidWave(100, 1, "test-seed");
      expect(raid.waves[0].delayBeforeWave).toBe(0);
    });

    it("should track total enemy count", () => {
      const raid = generateRaidWave(300, 2, "test-seed");
      const counted = raid.waves.reduce(
        (sum, w) => sum + w.enemies.reduce((s, e) => s + e.count, 0),
        0,
      );
      expect(raid.totalEnemyCount).toBe(counted);
    });

    it("should produce different raids for different day numbers", () => {
      const day3 = generateRaidWave(200, 3, "seed-xyz");
      const day7 = generateRaidWave(200, 7, "seed-xyz");
      expect(JSON.stringify(day3)).not.toBe(JSON.stringify(day7));
    });
  });

  describe("getRaidWarning", () => {
    it("should return horn blast message at 30 seconds", () => {
      const warning = getRaidWarning(30);
      expect(warning).toContain("horn");
    });

    it("should return ominous sounds at 120 seconds", () => {
      const warning = getRaidWarning(120);
      expect(warning).toContain("Strange sounds");
    });

    it("should return null when raid is far away", () => {
      expect(getRaidWarning(300)).toBeNull();
    });

    it("should return horn blast when very close (below 30s)", () => {
      const warning = getRaidWarning(10);
      expect(warning).toContain("horn");
    });
  });

  describe("calculateRaidLoot", () => {
    it("should return base multiplier for minimal difficulty", () => {
      const loot = calculateRaidLoot(0, "gentle");
      expect(loot).toBeGreaterThanOrEqual(1.0);
    });

    it("should scale with estimated difficulty", () => {
      const low = calculateRaidLoot(5, "standard");
      const high = calculateRaidLoot(50, "standard");
      expect(high).toBeGreaterThan(low);
    });

    it("should give bonus for harder difficulties", () => {
      const standard = calculateRaidLoot(20, "standard");
      const ironwood = calculateRaidLoot(20, "ironwood");
      expect(ironwood).toBeGreaterThan(standard);
    });
  });

  describe("getApproachDirections (chunk-edge seeded directions)", () => {
    const VALID_DIRS = ["north", "south", "east", "west"];

    it("should return at least one direction", () => {
      const dirs = getApproachDirections(0, 0, "test-seed", 1);
      expect(dirs.length).toBeGreaterThanOrEqual(1);
    });

    it("should return at most two directions", () => {
      const dirs = getApproachDirections(0, 0, "test-seed", 1);
      expect(dirs.length).toBeLessThanOrEqual(2);
    });

    it("should only return valid cardinal directions", () => {
      const dirs = getApproachDirections(3, 5, "test-seed", 7);
      for (const d of dirs) {
        expect(VALID_DIRS).toContain(d);
      }
    });

    it("should be deterministic with same params", () => {
      const a = getApproachDirections(2, 4, "seed-123", 3);
      const b = getApproachDirections(2, 4, "seed-123", 3);
      expect(a).toEqual(b);
    });

    it("should not return duplicate directions in a single result", () => {
      const dirs = getApproachDirections(1, 1, "test-seed", 5);
      const unique = new Set(dirs);
      expect(unique.size).toBe(dirs.length);
    });

    it("should vary across different chunk positions", () => {
      // Sample 5x5 chunks and confirm more than one direction is used
      const dirs = new Set<string>();
      for (let cx = 0; cx < 5; cx++) {
        for (let cz = 0; cz < 5; cz++) {
          getApproachDirections(cx, cz, "test-seed", 1).forEach((d) => {
            dirs.add(d);
          });
        }
      }
      expect(dirs.size).toBeGreaterThan(1);
    });

    it("should vary across different day numbers", () => {
      const dirs = new Set<string>();
      for (let day = 1; day <= 10; day++) {
        getApproachDirections(0, 0, "test-seed", day).forEach((d) => {
          dirs.add(d);
        });
      }
      expect(dirs.size).toBeGreaterThan(1);
    });
  });
});
