import resourcesConfig from "@/config/game/resources.json" with { type: "json" };
import { createRNG } from "@/game/utils/seedRNG";
import { createLootDrop, rollLoot, rollLootForEnemy, updateLootDespawn } from "./lootSystem.ts";

const ALL_RESOURCE_TYPES: string[] = resourcesConfig.types;

describe("Loot System", () => {
  describe("rollLoot", () => {
    it("returns empty array for unknown loot table", () => {
      const rng = createRNG(42);
      expect(rollLoot("nonexistent", 1, rng)).toEqual([]);
    });

    it("returns deterministic loot with same RNG seed", () => {
      const a = rollLoot("bat-loot", 1, createRNG(123));
      const b = rollLoot("bat-loot", 1, createRNG(123));
      expect(a).toEqual(b);
    });

    it("gives more loot at higher tiers", () => {
      const totalAt1 = sumLoot(rollLoot("skeleton-loot", 1, createRNG(99)));
      const totalAt5 = sumLoot(rollLoot("skeleton-loot", 5, createRNG(99)));
      expect(totalAt5).toBeGreaterThanOrEqual(totalAt1);
    });

    it("returns valid resource types", () => {
      const validTypes = ALL_RESOURCE_TYPES;
      const loot = rollLoot("knight-loot", 2, createRNG(555));
      for (const item of loot) {
        expect(validTypes).toContain(item.type);
        expect(item.amount).toBeGreaterThan(0);
      }
    });
  });

  describe("createLootDrop", () => {
    it("creates a loot drop with correct resources", () => {
      const rolls = [
        { type: "timber", amount: 3 },
        { type: "sap", amount: 1 },
      ];
      const drop = createLootDrop(rolls);
      expect(drop.resources).toHaveLength(2);
      expect(drop.resources[0].type).toBe("timber");
      expect(drop.despawnTimer).toBe(60);
    });
  });

  describe("updateLootDespawn", () => {
    it("decrements despawn timer", () => {
      const drop = createLootDrop([{ type: "timber", amount: 1 }]);
      updateLootDespawn(drop, 10);
      expect(drop.despawnTimer).toBe(50);
    });

    it("returns true when timer reaches zero", () => {
      const drop = createLootDrop([{ type: "timber", amount: 1 }]);
      const expired = updateLootDespawn(drop, 60);
      expect(expired).toBe(true);
    });

    it("returns false when timer has time remaining", () => {
      const drop = createLootDrop([{ type: "timber", amount: 1 }]);
      const expired = updateLootDespawn(drop, 30);
      expect(expired).toBe(false);
    });

    it("updates float height for bobbing animation", () => {
      const drop = createLootDrop([{ type: "sap", amount: 2 }]);
      updateLootDespawn(drop, 1);
      expect(drop.floatHeight).not.toBe(0);
    });
  });
});

describe("rollLootForEnemy (Spec §34)", () => {
  it("returns a LootDropComponent with despawn timer", () => {
    const drop = rollLootForEnemy("enemy-1", "bat-loot", 1, "TestSeed");
    expect(drop.despawnTimer).toBe(60);
    expect(Array.isArray(drop.resources)).toBe(true);
  });

  it("is deterministic for the same enemyId + worldSeed", () => {
    const a = rollLootForEnemy("enemy-42", "skeleton-loot", 2, "SameWorld");
    const b = rollLootForEnemy("enemy-42", "skeleton-loot", 2, "SameWorld");
    expect(a.resources).toEqual(b.resources);
  });

  it("produces different results for different enemyIds", () => {
    const results = new Set<string>();
    for (let i = 0; i < 20; i++) {
      const drop = rollLootForEnemy(`enemy-${i}`, "bat-loot", 1, "WorldA");
      results.add(JSON.stringify(drop.resources));
    }
    // At least 2 distinct outcomes across 20 different enemy IDs
    expect(results.size).toBeGreaterThan(1);
  });

  it("produces different results for different worldSeeds", () => {
    const a = rollLootForEnemy("enemy-1", "knight-loot", 3, "SeedAlpha");
    const b = rollLootForEnemy("enemy-1", "knight-loot", 3, "SeedBeta");
    // Two distinct seeds should yield different RNG streams
    expect(JSON.stringify(a.resources)).not.toBe(JSON.stringify(b.resources));
  });

  it("handles sprite-loot table", () => {
    const drop = rollLootForEnemy("sprite-1", "sprite-loot", 1, "World");
    expect(drop.despawnTimer).toBe(60);
    const validTypes = [
      "timber",
      "sap",
      "fruit",
      "acorns",
      "wood",
      "stone",
      "metal_scrap",
      "fiber",
      "ore",
      "berries",
      "herbs",
      "meat",
      "hide",
      "fish",
      "seeds",
    ];
    for (const item of drop.resources) {
      expect(validTypes).toContain(item.type);
    }
  });
});

function sumLoot(loot: { amount: number }[]): number {
  return loot.reduce((sum, item) => sum + item.amount, 0);
}
