import { rollLoot, createLootDrop, updateLootDespawn } from "./lootSystem";
import { createRNG } from "@/game/utils/seedRNG";

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
      const validTypes = ["timber", "sap", "fruit", "acorns"];
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

function sumLoot(loot: { amount: number }[]): number {
  return loot.reduce((sum, item) => sum + item.amount, 0);
}
