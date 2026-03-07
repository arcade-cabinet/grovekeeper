import type { GroveSaveData } from "@/game/systems/saveLoad";

// -- Mock db queries (new relational API) --
let mockTreeRows: Array<{
  speciesId: string;
  gridX: number;
  gridZ: number;
  stage: number;
  progress: number;
  watered: boolean;
  totalGrowthTime: number;
  plantedAt: number;
  meshSeed: number;
}> = [];
const mockSaveGroveToDb = jest.fn();
const mockLoadGroveFromDb = jest.fn(async () => {
  if (mockTreeRows.length === 0) return null;
  return {
    trees: mockTreeRows.map((t) => ({
      ...t,
      stage: t.stage as 0 | 1 | 2 | 3 | 4,
    })),
    playerPosition: { x: 6, z: 6 },
  };
});

jest.mock("@/game/db/queries", () => ({
  saveGroveToDb: (...args: unknown[]) => mockSaveGroveToDb(...args),
  loadGroveFromDb: () => mockLoadGroveFromDb(),
}));

// We need to mock many dependencies. Build mocks inline since Jest hoists
// jest.mock calls and factory closures can't reference outer variables.

const mockEntities: Array<Record<string, unknown>> = [];
const mockGridCells: Array<Record<string, unknown>> = [];
const mockTrees: Array<Record<string, unknown>> = [];

jest.mock("@/game/ecs/world", () => {
  const gridCellsQueryMock = {
    get entities() {
      return mockGridCells;
    },
    [Symbol.iterator]: function* () {
      yield* mockGridCells;
    },
  };
  return {
    world: {
      add: jest.fn((entity: Record<string, unknown>) => {
        mockEntities.push(entity);
        if (entity.gridCell) mockGridCells.push(entity);
        if (entity.tree) mockTrees.push(entity);
        return entity;
      }),
      remove: jest.fn(),
      [Symbol.iterator]: function* () {
        yield* [...mockEntities];
      },
      with: () => gridCellsQueryMock,
    },
    treesQuery: {
      get entities() {
        return mockTrees;
      },
      [Symbol.iterator]: function* () {
        yield* mockTrees;
      },
    },
    generateEntityId: jest.fn(() => `entity_${Date.now()}_${Math.random()}`),
  };
});

jest.mock("@/game/ecs/archetypes", () => ({
  createGridCellEntity: (col: number, row: number, type: string) => ({
    id: `grid_${col}_${row}`,
    position: { x: col, y: 0, z: row },
    gridCell: {
      gridX: col,
      gridZ: row,
      type,
      occupied: false,
      treeEntityId: null,
    },
  }),
  createTreeEntity: (col: number, row: number, speciesId: string) => ({
    id: `tree_${col}_${row}`,
    position: { x: col, y: 0, z: row },
    tree: {
      speciesId,
      stage: 0,
      progress: 0,
      watered: false,
      totalGrowthTime: 0,
      plantedAt: Date.now(),
      meshSeed: 12345,
    },
    renderable: { visible: true, scale: 0.08 },
  }),
}));

jest.mock("@/game/systems/growth", () => ({
  getStageScale: (stage: number, _progress: number) => {
    const scales = [0.08, 0.15, 0.4, 0.8, 1.2];
    return scales[Math.min(stage, 4)] ?? 0.08;
  },
}));

import { world } from "@/game/ecs/world";
// Import after mocks
import {
  clearSaveData,
  deserializeGrove,
  hasSaveData,
  loadGroveFromStorage,
  saveGroveToStorage,
  serializeGrove,
} from "@/game/systems/saveLoad";

