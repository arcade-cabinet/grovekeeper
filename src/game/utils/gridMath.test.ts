import { describe, it, expect } from "vitest";
import {
  gridToWorld,
  worldToGrid,
  isInBounds,
  gridToIndex,
  indexToGrid,
  tileCenterWorld,
  gridDistance,
  tilesInRadius,
} from "./gridMath";

describe("gridMath", () => {
  describe("gridToWorld", () => {
    it("converts grid coords to world coords", () => {
      expect(gridToWorld(3, 5)).toEqual({ x: 3, z: 5 });
    });

    it("respects tile size", () => {
      expect(gridToWorld(3, 5, 2)).toEqual({ x: 6, z: 10 });
    });
  });

  describe("worldToGrid", () => {
    it("converts world coords to grid coords", () => {
      expect(worldToGrid(3.2, 5.7)).toEqual({ col: 3, row: 6 });
    });

    it("rounds to nearest grid cell", () => {
      expect(worldToGrid(2.4, 3.6)).toEqual({ col: 2, row: 4 });
    });
  });

  describe("isInBounds", () => {
    it("returns true for valid positions", () => {
      expect(isInBounds({ col: 0, row: 0 }, 12)).toBe(true);
      expect(isInBounds({ col: 11, row: 11 }, 12)).toBe(true);
    });

    it("returns false for out-of-bounds positions", () => {
      expect(isInBounds({ col: -1, row: 0 }, 12)).toBe(false);
      expect(isInBounds({ col: 12, row: 0 }, 12)).toBe(false);
      expect(isInBounds({ col: 0, row: 12 }, 12)).toBe(false);
    });
  });

  describe("gridToIndex / indexToGrid", () => {
    it("converts grid position to flat index", () => {
      expect(gridToIndex(3, 2, 12)).toBe(27); // 2*12 + 3
    });

    it("converts flat index back to grid position", () => {
      expect(indexToGrid(27, 12)).toEqual({ col: 3, row: 2 });
    });

    it("round-trips correctly", () => {
      const col = 7,
        row = 9,
        size = 12;
      const idx = gridToIndex(col, row, size);
      expect(indexToGrid(idx, size)).toEqual({ col, row });
    });
  });

  describe("tileCenterWorld", () => {
    it("returns center of tile in world coords", () => {
      expect(tileCenterWorld(3, 5)).toEqual({ x: 3.5, z: 5.5 });
    });
  });

  describe("gridDistance", () => {
    it("computes Manhattan distance", () => {
      expect(gridDistance({ col: 0, row: 0 }, { col: 3, row: 4 })).toBe(7);
    });

    it("returns 0 for same position", () => {
      expect(gridDistance({ col: 5, row: 5 }, { col: 5, row: 5 })).toBe(0);
    });
  });

  describe("tilesInRadius", () => {
    it("returns tiles within Chebyshev distance", () => {
      const tiles = tilesInRadius({ col: 5, row: 5 }, 1, 12);
      expect(tiles).toHaveLength(9); // 3x3 block
      expect(tiles).toContainEqual({ col: 5, row: 5 });
      expect(tiles).toContainEqual({ col: 4, row: 4 });
      expect(tiles).toContainEqual({ col: 6, row: 6 });
    });

    it("clips to grid bounds", () => {
      const tiles = tilesInRadius({ col: 0, row: 0 }, 1, 12);
      expect(tiles).toHaveLength(4); // corner — only 2x2
      expect(tiles.every((t) => t.col >= 0 && t.row >= 0)).toBe(true);
    });

    it("radius 0 returns only the center tile", () => {
      const tiles = tilesInRadius({ col: 5, row: 5 }, 0, 12);
      expect(tiles).toHaveLength(1);
      expect(tiles[0]).toEqual({ col: 5, row: 5 });
    });
  });
});
