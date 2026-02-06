import { describe, it, expect } from "vitest";
import {
  LEVEL_UNLOCKS,
  getUnlocksForLevel,
  getAllUnlocksUpToLevel,
  checkNewUnlocks,
} from "./levelUnlocks";

describe("Level Unlock System", () => {
  describe("LEVEL_UNLOCKS table", () => {
    it("has entries sorted by ascending level", () => {
      for (let i = 1; i < LEVEL_UNLOCKS.length; i++) {
        expect(LEVEL_UNLOCKS[i].level).toBeGreaterThan(
          LEVEL_UNLOCKS[i - 1].level,
        );
      }
    });

    it("contains 10 entries spanning levels 1 through 12", () => {
      expect(LEVEL_UNLOCKS).toHaveLength(10);
      expect(LEVEL_UNLOCKS[0].level).toBe(1);
      expect(LEVEL_UNLOCKS[LEVEL_UNLOCKS.length - 1].level).toBe(12);
    });
  });

  describe("getUnlocksForLevel", () => {
    it("returns white-oak, trowel, and watering-can at level 1", () => {
      const result = getUnlocksForLevel(1);
      expect(result.species).toEqual(["white-oak"]);
      expect(result.tools).toEqual(["trowel", "watering-can"]);
    });

    it("returns cherry-blossom and shovel at level 5", () => {
      const result = getUnlocksForLevel(5);
      expect(result.species).toEqual(["cherry-blossom"]);
      expect(result.tools).toEqual(["shovel"]);
    });

    it("returns seed-pouch at level 4 with no species", () => {
      const result = getUnlocksForLevel(4);
      expect(result.species).toEqual([]);
      expect(result.tools).toEqual(["seed-pouch"]);
    });

    it("returns ghost-birch at level 6 with no tools", () => {
      const result = getUnlocksForLevel(6);
      expect(result.species).toEqual(["ghost-birch"]);
      expect(result.tools).toEqual([]);
    });

    it("returns flame-maple and compost-bin at level 10", () => {
      const result = getUnlocksForLevel(10);
      expect(result.species).toEqual(["flame-maple"]);
      expect(result.tools).toEqual(["compost-bin"]);
    });

    it("returns baobab at level 12 with no tools", () => {
      const result = getUnlocksForLevel(12);
      expect(result.species).toEqual(["baobab"]);
      expect(result.tools).toEqual([]);
    });

    it("returns empty arrays for a level with no entry (level 9)", () => {
      const result = getUnlocksForLevel(9);
      expect(result.species).toEqual([]);
      expect(result.tools).toEqual([]);
    });

    it("returns empty arrays for level 0", () => {
      const result = getUnlocksForLevel(0);
      expect(result.species).toEqual([]);
      expect(result.tools).toEqual([]);
    });

    it("returns a fresh copy, not a reference to internal data", () => {
      const a = getUnlocksForLevel(1);
      const b = getUnlocksForLevel(1);
      expect(a).not.toBe(b);
      expect(a.species).not.toBe(b.species);
      a.species.push("mutated");
      expect(b.species).not.toContain("mutated");
    });
  });

  describe("getAllUnlocksUpToLevel", () => {
    it("includes all species and tools up to level 3", () => {
      const result = getAllUnlocksUpToLevel(3);
      expect(result.species).toEqual([
        "white-oak",
        "weeping-willow",
        "elder-pine",
      ]);
      expect(result.tools).toEqual([
        "trowel",
        "watering-can",
        "almanac",
        "pruning-shears",
      ]);
    });

    it("includes everything at level 1", () => {
      const result = getAllUnlocksUpToLevel(1);
      expect(result.species).toEqual(["white-oak"]);
      expect(result.tools).toEqual(["trowel", "watering-can"]);
    });

    it("includes all 8 species and 8 tools at level 12", () => {
      const result = getAllUnlocksUpToLevel(12);
      expect(result.species).toHaveLength(8);
      expect(result.tools).toHaveLength(8);
      expect(result.species).toContain("baobab");
      expect(result.tools).toContain("compost-bin");
    });

    it("returns empty arrays for level 0", () => {
      const result = getAllUnlocksUpToLevel(0);
      expect(result.species).toEqual([]);
      expect(result.tools).toEqual([]);
    });

    it("handles levels beyond the table (level 99) by returning everything", () => {
      const atMax = getAllUnlocksUpToLevel(12);
      const beyond = getAllUnlocksUpToLevel(99);
      expect(beyond).toEqual(atMax);
    });

    it("includes level 4 tool but no species for level 4", () => {
      const result = getAllUnlocksUpToLevel(4);
      expect(result.species).toEqual([
        "white-oak",
        "weeping-willow",
        "elder-pine",
      ]);
      expect(result.tools).toEqual([
        "trowel",
        "watering-can",
        "almanac",
        "pruning-shears",
        "seed-pouch",
      ]);
    });
  });

  describe("checkNewUnlocks", () => {
    it("returns weeping-willow, elder-pine, almanac, pruning-shears for 1->3", () => {
      const result = checkNewUnlocks(1, 3);
      expect(result.species).toEqual(["weeping-willow", "elder-pine"]);
      expect(result.tools).toEqual(["almanac", "pruning-shears"]);
    });

    it("returns empty arrays when newLevel equals oldLevel (5->5)", () => {
      const result = checkNewUnlocks(5, 5);
      expect(result.species).toEqual([]);
      expect(result.tools).toEqual([]);
    });

    it("returns empty arrays when newLevel is less than oldLevel", () => {
      const result = checkNewUnlocks(5, 3);
      expect(result.species).toEqual([]);
      expect(result.tools).toEqual([]);
    });

    it("returns only level 2 unlocks for 1->2", () => {
      const result = checkNewUnlocks(1, 2);
      expect(result.species).toEqual(["weeping-willow"]);
      expect(result.tools).toEqual(["almanac"]);
    });

    it("returns everything for 0->12", () => {
      const result = checkNewUnlocks(0, 12);
      const all = getAllUnlocksUpToLevel(12);
      expect(result).toEqual(all);
    });

    it("handles multi-level jumps across gaps (7->12)", () => {
      const result = checkNewUnlocks(7, 12);
      expect(result.species).toEqual(["redwood", "flame-maple", "baobab"]);
      expect(result.tools).toEqual(["compost-bin"]);
    });

    it("returns only the exact single level for adjacent levels (4->5)", () => {
      const result = checkNewUnlocks(4, 5);
      expect(result.species).toEqual(["cherry-blossom"]);
      expect(result.tools).toEqual(["shovel"]);
    });
  });
});
