import type { GroveSaveData } from "@/game/systems/saveLoad";

// Polyfill localStorage for Node/jest-expo environment
const storage: Record<string, string> = {};
const localStorageMock = {
  getItem: (key: string) => storage[key] ?? null,
  setItem: (key: string, value: string) => {
    storage[key] = value;
  },
  removeItem: (key: string) => {
    delete storage[key];
  },
  clear: () => {
    for (const key of Object.keys(storage)) delete storage[key];
  },
};
Object.defineProperty(globalThis, "localStorage", { value: localStorageMock });

// We need to mock many dependencies. Build mocks inline since Jest hoists
// jest.mock calls and factory closures can't reference outer variables.

const mockEntities: Array<Record<string, unknown>> = [];
const mockGridCells: Array<Record<string, unknown>> = [];
const mockTrees: Array<Record<string, unknown>> = [];

jest.mock("@/game/ecs/world", () => {
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
    },
    treesQuery: {
      get entities() {
        return mockTrees;
      },
      [Symbol.iterator]: function* () {
        yield* mockTrees;
      },
    },
    gridCellsQuery: {
      get entities() {
        return mockGridCells;
      },
      [Symbol.iterator]: function* () {
        yield* mockGridCells;
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
    jest.clearAllMocks();
    localStorage.clear();
  });

  // ── serializeGrove ─────────────────────────────────────────────

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

  // ── deserializeGrove ───────────────────────────────────────────

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

  // ── saveGroveToStorage ─────────────────────────────────────────

  describe("saveGroveToStorage", () => {
    it("saves serialized data to localStorage", () => {
      saveGroveToStorage(16, "test-seed");
      const raw = localStorage.getItem("grovekeeper-grove");
      expect(raw).not.toBeNull();
      const parsed = JSON.parse(raw!);
      expect(parsed.gridSize).toBe(16);
      expect(parsed.seed).toBe("test-seed");
      expect(parsed.version).toBe(1);
    });
  });

  // ── loadGroveFromStorage ───────────────────────────────────────

  describe("loadGroveFromStorage", () => {
    it("returns null when no save exists", () => {
      expect(loadGroveFromStorage()).toBeNull();
    });

    it("returns parsed save data when present", () => {
      const data: GroveSaveData = {
        version: 1,
        timestamp: 12345,
        gridSize: 16,
        seed: "my-seed",
        tiles: [],
        trees: [],
      };
      localStorage.setItem("grovekeeper-grove", JSON.stringify(data));
      const loaded = loadGroveFromStorage();
      expect(loaded).toEqual(data);
    });

    it("returns null for malformed JSON", () => {
      localStorage.setItem("grovekeeper-grove", "not-json{{{");
      expect(loadGroveFromStorage()).toBeNull();
    });
  });

  // ── hasSaveData ────────────────────────────────────────────────

  describe("hasSaveData", () => {
    it("returns false when no save", () => {
      expect(hasSaveData()).toBe(false);
    });

    it("returns true when save exists", () => {
      localStorage.setItem("grovekeeper-grove", "{}");
      expect(hasSaveData()).toBe(true);
    });
  });

  // ── clearSaveData ──────────────────────────────────────────────

  describe("clearSaveData", () => {
    it("removes save data from localStorage", () => {
      localStorage.setItem("grovekeeper-grove", "{}");
      clearSaveData();
      expect(localStorage.getItem("grovekeeper-grove")).toBeNull();
    });

    it("does not throw if no save exists", () => {
      expect(() => clearSaveData()).not.toThrow();
    });
  });

  // ── Round-trip ─────────────────────────────────────────────────

  describe("round-trip serialization", () => {
    it("serialize then load from storage preserves data", () => {
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
      mockGridCells.push({
        gridCell: { gridX: 7, gridZ: 8, type: "soil" },
      });

      saveGroveToStorage(20, "round-trip-seed");
      const loaded = loadGroveFromStorage();
      expect(loaded).not.toBeNull();
      expect(loaded!.gridSize).toBe(20);
      expect(loaded!.seed).toBe("round-trip-seed");
      expect(loaded!.trees).toHaveLength(1);
      expect(loaded!.trees[0].speciesId).toBe("white-oak");
      expect(loaded!.trees[0].stage).toBe(3);
      expect(loaded!.trees[0].progress).toBe(0.75);
      expect(loaded!.tiles).toHaveLength(1);
      expect(loaded!.tiles[0].type).toBe("soil");
    });
  });
});
