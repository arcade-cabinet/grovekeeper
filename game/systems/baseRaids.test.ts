/**
 * Base raids system tests.
 * Tests raid probability, wave generation, warnings, and loot.
 */

import {
  calculateRaidProbability,
  generateRaidWave,
  getRaidWarning,
  calculateRaidLoot,
} from "./baseRaids";

describe("Base Raids System", () => {
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

  describe("generateRaidWave", () => {
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
      const enemyTypes = raid.waves.flatMap((w) =>
        w.enemies.map((e) => e.enemyType),
      );
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
});
