import {
  canAffordExpansion,
  GRID_EXPANSION_TIERS,
  getMaxGridSizeForLevel,
  getNewCellPositions,
  getNextExpansionTier,
} from "./gridExpansion";

describe("grid expansion system", () => {
  describe("GRID_EXPANSION_TIERS", () => {
    it("has 5 tiers", () => {
      expect(GRID_EXPANSION_TIERS).toHaveLength(5);
    });

    it("starts at size 12", () => {
      expect(GRID_EXPANSION_TIERS[0].size).toBe(12);
    });

    it("progresses through 12, 16, 20, 24, 32", () => {
      const sizes = GRID_EXPANSION_TIERS.map((t) => t.size);
      expect(sizes).toEqual([12, 16, 20, 24, 32]);
    });

    it("has increasing level requirements", () => {
      for (let i = 1; i < GRID_EXPANSION_TIERS.length; i++) {
        expect(GRID_EXPANSION_TIERS[i].requiredLevel).toBeGreaterThan(
          GRID_EXPANSION_TIERS[i - 1].requiredLevel,
        );
      }
    });

    it("first tier has no cost", () => {
      expect(Object.keys(GRID_EXPANSION_TIERS[0].cost)).toHaveLength(0);
    });
  });

  describe("getMaxGridSizeForLevel", () => {
    it("returns 12 at level 1", () => {
      expect(getMaxGridSizeForLevel(1)).toBe(12);
    });

    it("returns 16 at level 5", () => {
      expect(getMaxGridSizeForLevel(5)).toBe(16);
    });

    it("returns 20 at level 10", () => {
      expect(getMaxGridSizeForLevel(10)).toBe(20);
    });

    it("returns 24 at level 15", () => {
      expect(getMaxGridSizeForLevel(15)).toBe(24);
    });

    it("returns 32 at level 20+", () => {
      expect(getMaxGridSizeForLevel(20)).toBe(32);
      expect(getMaxGridSizeForLevel(50)).toBe(32);
    });

    it("returns 12 for levels below the first tier", () => {
      expect(getMaxGridSizeForLevel(0)).toBe(12);
    });

    it("returns the correct size between tiers", () => {
      expect(getMaxGridSizeForLevel(7)).toBe(16); // between 5 and 10
      expect(getMaxGridSizeForLevel(12)).toBe(20); // between 10 and 15
    });
  });

  describe("getNextExpansionTier", () => {
    it("returns 16 tier from size 12", () => {
      const next = getNextExpansionTier(12);
      expect(next).not.toBeNull();
      expect(next!.size).toBe(16);
    });

    it("returns 20 tier from size 16", () => {
      const next = getNextExpansionTier(16);
      expect(next).not.toBeNull();
      expect(next!.size).toBe(20);
    });

    it("returns 24 tier from size 20", () => {
      const next = getNextExpansionTier(20);
      expect(next!.size).toBe(24);
    });

    it("returns 32 tier from size 24", () => {
      const next = getNextExpansionTier(24);
      expect(next!.size).toBe(32);
    });

    it("returns null at max size (32)", () => {
      expect(getNextExpansionTier(32)).toBeNull();
    });

    it("returns null for unknown size", () => {
      expect(getNextExpansionTier(18)).toBeNull();
    });
  });

  describe("canAffordExpansion", () => {
    it("returns true when resources and level meet requirements", () => {
      const tier = GRID_EXPANSION_TIERS[1]; // size 16, level 5, timber:100 sap:50
      const resources = { timber: 100, sap: 50 };
      expect(canAffordExpansion(tier, resources, 5)).toBe(true);
    });

    it("returns false when level is too low", () => {
      const tier = GRID_EXPANSION_TIERS[1];
      const resources = { timber: 100, sap: 50 };
      expect(canAffordExpansion(tier, resources, 4)).toBe(false);
    });

    it("returns false when resources are insufficient", () => {
      const tier = GRID_EXPANSION_TIERS[1];
      const resources = { timber: 99, sap: 50 };
      expect(canAffordExpansion(tier, resources, 5)).toBe(false);
    });

    it("returns true with excess resources", () => {
      const tier = GRID_EXPANSION_TIERS[1];
      const resources = { timber: 999, sap: 999 };
      expect(canAffordExpansion(tier, resources, 10)).toBe(true);
    });

    it("returns true for the free first tier at level 1", () => {
      const tier = GRID_EXPANSION_TIERS[0]; // size 12, level 1, cost: {}
      expect(canAffordExpansion(tier, {}, 1)).toBe(true);
    });

    it("checks all 4 resource types for tier 5", () => {
      const tier = GRID_EXPANSION_TIERS[4]; // size 32
      const resources = {
        timber: 1000,
        sap: 500,
        fruit: 250,
        acorns: 100,
      };
      expect(canAffordExpansion(tier, resources, 20)).toBe(true);
      expect(canAffordExpansion(tier, { ...resources, acorns: 99 }, 20)).toBe(
        false,
      );
    });
  });

  describe("getNewCellPositions", () => {
    it("returns new cells when expanding from 12 to 16", () => {
      const positions = getNewCellPositions(12, 16);
      expect(positions.length).toBe(16 * 16 - 12 * 12); // 256 - 144 = 112
    });

    it("returns empty for same size", () => {
      expect(getNewCellPositions(12, 12)).toEqual([]);
    });

    it("returns empty when new size is smaller", () => {
      expect(getNewCellPositions(16, 12)).toEqual([]);
    });

    it("all new positions are outside the old grid", () => {
      const positions = getNewCellPositions(12, 16);
      for (const pos of positions) {
        expect(pos.col >= 12 || pos.row >= 12).toBe(true);
      }
    });

    it("returns correct count for 20 to 24", () => {
      const positions = getNewCellPositions(20, 24);
      expect(positions.length).toBe(24 * 24 - 20 * 20); // 576 - 400 = 176
    });
  });
});
