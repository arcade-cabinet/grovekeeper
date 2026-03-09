import {
  calculateTier,
  encounterChance,
  getEnemyTypesForBiome,
  spawnEnemiesForChunk,
} from "./enemySpawning.ts";

describe("Enemy Spawning System", () => {
  describe("getEnemyTypesForBiome", () => {
    it("returns bat and corrupted-hedge for labyrinth biome", () => {
      const types = getEnemyTypesForBiome("labyrinth", "sapling");
      expect(types).toContain("bat");
      expect(types).toContain("skeleton-warrior");
      expect(types).toContain("corrupted-hedge");
    });

    it("returns bat for forest biome", () => {
      const types = getEnemyTypesForBiome("forest", "sapling");
      expect(types).toContain("bat");
    });

    it("returns empty array for seedling difficulty", () => {
      const types = getEnemyTypesForBiome("labyrinth", "seedling");
      expect(types).toEqual([]);
    });

    it("returns knight for ruins biome", () => {
      const types = getEnemyTypesForBiome("ruins", "sapling");
      expect(types).toContain("knight");
      expect(types).toContain("skeleton-warrior");
    });
  });

  describe("calculateTier", () => {
    it("returns tier 1 for origin chunks", () => {
      expect(calculateTier(0, "sapling")).toBe(1);
    });

    it("increases tier with distance", () => {
      const t1 = calculateTier(0, "sapling");
      const t2 = calculateTier(16, "sapling");
      expect(t2).toBeGreaterThan(t1);
    });

    it("caps at max tier", () => {
      expect(calculateTier(1000, "sapling")).toBeLessThanOrEqual(5);
    });

    it("scales tier with difficulty multiplier", () => {
      const normal = calculateTier(8, "sapling");
      const ironwood = calculateTier(8, "ironwood");
      expect(ironwood).toBeGreaterThanOrEqual(normal);
    });
  });

  describe("encounterChance", () => {
    it("returns 0 for seedling difficulty", () => {
      expect(encounterChance(5, false, "forest", "seedling")).toBe(0);
    });

    it("is higher at night", () => {
      const day = encounterChance(5, false, "forest", "sapling");
      const night = encounterChance(5, true, "forest", "sapling");
      expect(night).toBeGreaterThan(day);
    });

    it("is higher in labyrinth biome", () => {
      const forest = encounterChance(5, false, "forest", "sapling");
      const labyrinth = encounterChance(5, false, "labyrinth", "sapling");
      expect(labyrinth).toBeGreaterThan(forest);
    });

    it("caps at 1", () => {
      expect(encounterChance(100, true, "labyrinth", "ironwood")).toBeLessThanOrEqual(1);
    });
  });

  describe("spawnEnemiesForChunk", () => {
    it("returns empty array for seedling difficulty", () => {
      const result = spawnEnemiesForChunk(5, 5, "forest", "seedling", "test-seed", false);
      expect(result).toEqual([]);
    });

    it("produces deterministic results with same seed", () => {
      const a = spawnEnemiesForChunk(3, 3, "labyrinth", "sapling", "seed-abc", false);
      const b = spawnEnemiesForChunk(3, 3, "labyrinth", "sapling", "seed-abc", false);
      expect(a).toEqual(b);
    });

    it("produces different results with different seeds", () => {
      const a = spawnEnemiesForChunk(3, 3, "labyrinth", "hardwood", "seed-1", false);
      const b = spawnEnemiesForChunk(3, 3, "labyrinth", "hardwood", "seed-2", false);
      // At least one field should differ (positions or types)
      const aStr = JSON.stringify(a);
      const bStr = JSON.stringify(b);
      expect(aStr).not.toBe(bStr);
    });

    it("spawns enemies with valid positions within chunk", () => {
      const result = spawnEnemiesForChunk(2, 3, "labyrinth", "ironwood", "test", true);
      for (const entry of result) {
        expect(entry.x).toBeGreaterThanOrEqual(2 * 16);
        expect(entry.x).toBeLessThan(2 * 16 + 16);
        expect(entry.z).toBeGreaterThanOrEqual(3 * 16);
        expect(entry.z).toBeLessThan(3 * 16 + 16);
      }
    });
  });
});
