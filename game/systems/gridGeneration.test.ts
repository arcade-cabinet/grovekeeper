import { type GridTile, generateGrid, type TileType } from "./gridGeneration.ts";

function countByType(tiles: GridTile[], type: TileType): number {
  return tiles.filter((t) => t.type === type).length;
}

describe("generateGrid", () => {
  it("returns correct number of tiles for a given size", () => {
    const tiles = generateGrid(8, "test-seed");
    expect(tiles).toHaveLength(64); // 8 * 8
  });

  it("returns correct number of tiles for larger grid", () => {
    const tiles = generateGrid(16, "big-seed");
    expect(tiles).toHaveLength(256); // 16 * 16
  });

  it("tiles have correct col/row coordinates", () => {
    const tiles = generateGrid(4, "coord-test");
    // Row-major order: first tile is (0,0), second is (1,0), etc.
    expect(tiles[0]).toMatchObject({ col: 0, row: 0 });
    expect(tiles[1]).toMatchObject({ col: 1, row: 0 });
    expect(tiles[4]).toMatchObject({ col: 0, row: 1 });
    expect(tiles[15]).toMatchObject({ col: 3, row: 3 });
  });

  it("is deterministic -- same seed produces same grid", () => {
    const tiles1 = generateGrid(12, "deterministic");
    const tiles2 = generateGrid(12, "deterministic");
    expect(tiles1).toEqual(tiles2);
  });

  it("different seeds produce different grids", () => {
    const tiles1 = generateGrid(12, "seed-A");
    const tiles2 = generateGrid(12, "seed-B");
    const types1 = tiles1.map((t) => t.type).join("");
    const types2 = tiles2.map((t) => t.type).join("");
    expect(types1).not.toBe(types2);
  });

  it("produces all four tile types", () => {
    const tiles = generateGrid(16, "variety-seed");
    const types = new Set(tiles.map((t) => t.type));
    expect(types.has("empty")).toBe(true);
    expect(types.has("water")).toBe(true);
    expect(types.has("blocked")).toBe(true);
    expect(types.has("path")).toBe(true);
  });

  it("majority of tiles are empty (soil)", () => {
    const tiles = generateGrid(16, "majority-check");
    const emptyCount = countByType(tiles, "empty");
    // Should be roughly 70% empty, allow some tolerance
    expect(emptyCount).toBeGreaterThan(tiles.length * 0.4);
  });

  it("water tiles exist in reasonable proportion", () => {
    const tiles = generateGrid(16, "water-check");
    const waterCount = countByType(tiles, "water");
    // Target is ~10%, allow range of 1-30%
    expect(waterCount).toBeGreaterThan(0);
    expect(waterCount).toBeLessThan(tiles.length * 0.3);
  });

  it("blocked tiles exist in reasonable proportion", () => {
    const tiles = generateGrid(16, "rock-check");
    const blockedCount = countByType(tiles, "blocked");
    // Target is ~15%, allow some range
    expect(blockedCount).toBeGreaterThan(0);
    expect(blockedCount).toBeLessThan(tiles.length * 0.35);
  });

  it("every tile has a valid type", () => {
    const validTypes: TileType[] = ["empty", "blocked", "water", "path"];
    const tiles = generateGrid(10, "valid-types");
    for (const tile of tiles) {
      expect(validTypes).toContain(tile.type);
    }
  });

  it("handles minimum grid size of 1", () => {
    const tiles = generateGrid(1, "tiny");
    expect(tiles).toHaveLength(1);
    expect(tiles[0].col).toBe(0);
    expect(tiles[0].row).toBe(0);
  });
});
