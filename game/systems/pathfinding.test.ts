import {
  buildMultiChunkWalkabilityGrid,
  buildWalkabilityGrid,
  findPath,
  type ChunkWalkabilityInput,
  type WalkabilityCell,
  type WalkabilityGrid,
} from "./pathfinding";

// Helper to create a simple walkability grid from a 2D array
// 0 = walkable, 1 = blocked
function makeGrid(rows: number[][], originX = 0, originZ = 0): WalkabilityGrid {
  const height = rows.length;
  const width = rows[0].length;
  const data = new Uint8Array(width * height);
  for (let z = 0; z < height; z++) {
    for (let x = 0; x < width; x++) {
      data[z * width + x] = rows[z][x];
    }
  }
  return { data, width, height, originX, originZ };
}

describe("buildWalkabilityGrid", () => {
  it("marks walkable cells as open", () => {
    const cells: WalkabilityCell[] = [
      { x: 0, z: 0, walkable: true },
      { x: 1, z: 0, walkable: true },
    ];
    const grid = buildWalkabilityGrid(cells, {
      minX: 0,
      minZ: 0,
      maxX: 2,
      maxZ: 1,
    });
    expect(grid.data[0]).toBe(0); // walkable
    expect(grid.data[1]).toBe(0); // walkable
  });

  it("marks walkable=false cells as blocked", () => {
    const cells: WalkabilityCell[] = [
      { x: 0, z: 0, walkable: false },
    ];
    const grid = buildWalkabilityGrid(cells, {
      minX: 0,
      minZ: 0,
      maxX: 1,
      maxZ: 1,
    });
    expect(grid.data[0]).toBe(1);
  });

  it("marks water-equivalent (walkable=false) cells as blocked", () => {
    const cells: WalkabilityCell[] = [
      { x: 0, z: 0, walkable: false },
    ];
    const grid = buildWalkabilityGrid(cells, {
      minX: 0,
      minZ: 0,
      maxX: 1,
      maxZ: 1,
    });
    expect(grid.data[0]).toBe(1);
  });

  it("marks rock-equivalent (walkable=false) cells as blocked", () => {
    const cells: WalkabilityCell[] = [
      { x: 0, z: 0, walkable: false },
    ];
    const grid = buildWalkabilityGrid(cells, {
      minX: 0,
      minZ: 0,
      maxX: 1,
      maxZ: 1,
    });
    expect(grid.data[0]).toBe(1);
  });

  it("defaults unknown positions to blocked", () => {
    // Only provide cell at (0,0), position (1,0) should be blocked
    const cells: WalkabilityCell[] = [
      { x: 0, z: 0, walkable: true },
    ];
    const grid = buildWalkabilityGrid(cells, {
      minX: 0,
      minZ: 0,
      maxX: 2,
      maxZ: 1,
    });
    expect(grid.data[0]).toBe(0); // known walkable
    expect(grid.data[1]).toBe(1); // unknown, defaults blocked
  });

  it("handles empty iterable (all positions remain blocked)", () => {
    const cells: WalkabilityCell[] = [];
    const grid = buildWalkabilityGrid(cells, {
      minX: 0,
      minZ: 0,
      maxX: 1,
      maxZ: 1,
    });
    expect(grid.data[0]).toBe(1);
  });

  it("handles offset origins correctly", () => {
    const cells: WalkabilityCell[] = [
      { x: 5, z: 5, walkable: true },
    ];
    const grid = buildWalkabilityGrid(cells, {
      minX: 5,
      minZ: 5,
      maxX: 6,
      maxZ: 6,
    });
    expect(grid.width).toBe(1);
    expect(grid.height).toBe(1);
    expect(grid.data[0]).toBe(0);
    expect(grid.originX).toBe(5);
    expect(grid.originZ).toBe(5);
  });

  it("ignores cells outside bounds", () => {
    const cells: WalkabilityCell[] = [
      { x: 10, z: 10, walkable: true },
    ];
    const grid = buildWalkabilityGrid(cells, {
      minX: 0,
      minZ: 0,
      maxX: 2,
      maxZ: 2,
    });
    // All cells should remain blocked since the only cell is outside bounds
    for (let i = 0; i < grid.data.length; i++) {
      expect(grid.data[i]).toBe(1);
    }
  });
});

