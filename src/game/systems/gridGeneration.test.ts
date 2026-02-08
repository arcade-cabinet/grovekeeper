import { describe, expect, it } from "vitest";
import { generateGrid, type TileType } from "./gridGeneration";

describe("Grid Generation (Seeded)", () => {
  it("generates correct number of tiles (size * size)", () => {
    const grid = generateGrid(12, "test-grove");
    expect(grid).toHaveLength(12 * 12);
  });

  it("is deterministic - same seed produces same grid", () => {
    const gridA = generateGrid(12, "deterministic-seed");
    const gridB = generateGrid(12, "deterministic-seed");

    expect(gridA).toEqual(gridB);
  });

  it("produces different grids for different seeds", () => {
    const gridA = generateGrid(12, "seed-alpha");
    const gridB = generateGrid(12, "seed-beta");

    const typesA = gridA.map((t) => t.type).join(",");
    const typesB = gridB.map((t) => t.type).join(",");

    expect(typesA).not.toEqual(typesB);
  });

  it("has approximate tile distribution within tolerance", () => {
    // Use a larger grid for more stable distribution
    const size = 32;
    const grid = generateGrid(size, "distribution-check");
    const total = size * size;

    const counts: Record<TileType, number> = {
      empty: 0,
      blocked: 0,
      water: 0,
      path: 0,
    };
    for (const tile of grid) {
      counts[tile.type]++;
    }

    // Targets: 70% empty, 15% blocked, 10% water, 5% path
    // Tolerance: +/- 10 percentage points
    expect(counts.empty / total).toBeGreaterThanOrEqual(0.6);
    expect(counts.empty / total).toBeLessThanOrEqual(0.8);

    expect(counts.blocked / total).toBeGreaterThanOrEqual(0.05);
    expect(counts.blocked / total).toBeLessThanOrEqual(0.25);

    expect(counts.water / total).toBeGreaterThanOrEqual(0.0);
    expect(counts.water / total).toBeLessThanOrEqual(0.2);

    expect(counts.path / total).toBeGreaterThanOrEqual(0.0);
    expect(counts.path / total).toBeLessThanOrEqual(0.15);
  });

  it("has clustered water tiles with at least one adjacent pair", () => {
    const size = 16;
    const grid = generateGrid(size, "water-cluster-check");

    const waterTiles = grid.filter((t) => t.type === "water");

    // There should be water tiles
    expect(waterTiles.length).toBeGreaterThan(0);

    // At least one pair of water tiles should be adjacent (Manhattan distance 1)
    let hasAdjacentPair = false;
    for (let i = 0; i < waterTiles.length && !hasAdjacentPair; i++) {
      for (let j = i + 1; j < waterTiles.length; j++) {
        const dc = Math.abs(waterTiles[i].col - waterTiles[j].col);
        const dr = Math.abs(waterTiles[i].row - waterTiles[j].row);
        if (dc + dr === 1) {
          hasAdjacentPair = true;
          break;
        }
      }
    }
    expect(hasAdjacentPair).toBe(true);
  });

  it("all tiles have valid col/row within bounds", () => {
    const size = 12;
    const grid = generateGrid(size, "bounds-check");

    const validTypes: TileType[] = ["empty", "blocked", "water", "path"];

    for (const tile of grid) {
      expect(tile.col).toBeGreaterThanOrEqual(0);
      expect(tile.col).toBeLessThan(size);
      expect(tile.row).toBeGreaterThanOrEqual(0);
      expect(tile.row).toBeLessThan(size);
      expect(validTypes).toContain(tile.type);
    }

    // Verify every coordinate is represented exactly once
    const coordSet = new Set(grid.map((t) => `${t.col},${t.row}`));
    expect(coordSet.size).toBe(size * size);
  });

  it("supports different grid sizes", () => {
    const sizes = [8, 12, 16, 20, 24, 32];

    for (const size of sizes) {
      const grid = generateGrid(size, "size-test");
      expect(grid).toHaveLength(size * size);

      // Verify bounds for each size
      for (const tile of grid) {
        expect(tile.col).toBeGreaterThanOrEqual(0);
        expect(tile.col).toBeLessThan(size);
        expect(tile.row).toBeGreaterThanOrEqual(0);
        expect(tile.row).toBeLessThan(size);
      }
    }
  });
});