describe("saveLoad system", () => {
  beforeEach(() => {
    // Clear mock entities
    mockEntities.length = 0;
    mockGridCells.length = 0;
    mockTrees.length = 0;
    mockTreeRows = [];
    jest.clearAllMocks();
  });

  // -- serializeGrove --

  describe("serializeGrove", () => {
    it("returns save data with version 1", () => {
      const data = serializeGrove(16, "test-seed");
      expect(data.version).toBe(1);
      expect(data.gridSize).toBe(16);
      expect(data.seed).toBe("test-seed");
    });

    it("includes timestamp", () => {
      const before = Date.now();
      const data = serializeGrove(16, "seed");
      const after = Date.now();
      expect(data.timestamp).toBeGreaterThanOrEqual(before);
      expect(data.timestamp).toBeLessThanOrEqual(after);
    });

    it("serializes tree entities", () => {
      mockTrees.push({
        tree: {
          speciesId: "white-oak",
          stage: 2,
          progress: 0.5,
          watered: true,
          totalGrowthTime: 100,
          plantedAt: 1000,
          meshSeed: 42,
        },
        position: { x: 3, y: 0, z: 5 },
        harvestable: { cooldownElapsed: 10, ready: false },
      });
      const data = serializeGrove(16, "seed");
      expect(data.trees).toHaveLength(1);
      expect(data.trees[0].col).toBe(3);
      expect(data.trees[0].row).toBe(5);
      expect(data.trees[0].speciesId).toBe("white-oak");
      expect(data.trees[0].stage).toBe(2);
      expect(data.trees[0].progress).toBe(0.5);
      expect(data.trees[0].watered).toBe(true);
      expect(data.trees[0].harvestCooldownElapsed).toBe(10);
      expect(data.trees[0].harvestReady).toBe(false);
    });

    it("serializes grid cell entities", () => {
      mockGridCells.push({
        gridCell: { gridX: 1, gridZ: 2, type: "water" },
      });
      const data = serializeGrove(16, "seed");
      expect(data.tiles).toHaveLength(1);
      expect(data.tiles[0]).toEqual({ col: 1, row: 2, type: "water" });
    });

    it("skips entities without position or tree component", () => {
      mockTrees.push({ tree: { speciesId: "oak", stage: 0 } }); // no position
      const data = serializeGrove(16, "seed");
      expect(data.trees).toHaveLength(0);
    });

    it("returns empty arrays when no entities", () => {
      const data = serializeGrove(16, "seed");
      expect(data.trees).toEqual([]);
      expect(data.tiles).toEqual([]);
    });
  });

  // -- deserializeGrove --

  describe("deserializeGrove", () => {
    it("clears existing entities before loading", () => {
      mockEntities.push({ id: "existing" });
      const data: GroveSaveData = {
        version: 1,
        timestamp: Date.now(),
        gridSize: 16,
        seed: "seed",
        tiles: [],
        trees: [],
      };
      deserializeGrove(data);
      expect(world.remove).toHaveBeenCalled();
    });

    it("recreates grid cells from save data", () => {
      const data: GroveSaveData = {
        version: 1,
        timestamp: Date.now(),
        gridSize: 16,
        seed: "seed",
        tiles: [
          { col: 0, row: 0, type: "soil" },
          { col: 1, row: 0, type: "water" },
        ],
        trees: [],
      };
      deserializeGrove(data);
      expect(world.add).toHaveBeenCalledTimes(2);
    });

    it("recreates tree entities and restores state", () => {
      const data: GroveSaveData = {
        version: 1,
        timestamp: Date.now(),
        gridSize: 16,
        seed: "seed",
        tiles: [{ col: 5, row: 5, type: "soil" }],
        trees: [
          {
            col: 5,
            row: 5,
            speciesId: "white-oak",
            meshSeed: 42,
            stage: 3,
            progress: 0.7,
            watered: true,
            totalGrowthTime: 200,
            plantedAt: 1000,
          },
        ],
      };
      deserializeGrove(data);
      // 1 tile + 1 tree = 2 calls to world.add
      expect(world.add).toHaveBeenCalledTimes(2);
    });
  });

  // -- saveGroveToStorage --

  describe("saveGroveToStorage", () => {
    it("calls saveGroveToDb with serialized tree data", async () => {
      mockTrees.push({
        tree: {
          speciesId: "white-oak",
          stage: 2,
          progress: 0.5,
          watered: false,
          totalGrowthTime: 100,
          plantedAt: 1000,
          meshSeed: 42,
        },
        position: { x: 3, y: 0, z: 5 },
      });

      await saveGroveToStorage(16, "test-seed");
      expect(mockSaveGroveToDb).toHaveBeenCalledTimes(1);
      const [treesArg] = mockSaveGroveToDb.mock.calls[0];
      expect(treesArg).toHaveLength(1);
      expect(treesArg[0].speciesId).toBe("white-oak");
      expect(treesArg[0].gridX).toBe(3);
      expect(treesArg[0].gridZ).toBe(5);
    });
  });

  // -- loadGroveFromStorage --

  describe("loadGroveFromStorage", () => {
    it("returns null when no save exists", async () => {
      expect(await loadGroveFromStorage()).toBeNull();
    });

    it("returns GroveSaveData when trees exist in db", async () => {
      mockTreeRows.push({
        speciesId: "white-oak",
        gridX: 3,
        gridZ: 5,
        stage: 2,
        progress: 0.5,
        watered: false,
        totalGrowthTime: 100,
        plantedAt: 1000,
        meshSeed: 42,
      });

      const loaded = await loadGroveFromStorage();
      expect(loaded).not.toBeNull();
      expect(loaded!.trees).toHaveLength(1);
      expect(loaded!.trees[0].speciesId).toBe("white-oak");
      expect(loaded!.trees[0].col).toBe(3);
      expect(loaded!.trees[0].row).toBe(5);
    });
  });

  // -- hasSaveData --

  describe("hasSaveData", () => {
    it("returns false when no trees in db", async () => {
      expect(await hasSaveData()).toBe(false);
    });

    it("returns true when trees exist in db", async () => {
      mockTreeRows.push({
        speciesId: "white-oak",
        gridX: 0,
        gridZ: 0,
        stage: 0,
        progress: 0,
        watered: false,
        totalGrowthTime: 0,
        plantedAt: 0,
        meshSeed: 0,
      });
      expect(await hasSaveData()).toBe(true);
    });
  });

  // -- clearSaveData --

  describe("clearSaveData", () => {
    it("does not throw", async () => {
      await expect(clearSaveData()).resolves.not.toThrow();
    });
  });

  // -- Round-trip --

  describe("round-trip serialization", () => {
    it("serialize then load from storage preserves tree data", async () => {
      mockTrees.push({
        tree: {
          speciesId: "white-oak",
          stage: 3,
          progress: 0.75,
          watered: false,
          totalGrowthTime: 300,
          plantedAt: 5000,
          meshSeed: 99,
        },
        position: { x: 7, y: 0, z: 8 },
      });

      // Simulate saveGroveToStorage storing the data and making it available for load
      mockSaveGroveToDb.mockImplementation(
        (
          treesData: Array<{
            speciesId: string;
            gridX: number;
            gridZ: number;
            stage: number;
            progress: number;
            watered: boolean;
            totalGrowthTime: number;
            plantedAt: number;
            meshSeed: number;
          }>,
        ) => {
          mockTreeRows = treesData;
        },
      );

      await saveGroveToStorage(20, "round-trip-seed");
      const loaded = await loadGroveFromStorage();
      expect(loaded).not.toBeNull();
      expect(loaded!.trees).toHaveLength(1);
      expect(loaded!.trees[0].speciesId).toBe("white-oak");
      expect(loaded!.trees[0].stage).toBe(3);
      expect(loaded!.trees[0].progress).toBe(0.75);
    });
  });
});