describe("findPath", () => {
  it("returns single-element path when start equals goal", () => {
    const grid = makeGrid([
      [0, 0, 0],
      [0, 0, 0],
      [0, 0, 0],
    ]);
    const result = findPath(grid, { x: 1, z: 1 }, { x: 1, z: 1 });
    expect(result).toEqual([{ x: 1, z: 1 }]);
  });

  it("finds a straight-line path on open grid", () => {
    const grid = makeGrid([[0, 0, 0, 0, 0]]);
    const result = findPath(grid, { x: 0, z: 0 }, { x: 4, z: 0 });
    expect(result).not.toBeNull();
    expect(result![0]).toEqual({ x: 0, z: 0 });
    expect(result![result!.length - 1]).toEqual({ x: 4, z: 0 });
    expect(result!.length).toBe(5);
  });

  it("navigates around obstacles", () => {
    // Wall in the middle with a gap
    const grid = makeGrid([
      [0, 0, 0, 0, 0],
      [0, 0, 1, 0, 0],
      [0, 0, 1, 0, 0],
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
    ]);
    const result = findPath(grid, { x: 0, z: 0 }, { x: 4, z: 0 });
    expect(result).not.toBeNull();
    expect(result![0]).toEqual({ x: 0, z: 0 });
    expect(result![result!.length - 1]).toEqual({ x: 4, z: 0 });
    // Should not pass through blocked cells
    for (const node of result!) {
      expect(grid.data[node.z * grid.width + node.x]).toBe(0);
    }
  });

  it("returns null when no path exists", () => {
    // Completely walled off goal
    const grid = makeGrid([
      [0, 0, 0],
      [0, 1, 0],
      [1, 1, 1],
      [0, 1, 0],
      [0, 0, 0],
    ]);
    const result = findPath(grid, { x: 0, z: 0 }, { x: 0, z: 4 });
    // The only path goes through blocked cells at row 2
    expect(result).toBeNull();
  });

  it("returns null when start is out of bounds", () => {
    const grid = makeGrid([[0, 0]]);
    expect(findPath(grid, { x: -1, z: 0 }, { x: 1, z: 0 })).toBeNull();
  });

  it("returns null when goal is out of bounds", () => {
    const grid = makeGrid([[0, 0]]);
    expect(findPath(grid, { x: 0, z: 0 }, { x: 5, z: 0 })).toBeNull();
  });

  it("returns null when start is blocked", () => {
    const grid = makeGrid([[1, 0, 0]]);
    expect(findPath(grid, { x: 0, z: 0 }, { x: 2, z: 0 })).toBeNull();
  });

  it("returns null when goal is blocked", () => {
    const grid = makeGrid([[0, 0, 1]]);
    expect(findPath(grid, { x: 0, z: 0 }, { x: 2, z: 0 })).toBeNull();
  });

  it("finds shortest path (Manhattan distance)", () => {
    const grid = makeGrid([
      [0, 0, 0],
      [0, 0, 0],
      [0, 0, 0],
    ]);
    const result = findPath(grid, { x: 0, z: 0 }, { x: 2, z: 2 });
    expect(result).not.toBeNull();
    // Manhattan distance = 4, so path length should be 5 (including start+end)
    expect(result!.length).toBe(5);
  });

  it("handles grid with non-zero origin", () => {
    const grid = makeGrid(
      [
        [0, 0, 0],
        [0, 0, 0],
      ],
      10,
      20,
    );
    const result = findPath(grid, { x: 10, z: 20 }, { x: 12, z: 21 });
    expect(result).not.toBeNull();
    expect(result![0]).toEqual({ x: 10, z: 20 });
    expect(result![result!.length - 1]).toEqual({ x: 12, z: 21 });
  });

  it("path only uses 4-directional movement", () => {
    const grid = makeGrid([
      [0, 0, 0],
      [0, 0, 0],
      [0, 0, 0],
    ]);
    const result = findPath(grid, { x: 0, z: 0 }, { x: 2, z: 2 });
    expect(result).not.toBeNull();
    // Check each step is exactly 1 unit in either x or z
    for (let i = 1; i < result!.length; i++) {
      const dx = Math.abs(result![i].x - result![i - 1].x);
      const dz = Math.abs(result![i].z - result![i - 1].z);
      expect(dx + dz).toBe(1);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// buildMultiChunkWalkabilityGrid (Spec §19.5 — chunk-boundary pathfinding)
// ─────────────────────────────────────────────────────────────────────────────

describe("buildMultiChunkWalkabilityGrid", () => {
  it("returns empty grid when no chunks are provided", () => {
    const grid = buildMultiChunkWalkabilityGrid([]);
    expect(grid.width).toBe(0);
    expect(grid.height).toBe(0);
    expect(grid.data).toHaveLength(0);
  });

  it("combines two side-by-side chunks into correct width/height", () => {
    const chunk0: ChunkWalkabilityInput = {
      cells: [
        { x: 0, z: 0, walkable: true },
        { x: 1, z: 0, walkable: true },
      ],
      chunkX: 0,
      chunkZ: 0,
      chunkSize: 2,
    };
    const chunk1: ChunkWalkabilityInput = {
      cells: [
        { x: 2, z: 0, walkable: true },
        { x: 3, z: 0, walkable: true },
      ],
      chunkX: 1,
      chunkZ: 0,
      chunkSize: 2,
    };
    const grid = buildMultiChunkWalkabilityGrid([chunk0, chunk1]);
    expect(grid.width).toBe(4);
    expect(grid.height).toBe(2);
    // All four walkable tiles open
    expect(grid.data[0]).toBe(0);
    expect(grid.data[1]).toBe(0);
    expect(grid.data[2]).toBe(0);
    expect(grid.data[3]).toBe(0);
  });

  it("stores maxSlope on the resulting grid", () => {
    const chunk: ChunkWalkabilityInput = {
      cells: [],
      chunkX: 0,
      chunkZ: 0,
      chunkSize: 2,
    };
    const grid = buildMultiChunkWalkabilityGrid([chunk], 0.5);
    expect(grid.maxSlope).toBe(0.5);
  });

  it("sets correct world-space origin", () => {
    // Chunk at (-1, 0) with chunkSize 2 → originX = -2, originZ = 0
    const chunk: ChunkWalkabilityInput = {
      cells: [],
      chunkX: -1,
      chunkZ: 0,
      chunkSize: 2,
    };
    const grid = buildMultiChunkWalkabilityGrid([chunk]);
    expect(grid.originX).toBe(-2);
    expect(grid.originZ).toBe(0);
  });

  it("unknown tiles default to blocked", () => {
    // Single chunk with only (0,0) walkable; (1,0) not provided → blocked
    const chunk: ChunkWalkabilityInput = {
      cells: [{ x: 0, z: 0, walkable: true }],
      chunkX: 0,
      chunkZ: 0,
      chunkSize: 2,
    };
    const grid = buildMultiChunkWalkabilityGrid([chunk]);
    expect(grid.data[0]).toBe(0); // (0,0) walkable
    expect(grid.data[1]).toBe(1); // (1,0) blocked by default
  });

  it("can find a path that crosses a chunk boundary", () => {
    const cells1: WalkabilityCell[] = [];
    const cells2: WalkabilityCell[] = [];
    for (let x = 0; x < 2; x++) {
      for (let z = 0; z < 2; z++) {
        cells1.push({ x, z, walkable: true });
      }
    }
    for (let x = 2; x < 4; x++) {
      for (let z = 0; z < 2; z++) {
        cells2.push({ x, z, walkable: true });
      }
    }
    const grid = buildMultiChunkWalkabilityGrid([
      { cells: cells1, chunkX: 0, chunkZ: 0, chunkSize: 2 },
      { cells: cells2, chunkX: 1, chunkZ: 0, chunkSize: 2 },
    ]);
    const path = findPath(grid, { x: 0, z: 0 }, { x: 3, z: 0 });
    expect(path).not.toBeNull();
    expect(path![path!.length - 1]).toEqual({ x: 3, z: 0 });
  });

  it("merges heightmap data from multiple chunks", () => {
    const hm0 = new Float32Array([1, 2, 3, 4]); // chunk 0: 2×2
    const hm1 = new Float32Array([5, 6, 7, 8]); // chunk 1: 2×2
    const chunk0: ChunkWalkabilityInput = {
      cells: [
        { x: 0, z: 0, walkable: true },
        { x: 1, z: 0, walkable: true },
        { x: 0, z: 1, walkable: true },
        { x: 1, z: 1, walkable: true },
      ],
      chunkX: 0,
      chunkZ: 0,
      chunkSize: 2,
      heightmap: hm0,
    };
    const chunk1: ChunkWalkabilityInput = {
      cells: [
        { x: 2, z: 0, walkable: true },
        { x: 3, z: 0, walkable: true },
        { x: 2, z: 1, walkable: true },
        { x: 3, z: 1, walkable: true },
      ],
      chunkX: 1,
      chunkZ: 0,
      chunkSize: 2,
      heightmap: hm1,
    };
    const grid = buildMultiChunkWalkabilityGrid([chunk0, chunk1]);
    expect(grid.heightmap).not.toBeUndefined();
    // chunk0 local (0,0) → world (0,0) → grid index 0
    expect(grid.heightmap![0]).toBeCloseTo(1);
    // chunk1 local (0,0) → world (2,0) → grid index 2
    expect(grid.heightmap![2]).toBeCloseTo(5);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// findPath with heightmap slope blocking (Spec §19.5)
// ─────────────────────────────────────────────────────────────────────────────

describe("findPath with heightmap slope blocking", () => {
  it("blocks steep tiles when maxSlope is set", () => {
    // 3-tile row: flat at 0, steep rise to 5, flat at 0
    const data = new Uint8Array([0, 0, 0]);
    const heightmap = new Float32Array([0, 5, 0]);
    const grid: WalkabilityGrid = {
      data,
      width: 3,
      height: 1,
      originX: 0,
      originZ: 0,
      heightmap,
      maxSlope: 1,
    };
    const path = findPath(grid, { x: 0, z: 0 }, { x: 2, z: 0 });
    expect(path).toBeNull();
  });

  it("allows gentle slopes within maxSlope", () => {
    const data = new Uint8Array([0, 0, 0]);
    const heightmap = new Float32Array([0, 0.5, 1]);
    const grid: WalkabilityGrid = {
      data,
      width: 3,
      height: 1,
      originX: 0,
      originZ: 0,
      heightmap,
      maxSlope: 1,
    };
    const path = findPath(grid, { x: 0, z: 0 }, { x: 2, z: 0 });
    expect(path).not.toBeNull();
    expect(path!.length).toBe(3);
  });

  it("ignores heightmap when maxSlope is not set", () => {
    const data = new Uint8Array([0, 0, 0]);
    const heightmap = new Float32Array([0, 100, 0]); // extreme but no maxSlope
    const grid: WalkabilityGrid = {
      data,
      width: 3,
      height: 1,
      originX: 0,
      originZ: 0,
      heightmap,
    };
    const path = findPath(grid, { x: 0, z: 0 }, { x: 2, z: 0 });
    expect(path).not.toBeNull();
  });

  it("allows path when slope equals maxSlope exactly", () => {
    const data = new Uint8Array([0, 0]);
    const heightmap = new Float32Array([0, 1]);
    const grid: WalkabilityGrid = {
      data,
      width: 2,
      height: 1,
      originX: 0,
      originZ: 0,
      heightmap,
      maxSlope: 1,
    };
    // slope = |1-0| = 1 which equals maxSlope — should be allowed
    const path = findPath(grid, { x: 0, z: 0 }, { x: 1, z: 0 });
    expect(path).not.toBeNull();
  });
});
