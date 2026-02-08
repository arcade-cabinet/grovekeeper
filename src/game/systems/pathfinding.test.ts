import { describe, expect, it } from "vitest";
import {
  buildWalkabilityGrid,
  findPath,
  type TileCoord,
  type WalkabilityGrid,
} from "./pathfinding";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Create a grid cell entity for testing. */
function cell(
  gridX: number,
  gridZ: number,
  type: "soil" | "water" | "rock" | "path" = "soil",
) {
  return {
    gridCell: {
      gridX,
      gridZ,
      type,
      occupied: false,
      treeEntityId: null,
    },
  };
}

/** Create a simple walkability grid from a 2D array (0=walkable, 1=blocked). */
function gridFrom2D(rows: number[][]): WalkabilityGrid {
  const height = rows.length;
  const width = rows[0].length;
  const data = new Uint8Array(width * height);
  for (let z = 0; z < height; z++) {
    for (let x = 0; x < width; x++) {
      data[z * width + x] = rows[z][x];
    }
  }
  return { data, width, height, originX: 0, originZ: 0 };
}

// ---------------------------------------------------------------------------
// buildWalkabilityGrid
// ---------------------------------------------------------------------------

describe("buildWalkabilityGrid", () => {
  it("marks soil tiles as walkable", () => {
    const cells = [cell(0, 0, "soil"), cell(1, 0, "soil")];
    const grid = buildWalkabilityGrid(cells, {
      minX: 0,
      minZ: 0,
      maxX: 2,
      maxZ: 1,
    });
    expect(grid.data[0]).toBe(0);
    expect(grid.data[1]).toBe(0);
  });

  it("marks path tiles as walkable", () => {
    const cells = [cell(0, 0, "path")];
    const grid = buildWalkabilityGrid(cells, {
      minX: 0,
      minZ: 0,
      maxX: 1,
      maxZ: 1,
    });
    expect(grid.data[0]).toBe(0);
  });

  it("marks water tiles as blocked", () => {
    const cells = [cell(0, 0, "water")];
    const grid = buildWalkabilityGrid(cells, {
      minX: 0,
      minZ: 0,
      maxX: 1,
      maxZ: 1,
    });
    expect(grid.data[0]).toBe(1);
  });

  it("marks rock tiles as blocked", () => {
    const cells = [cell(0, 0, "rock")];
    const grid = buildWalkabilityGrid(cells, {
      minX: 0,
      minZ: 0,
      maxX: 1,
      maxZ: 1,
    });
    expect(grid.data[0]).toBe(1);
  });

  it("defaults unknown cells to blocked", () => {
    // No cells at all — everything should be blocked
    const grid = buildWalkabilityGrid([], {
      minX: 0,
      minZ: 0,
      maxX: 3,
      maxZ: 3,
    });
    for (let i = 0; i < grid.data.length; i++) {
      expect(grid.data[i]).toBe(1);
    }
  });

  it("handles offset bounds", () => {
    const cells = [cell(5, 5, "soil")];
    const grid = buildWalkabilityGrid(cells, {
      minX: 5,
      minZ: 5,
      maxX: 6,
      maxZ: 6,
    });
    expect(grid.width).toBe(1);
    expect(grid.height).toBe(1);
    expect(grid.originX).toBe(5);
    expect(grid.originZ).toBe(5);
    expect(grid.data[0]).toBe(0);
  });

  it("ignores cells outside bounds", () => {
    const cells = [cell(10, 10, "soil")];
    const grid = buildWalkabilityGrid(cells, {
      minX: 0,
      minZ: 0,
      maxX: 3,
      maxZ: 3,
    });
    // Should all remain blocked
    for (let i = 0; i < grid.data.length; i++) {
      expect(grid.data[i]).toBe(1);
    }
  });

  it("builds a mixed grid correctly", () => {
    const cells = [
      cell(0, 0, "soil"),
      cell(1, 0, "water"),
      cell(2, 0, "soil"),
      cell(0, 1, "rock"),
      cell(1, 1, "path"),
      cell(2, 1, "soil"),
    ];
    const grid = buildWalkabilityGrid(cells, {
      minX: 0,
      minZ: 0,
      maxX: 3,
      maxZ: 2,
    });
    // Row 0: soil(0), water(1), soil(0)
    expect(grid.data[0]).toBe(0);
    expect(grid.data[1]).toBe(1);
    expect(grid.data[2]).toBe(0);
    // Row 1: rock(1), path(0), soil(0)
    expect(grid.data[3]).toBe(1);
    expect(grid.data[4]).toBe(0);
    expect(grid.data[5]).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// findPath — A*
// ---------------------------------------------------------------------------

describe("findPath", () => {
  it("finds a straight-line path on open grid", () => {
    const grid = gridFrom2D([
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
    ]);
    const path = findPath(grid, { x: 0, z: 0 }, { x: 4, z: 0 });
    expect(path).not.toBeNull();
    expect(path!.length).toBeGreaterThanOrEqual(5); // at least 5 steps
    expect(path![0]).toEqual({ x: 0, z: 0 });
    expect(path![path!.length - 1]).toEqual({ x: 4, z: 0 });
  });

  it("returns trivial path when start == goal", () => {
    const grid = gridFrom2D([[0]]);
    const path = findPath(grid, { x: 0, z: 0 }, { x: 0, z: 0 });
    expect(path).toEqual([{ x: 0, z: 0 }]);
  });

  it("returns null when start is blocked", () => {
    const grid = gridFrom2D([
      [1, 0],
      [0, 0],
    ]);
    const path = findPath(grid, { x: 0, z: 0 }, { x: 1, z: 0 });
    expect(path).toBeNull();
  });

  it("returns null when goal is blocked", () => {
    const grid = gridFrom2D([
      [0, 1],
      [0, 0],
    ]);
    const path = findPath(grid, { x: 0, z: 0 }, { x: 1, z: 0 });
    expect(path).toBeNull();
  });

  it("returns null when no path exists (walled off)", () => {
    const grid = gridFrom2D([
      [0, 1, 0],
      [0, 1, 0],
      [0, 1, 0],
    ]);
    const path = findPath(grid, { x: 0, z: 0 }, { x: 2, z: 0 });
    expect(path).toBeNull();
  });

  it("navigates around an obstacle", () => {
    const grid = gridFrom2D([
      [0, 1, 0],
      [0, 0, 0],
      [0, 1, 0],
    ]);
    const path = findPath(grid, { x: 0, z: 0 }, { x: 2, z: 0 });
    expect(path).not.toBeNull();
    // Path must go through row 1 to get around
    expect(path!.some((p) => p.z === 1)).toBe(true);
    expect(path![0]).toEqual({ x: 0, z: 0 });
    expect(path![path!.length - 1]).toEqual({ x: 2, z: 0 });
  });

  it("finds optimal path length (Manhattan distance)", () => {
    const grid = gridFrom2D([
      [0, 0, 0],
      [0, 0, 0],
      [0, 0, 0],
    ]);
    const path = findPath(grid, { x: 0, z: 0 }, { x: 2, z: 2 });
    expect(path).not.toBeNull();
    // Manhattan distance = 4, so path length = 5 (including start)
    expect(path!.length).toBe(5);
  });

  it("returns null when start is out of bounds", () => {
    const grid = gridFrom2D([[0, 0]]);
    const path = findPath(grid, { x: -1, z: 0 }, { x: 1, z: 0 });
    expect(path).toBeNull();
  });

  it("returns null when goal is out of bounds", () => {
    const grid = gridFrom2D([[0, 0]]);
    const path = findPath(grid, { x: 0, z: 0 }, { x: 5, z: 0 });
    expect(path).toBeNull();
  });

  it("handles narrow corridor", () => {
    const grid = gridFrom2D([
      [1, 0, 1],
      [1, 0, 1],
      [1, 0, 1],
    ]);
    const path = findPath(grid, { x: 1, z: 0 }, { x: 1, z: 2 });
    expect(path).not.toBeNull();
    expect(path!.length).toBe(3);
    // All steps must stay in the corridor (x=1)
    for (const p of path!) {
      expect(p.x).toBe(1);
    }
  });

  it("handles grid with offset origin", () => {
    const grid: WalkabilityGrid = {
      data: new Uint8Array([0, 0, 0, 0]),
      width: 2,
      height: 2,
      originX: 10,
      originZ: 10,
    };
    const path = findPath(grid, { x: 10, z: 10 }, { x: 11, z: 11 });
    expect(path).not.toBeNull();
    expect(path![0]).toEqual({ x: 10, z: 10 });
    expect(path![path!.length - 1]).toEqual({ x: 11, z: 11 });
  });

  it("navigates L-shaped path", () => {
    const grid = gridFrom2D([
      [0, 0, 0],
      [1, 1, 0],
      [0, 0, 0],
    ]);
    const path = findPath(grid, { x: 0, z: 0 }, { x: 0, z: 2 });
    expect(path).not.toBeNull();
    // Must go right, down through col 2, then left
    expect(path![path!.length - 1]).toEqual({ x: 0, z: 2 });
  });

  it("path length is always Manhattan-optimal on open grid", () => {
    const grid = gridFrom2D([
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ]);
    const path = findPath(grid, { x: 0, z: 0 }, { x: 3, z: 3 });
    expect(path).not.toBeNull();
    // Manhattan = 6, path length = 7 (start included)
    expect(path!.length).toBe(7);
  });

  it("handles single-cell grid", () => {
    const grid = gridFrom2D([[0]]);
    const path = findPath(grid, { x: 0, z: 0 }, { x: 0, z: 0 });
    expect(path).toEqual([{ x: 0, z: 0 }]);
  });

  it("handles large grid (32x32) efficiently", () => {
    const rows = Array.from({ length: 32 }, () => Array(32).fill(0));
    const grid = gridFrom2D(rows);
    const start = performance.now();
    const path = findPath(grid, { x: 0, z: 0 }, { x: 31, z: 31 });
    const elapsed = performance.now() - start;
    expect(path).not.toBeNull();
    expect(elapsed).toBeLessThan(50); // Should be well under 50ms
  });

  it("path always starts at start and ends at goal", () => {
    const grid = gridFrom2D([
      [0, 0, 0, 0],
      [0, 1, 1, 0],
      [0, 0, 0, 0],
    ]);
    const start: TileCoord = { x: 0, z: 0 };
    const goal: TileCoord = { x: 3, z: 2 };
    const path = findPath(grid, start, goal);
    expect(path).not.toBeNull();
    expect(path![0]).toEqual(start);
    expect(path![path!.length - 1]).toEqual(goal);
  });

  it("each step in path is adjacent (4-directional)", () => {
    const grid = gridFrom2D([
      [0, 0, 0],
      [0, 1, 0],
      [0, 0, 0],
    ]);
    const path = findPath(grid, { x: 0, z: 0 }, { x: 2, z: 2 });
    expect(path).not.toBeNull();
    for (let i = 1; i < path!.length; i++) {
      const dx = Math.abs(path![i].x - path![i - 1].x);
      const dz = Math.abs(path![i].z - path![i - 1].z);
      expect(dx + dz).toBe(1); // exactly one step
    }
  });
});
