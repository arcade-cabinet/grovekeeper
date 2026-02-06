import { describe, it, expect } from "vitest";
import {
  GRID_EXPANSION_TIERS,
  getMaxGridSizeForLevel,
  getNextExpansionTier,
  canAffordExpansion,
  getNewCellPositions,
} from "./gridExpansion";

describe("Grid Expansion System", () => {
  describe("GRID_EXPANSION_TIERS", () => {
    it("has exactly 5 tiers", () => {
      expect(GRID_EXPANSION_TIERS).toHaveLength(5);
    });

    it("starts at size 12 and ends at size 32", () => {
      expect(GRID_EXPANSION_TIERS[0].size).toBe(12);
      expect(GRID_EXPANSION_TIERS[GRID_EXPANSION_TIERS.length - 1].size).toBe(
        32,
      );
    });

    it("has tiers in ascending size order", () => {
      for (let i = 1; i < GRID_EXPANSION_TIERS.length; i++) {
        expect(GRID_EXPANSION_TIERS[i].size).toBeGreaterThan(
          GRID_EXPANSION_TIERS[i - 1].size,
        );
      }
    });

    it("has tiers in ascending level order", () => {
      for (let i = 1; i < GRID_EXPANSION_TIERS.length; i++) {
        expect(GRID_EXPANSION_TIERS[i].requiredLevel).toBeGreaterThan(
          GRID_EXPANSION_TIERS[i - 1].requiredLevel,
        );
      }
    });

    it("starting tier (12) is free with no cost", () => {
      expect(GRID_EXPANSION_TIERS[0].cost).toEqual({});
      expect(GRID_EXPANSION_TIERS[0].requiredLevel).toBe(1);
    });

    it("tier 16 costs 100 timber and 50 sap at level 5", () => {
      const tier16 = GRID_EXPANSION_TIERS[1];
      expect(tier16.size).toBe(16);
      expect(tier16.requiredLevel).toBe(5);
      expect(tier16.cost).toEqual({ timber: 100, sap: 50 });
    });

    it("tier 20 costs 250 timber, 100 sap, 50 fruit at level 10", () => {
      const tier20 = GRID_EXPANSION_TIERS[2];
      expect(tier20.size).toBe(20);
      expect(tier20.requiredLevel).toBe(10);
      expect(tier20.cost).toEqual({ timber: 250, sap: 100, fruit: 50 });
    });

    it("tier 24 costs 500 timber, 250 sap, 100 fruit, 50 acorns at level 15", () => {
      const tier24 = GRID_EXPANSION_TIERS[3];
      expect(tier24.size).toBe(24);
      expect(tier24.requiredLevel).toBe(15);
      expect(tier24.cost).toEqual({
        timber: 500,
        sap: 250,
        fruit: 100,
        acorns: 50,
      });
    });

    it("tier 32 costs 1000 timber, 500 sap, 250 fruit, 100 acorns at level 20", () => {
      const tier32 = GRID_EXPANSION_TIERS[4];
      expect(tier32.size).toBe(32);
      expect(tier32.requiredLevel).toBe(20);
      expect(tier32.cost).toEqual({
        timber: 1000,
        sap: 500,
        fruit: 250,
        acorns: 100,
      });
    });
  });

  describe("getMaxGridSizeForLevel", () => {
    it("returns 12 at level 1 (starting grid)", () => {
      expect(getMaxGridSizeForLevel(1)).toBe(12);
    });

    it("returns 12 at level 3 (between tiers)", () => {
      expect(getMaxGridSizeForLevel(3)).toBe(12);
    });

    it("returns 12 at level 4 (just below tier 16)", () => {
      expect(getMaxGridSizeForLevel(4)).toBe(12);
    });

    it("returns 16 at level 5 (exactly at tier threshold)", () => {
      expect(getMaxGridSizeForLevel(5)).toBe(16);
    });

    it("returns 16 at level 7 (between tier 16 and 20)", () => {
      expect(getMaxGridSizeForLevel(7)).toBe(16);
    });

    it("returns 20 at level 10", () => {
      expect(getMaxGridSizeForLevel(10)).toBe(20);
    });

    it("returns 24 at level 15", () => {
      expect(getMaxGridSizeForLevel(15)).toBe(24);
    });

    it("returns 32 at level 20", () => {
      expect(getMaxGridSizeForLevel(20)).toBe(32);
    });

    it("returns 32 at level 99 (beyond all tiers)", () => {
      expect(getMaxGridSizeForLevel(99)).toBe(32);
    });

    it("returns 12 at level 0 (below starting level)", () => {
      expect(getMaxGridSizeForLevel(0)).toBe(12);
    });
  });

  describe("getNextExpansionTier", () => {
    it("returns tier 16 when current size is 12", () => {
      const next = getNextExpansionTier(12);
      expect(next).not.toBeNull();
      expect(next!.size).toBe(16);
      expect(next!.requiredLevel).toBe(5);
    });

    it("returns tier 20 when current size is 16", () => {
      const next = getNextExpansionTier(16);
      expect(next).not.toBeNull();
      expect(next!.size).toBe(20);
    });

    it("returns tier 24 when current size is 20", () => {
      const next = getNextExpansionTier(20);
      expect(next).not.toBeNull();
      expect(next!.size).toBe(24);
    });

    it("returns tier 32 when current size is 24", () => {
      const next = getNextExpansionTier(24);
      expect(next).not.toBeNull();
      expect(next!.size).toBe(32);
    });

    it("returns null when current size is 32 (already at max)", () => {
      expect(getNextExpansionTier(32)).toBeNull();
    });

    it("returns null for an unrecognized size", () => {
      expect(getNextExpansionTier(15)).toBeNull();
    });
  });

  describe("canAffordExpansion", () => {
    const tier16 = GRID_EXPANSION_TIERS[1]; // 100 timber, 50 sap, level 5

    it("returns true when player has enough resources and level", () => {
      const resources = { timber: 200, sap: 100, fruit: 0, acorns: 0 };
      expect(canAffordExpansion(tier16, resources, 5)).toBe(true);
    });

    it("returns true when player has exactly enough resources", () => {
      const resources = { timber: 100, sap: 50, fruit: 0, acorns: 0 };
      expect(canAffordExpansion(tier16, resources, 5)).toBe(true);
    });

    it("returns false when player level is too low", () => {
      const resources = { timber: 200, sap: 100, fruit: 0, acorns: 0 };
      expect(canAffordExpansion(tier16, resources, 4)).toBe(false);
    });

    it("returns false when timber is insufficient", () => {
      const resources = { timber: 50, sap: 100, fruit: 0, acorns: 0 };
      expect(canAffordExpansion(tier16, resources, 5)).toBe(false);
    });

    it("returns false when sap is insufficient", () => {
      const resources = { timber: 200, sap: 10, fruit: 0, acorns: 0 };
      expect(canAffordExpansion(tier16, resources, 5)).toBe(false);
    });

    it("returns true for the starting tier (free, level 1)", () => {
      const startingTier = GRID_EXPANSION_TIERS[0];
      const resources = { timber: 0, sap: 0, fruit: 0, acorns: 0 };
      expect(canAffordExpansion(startingTier, resources, 1)).toBe(true);
    });

    it("handles tier 32 with all four resource types", () => {
      const tier32 = GRID_EXPANSION_TIERS[4];
      const sufficient = {
        timber: 1000,
        sap: 500,
        fruit: 250,
        acorns: 100,
      };
      const insufficient = {
        timber: 1000,
        sap: 500,
        fruit: 250,
        acorns: 99,
      };
      expect(canAffordExpansion(tier32, sufficient, 20)).toBe(true);
      expect(canAffordExpansion(tier32, insufficient, 20)).toBe(false);
    });

    it("treats missing resource keys as zero", () => {
      const resources = { timber: 200 };
      expect(canAffordExpansion(tier16, resources, 5)).toBe(false);
    });

    it("returns true with high level even if only level was blocking", () => {
      const resources = { timber: 100, sap: 50 };
      expect(canAffordExpansion(tier16, resources, 10)).toBe(true);
    });
  });

  describe("getNewCellPositions", () => {
    it("returns 112 new cells when expanding 12 -> 16", () => {
      const positions = getNewCellPositions(12, 16);
      // 16*16 - 12*12 = 256 - 144 = 112
      expect(positions).toHaveLength(112);
    });

    it("returns 144 new cells when expanding 16 -> 20", () => {
      const positions = getNewCellPositions(16, 20);
      // 20*20 - 16*16 = 400 - 256 = 144
      expect(positions).toHaveLength(144);
    });

    it("returns 176 new cells when expanding 20 -> 24", () => {
      const positions = getNewCellPositions(20, 24);
      // 24*24 - 20*20 = 576 - 400 = 176
      expect(positions).toHaveLength(176);
    });

    it("returns 448 new cells when expanding 24 -> 32", () => {
      const positions = getNewCellPositions(24, 32);
      // 32*32 - 24*24 = 1024 - 576 = 448
      expect(positions).toHaveLength(448);
    });

    it("returns empty array when newSize <= oldSize", () => {
      expect(getNewCellPositions(16, 12)).toEqual([]);
      expect(getNewCellPositions(12, 12)).toEqual([]);
    });

    it("new cells do not overlap with old grid cells", () => {
      const oldSize = 12;
      const newSize = 16;
      const positions = getNewCellPositions(oldSize, newSize);

      for (const { col, row } of positions) {
        // Each new cell must have at least one coordinate >= oldSize
        const isInsideOldGrid = col < oldSize && row < oldSize;
        expect(isInsideOldGrid).toBe(false);
      }
    });

    it("all new cells are within the new grid bounds", () => {
      const newSize = 16;
      const positions = getNewCellPositions(12, newSize);

      for (const { col, row } of positions) {
        expect(col).toBeGreaterThanOrEqual(0);
        expect(col).toBeLessThan(newSize);
        expect(row).toBeGreaterThanOrEqual(0);
        expect(row).toBeLessThan(newSize);
      }
    });

    it("combined old + new cells equal the full new grid", () => {
      const oldSize = 12;
      const newSize = 16;
      const newPositions = getNewCellPositions(oldSize, newSize);
      const totalCells = oldSize * oldSize + newPositions.length;
      expect(totalCells).toBe(newSize * newSize);
    });

    it("new positions contain no duplicates", () => {
      const positions = getNewCellPositions(12, 16);
      const keys = new Set(positions.map((p) => `${p.col},${p.row}`));
      expect(keys.size).toBe(positions.length);
    });

    it("includes corner cell (newSize-1, newSize-1)", () => {
      const positions = getNewCellPositions(12, 16);
      const hasCorner = positions.some((p) => p.col === 15 && p.row === 15);
      expect(hasCorner).toBe(true);
    });

    it("includes edge cells along both new borders", () => {
      const positions = getNewCellPositions(12, 16);
      // Should include cells like (12, 0) — new column, old row
      const hasNewCol = positions.some((p) => p.col === 12 && p.row === 0);
      // Should include cells like (0, 12) — old column, new row
      const hasNewRow = positions.some((p) => p.col === 0 && p.row === 12);
      expect(hasNewCol).toBe(true);
      expect(hasNewRow).toBe(true);
    });
  });
});
