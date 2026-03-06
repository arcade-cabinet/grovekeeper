import {
  checkNewUnlocks,
  getAllUnlocksUpToLevel,
  getUnlocksForLevel,
  LEVEL_UNLOCKS,
} from "./levelUnlocks";

describe("level unlocks system", () => {
  describe("LEVEL_UNLOCKS", () => {
    it("has entries for multiple levels", () => {
      expect(LEVEL_UNLOCKS.length).toBeGreaterThanOrEqual(15);
    });

    it("starts at level 1", () => {
      expect(LEVEL_UNLOCKS[0].level).toBe(1);
    });

    it("entries are sorted by level", () => {
      for (let i = 1; i < LEVEL_UNLOCKS.length; i++) {
        expect(LEVEL_UNLOCKS[i].level).toBeGreaterThanOrEqual(
          LEVEL_UNLOCKS[i - 1].level,
        );
      }
    });
  });

  describe("getUnlocksForLevel", () => {
    it("returns species and tools for level 1", () => {
      const unlocks = getUnlocksForLevel(1);
      expect(unlocks.species).toContain("white-oak");
      expect(unlocks.tools).toContain("trowel");
      expect(unlocks.tools).toContain("watering-can");
    });

    it("returns species for level 5", () => {
      const unlocks = getUnlocksForLevel(5);
      expect(unlocks.species).toContain("cherry-blossom");
      expect(unlocks.tools).toContain("shovel");
    });

    it("returns empty for levels with no entry", () => {
      const unlocks = getUnlocksForLevel(15);
      expect(unlocks.species).toEqual([]);
      expect(unlocks.tools).toEqual([]);
    });

    it("returns empty for level 0", () => {
      const unlocks = getUnlocksForLevel(0);
      expect(unlocks.species).toEqual([]);
      expect(unlocks.tools).toEqual([]);
    });

    it("returns a copy (mutation-safe)", () => {
      const a = getUnlocksForLevel(1);
      const b = getUnlocksForLevel(1);
      expect(a).toEqual(b);
      expect(a.species).not.toBe(b.species);
    });
  });

  describe("getAllUnlocksUpToLevel", () => {
    it("returns only level 1 unlocks at level 1", () => {
      const unlocks = getAllUnlocksUpToLevel(1);
      expect(unlocks.species).toEqual(["white-oak"]);
      expect(unlocks.tools).toEqual(["trowel", "watering-can"]);
    });

    it("accumulates unlocks up to level 5", () => {
      const unlocks = getAllUnlocksUpToLevel(5);
      expect(unlocks.species).toContain("white-oak");
      expect(unlocks.species).toContain("weeping-willow");
      expect(unlocks.species).toContain("elder-pine");
      expect(unlocks.species).toContain("cherry-blossom");
      expect(unlocks.tools).toContain("trowel");
      expect(unlocks.tools).toContain("almanac");
      expect(unlocks.tools).toContain("pruning-shears");
      expect(unlocks.tools).toContain("seed-pouch");
      expect(unlocks.tools).toContain("shovel");
    });

    it("includes all species and tools at max level", () => {
      const unlocks = getAllUnlocksUpToLevel(100);
      expect(unlocks.species.length).toBeGreaterThanOrEqual(12);
      expect(unlocks.tools.length).toBeGreaterThanOrEqual(8);
    });

    it("returns empty for level 0", () => {
      const unlocks = getAllUnlocksUpToLevel(0);
      expect(unlocks.species).toEqual([]);
      expect(unlocks.tools).toEqual([]);
    });
  });

  describe("checkNewUnlocks", () => {
    it("returns new unlocks between levels", () => {
      const unlocks = checkNewUnlocks(1, 3);
      expect(unlocks.species).toContain("weeping-willow");
      expect(unlocks.species).toContain("elder-pine");
      expect(unlocks.tools).toContain("almanac");
      expect(unlocks.tools).toContain("pruning-shears");
    });

    it("returns empty when levels are the same", () => {
      const unlocks = checkNewUnlocks(5, 5);
      expect(unlocks.species).toEqual([]);
      expect(unlocks.tools).toEqual([]);
    });

    it("returns empty when new level is lower", () => {
      const unlocks = checkNewUnlocks(5, 3);
      expect(unlocks.species).toEqual([]);
      expect(unlocks.tools).toEqual([]);
    });

    it("does not include old-level unlocks", () => {
      const unlocks = checkNewUnlocks(1, 2);
      expect(unlocks.species).not.toContain("white-oak");
      expect(unlocks.species).toContain("weeping-willow");
    });

    it("includes the new level unlocks (inclusive)", () => {
      const unlocks = checkNewUnlocks(4, 5);
      expect(unlocks.species).toContain("cherry-blossom");
      expect(unlocks.tools).toContain("shovel");
    });

    it("handles large level jumps", () => {
      const unlocks = checkNewUnlocks(0, 22);
      expect(unlocks.species.length).toBeGreaterThanOrEqual(12);
    });
  });
});
