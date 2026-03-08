/**
 * saveLoad.test.ts -- Spec §26 (Save and Persistence)
 *
 * Tests the chunk-based save/load API (createSaveSnapshot, applySaveSnapshot,
 * saveGame, clearSave, hasSaveGame, migrateIfNeeded) plus legacy ECS functions
 * (deserializeGrove, loadGroveFromStorage) kept for usePersistence.ts.
 */

// ---------------------------------------------------------------------------
// Mock: @/game/db/queries
// ---------------------------------------------------------------------------

let mockTreeRows: Array<{
  speciesId: string;
  gridX: number;
  gridZ: number;
  stage: 0 | 1 | 2 | 3 | 4;
  progress: number;
  watered: boolean;
  totalGrowthTime: number;
  plantedAt: number;
  meshSeed: number;
}> = [];

const mockLoadGroveFromDb = jest.fn(async () => {
  if (mockTreeRows.length === 0) return null;
  return { trees: mockTreeRows, playerPosition: { x: 6, z: 6 } };
});

jest.mock("@/game/db/queries", () => ({
  loadGroveFromDb: () => mockLoadGroveFromDb(),
}));

// ---------------------------------------------------------------------------
// Mock: @/game/ecs/world
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Mock: @/game/ecs/archetypes + @/game/systems/growth
// ---------------------------------------------------------------------------

jest.mock("@/game/ecs/archetypes", () => ({
  createGridCellEntity: (col: number, row: number, type: string) => ({
    id: `grid_${col}_${row}`,
    position: { x: col, y: 0, z: row },
    gridCell: { gridX: col, gridZ: row, type, occupied: false, treeEntityId: null },
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
  getStageScale: (stage: number) => [0.08, 0.15, 0.4, 0.8, 1.2][Math.min(stage, 4)] ?? 0.08,
}));

// ---------------------------------------------------------------------------
// Mock: @/game/stores/core
//
// IMPORTANT: Jest hoists all jest.mock() calls before variable declarations.
// To avoid TDZ/undefined issues, ALL outer-variable reads must happen inside
// function bodies (called at test time), never as direct property values in
// the factory return object (which are evaluated at factory call time).
// ---------------------------------------------------------------------------

let mockStoreState = {
  lastSavedAt: 0,
  worldSeed: "test-seed",
  prestigeCount: 0,
  difficulty: "normal",
  questChainState: { activeChains: {}, completedChainIds: [] as string[], availableChainIds: [] as string[] },
  npcRelationships: {} as Record<string, number>,
  discoveredSpiritIds: [] as string[],
  speciesProgress: {} as Record<string, unknown>,
  discoveredCampfires: [] as unknown[],
};

// Named jest.fn() wrappers — "mock" prefix ensures they survive Jest's hoist transform.
const mockGameStateSetFn = jest.fn((v: typeof mockStoreState) => {
  mockStoreState = { ...mockStoreState, ...v };
});
const mockGameStatePeekFn = jest.fn(() => mockStoreState);
const mockLastSavedAtSetFn = jest.fn((v: number) => {
  mockStoreState = { ...mockStoreState, lastSavedAt: v };
});

jest.mock("@/game/stores/core", () => ({
  // gameState$ methods use wrappers — outer vars read at call time, not factory time.
  gameState$: {
    peek: () => mockGameStatePeekFn(),
    set: (v: typeof mockStoreState) => mockGameStateSetFn(v),
    lastSavedAt: { set: (v: number) => mockLastSavedAtSetFn(v) },
  },
  getState: () => ({ ...mockStoreState }),
  initialState: {
    lastSavedAt: 0,
    worldSeed: "",
    prestigeCount: 0,
    difficulty: "normal",
    questChainState: { activeChains: {}, completedChainIds: [], availableChainIds: [] },
    npcRelationships: {},
    discoveredSpiritIds: [],
    speciesProgress: {},
    discoveredCampfires: [],
  },
}));

// ---------------------------------------------------------------------------
// Mock: @/game/world/chunkPersistence
// ---------------------------------------------------------------------------

let mockChunkDiffsState: Record<string, unknown> = {};

const mockChunkDiffsPeekFn = jest.fn(() => mockChunkDiffsState);
const mockChunkDiffsSetFn = jest.fn((v: Record<string, unknown>) => {
  mockChunkDiffsState = { ...v };
});
const mockClearAllChunkDiffs = jest.fn(() => {
  mockChunkDiffsState = {};
});

jest.mock("@/game/world/chunkPersistence", () => ({
  chunkDiffs$: {
    peek: () => mockChunkDiffsPeekFn(),
    set: (v: Record<string, unknown>) => mockChunkDiffsSetFn(v),
  },
  clearAllChunkDiffs: () => mockClearAllChunkDiffs(),
}));

// ---------------------------------------------------------------------------
// Imports (after mocks)
// ---------------------------------------------------------------------------

import { world } from "@/game/ecs/world";
import {
  SAVE_VERSION,
  applySaveSnapshot,
  clearSave,
  createSaveSnapshot,
  deserializeGrove,
  hasSaveGame,
  loadGroveFromStorage,
  migrateIfNeeded,
  saveGame,
  type GroveSaveData,
  type SaveSnapshot,
} from "@/game/systems/saveLoad";

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function makeSnapshot(overrides: Partial<SaveSnapshot> = {}): SaveSnapshot {
  return {
    version: SAVE_VERSION,
    savedAt: 1000,
    worldSeed: "hero-seed",
    prestigeCount: 2,
    difficulty: "hardwood",
    questChainState: { activeChains: {}, completedChainIds: ["c1"], availableChainIds: [] },
    npcRelationships: { "npc-elder": 5 },
    discoveredSpiritIds: ["spirit-1", "spirit-2"],
    speciesProgress: { "white-oak": { timesPlanted: 3, maxStageReached: 4, timesHarvested: 1, totalYield: 2, discoveryTier: 1 } },
    discoveredCampfires: [{ id: "cf-1", label: "Camp A", worldX: 16, worldZ: 32 }],
    chunkDiffs: { "0,0": { plantedTrees: [] } },
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("saveLoad system (Spec §26)", () => {
  beforeEach(() => {
    mockEntities.length = 0;
    mockGridCells.length = 0;
    mockTrees.length = 0;
    mockTreeRows = [];
    mockStoreState = {
      lastSavedAt: 0,
      worldSeed: "test-seed",
      prestigeCount: 0,
      difficulty: "normal",
      questChainState: { activeChains: {}, completedChainIds: [], availableChainIds: [] },
      npcRelationships: {},
      discoveredSpiritIds: [],
      speciesProgress: {},
      discoveredCampfires: [],
    };
    mockChunkDiffsState = {};
    jest.clearAllMocks();
  });

  // -- hasSaveGame --

  describe("hasSaveGame", () => {
    it("returns false when lastSavedAt is 0", () => {
      mockStoreState.lastSavedAt = 0;
      expect(hasSaveGame()).toBe(false);
    });

    it("returns true when lastSavedAt > 0", () => {
      mockStoreState.lastSavedAt = 999;
      expect(hasSaveGame()).toBe(true);
    });
  });

  // -- saveGame --

  describe("saveGame", () => {
    it("sets lastSavedAt via gameState$.lastSavedAt.set", () => {
      saveGame();
      expect(mockLastSavedAtSetFn).toHaveBeenCalledTimes(1);
      const arg = mockLastSavedAtSetFn.mock.calls[0][0] as number;
      expect(arg).toBeGreaterThan(0);
    });
  });

  // -- clearSave --

  describe("clearSave", () => {
    it("resets Legend State to initial via gameState$.set", () => {
      mockStoreState.lastSavedAt = 9999;
      clearSave();
      expect(mockGameStateSetFn).toHaveBeenCalledTimes(1);
      const arg = mockGameStateSetFn.mock.calls[0][0] as Record<string, unknown>;
      expect(arg.lastSavedAt).toBe(0);
      expect(arg.worldSeed).toBe("");
    });

    it("clears chunk diffs", () => {
      mockChunkDiffsState = { "1,2": { plantedTrees: [] } };
      clearSave();
      expect(mockClearAllChunkDiffs).toHaveBeenCalledTimes(1);
    });
  });

  // -- createSaveSnapshot --

  describe("createSaveSnapshot", () => {
    it("returns SAVE_VERSION", () => {
      expect(createSaveSnapshot().version).toBe(SAVE_VERSION);
    });

    it("captures worldSeed and prestigeCount", () => {
      mockStoreState.worldSeed = "myseed";
      mockStoreState.prestigeCount = 3;
      const snap = createSaveSnapshot();
      expect(snap.worldSeed).toBe("myseed");
      expect(snap.prestigeCount).toBe(3);
    });

    it("captures npcRelationships", () => {
      mockStoreState.npcRelationships = { "npc-elder": 10 };
      expect(createSaveSnapshot().npcRelationships).toEqual({ "npc-elder": 10 });
    });

    it("captures discoveredCampfires", () => {
      mockStoreState.discoveredCampfires = [{ id: "cf-1", label: "A", worldX: 8, worldZ: 16 }];
      expect(createSaveSnapshot().discoveredCampfires).toHaveLength(1);
    });

    it("captures chunkDiffs from chunkDiffs$.peek()", () => {
      mockChunkDiffsState = { "2,3": { plantedTrees: [] } };
      expect(createSaveSnapshot().chunkDiffs["2,3"]).toBeDefined();
    });

    it("includes savedAt timestamp >= now", () => {
      const before = Date.now();
      expect(createSaveSnapshot().savedAt).toBeGreaterThanOrEqual(before);
    });
  });

  // -- applySaveSnapshot --

  describe("applySaveSnapshot", () => {
    it("restores worldSeed and prestigeCount", () => {
      applySaveSnapshot(makeSnapshot({ worldSeed: "restored-seed", prestigeCount: 5 }));
      const arg = mockGameStateSetFn.mock.calls[0][0] as Record<string, unknown>;
      expect(arg.worldSeed).toBe("restored-seed");
      expect(arg.prestigeCount).toBe(5);
    });

    it("restores npcRelationships", () => {
      applySaveSnapshot(makeSnapshot({ npcRelationships: { "npc-a": 7 } }));
      const arg = mockGameStateSetFn.mock.calls[0][0] as Record<string, unknown>;
      expect(arg.npcRelationships).toEqual({ "npc-a": 7 });
    });

    it("restores discoveredSpiritIds", () => {
      applySaveSnapshot(makeSnapshot({ discoveredSpiritIds: ["s1", "s2", "s3"] }));
      const arg = mockGameStateSetFn.mock.calls[0][0] as Record<string, unknown>;
      expect(arg.discoveredSpiritIds).toEqual(["s1", "s2", "s3"]);
    });

    it("restores chunkDiffs via chunkDiffs$.set()", () => {
      applySaveSnapshot(makeSnapshot({ chunkDiffs: { "5,6": { plantedTrees: [] } } }));
      expect(mockChunkDiffsSetFn).toHaveBeenCalledWith({ "5,6": { plantedTrees: [] } });
    });

    it("sets lastSavedAt from snapshot.savedAt", () => {
      applySaveSnapshot(makeSnapshot({ savedAt: 42000 }));
      const arg = mockGameStateSetFn.mock.calls[0][0] as Record<string, unknown>;
      expect(arg.lastSavedAt).toBe(42000);
    });
  });

  // -- migrateIfNeeded --

  describe("migrateIfNeeded", () => {
    it("returns snapshot unchanged if version >= SAVE_VERSION", () => {
      const snap = makeSnapshot({ version: SAVE_VERSION });
      expect(migrateIfNeeded(snap)).toBe(snap);
    });

    it("migrates v1 snapshot: upgrades version and fills chunkDiffs", () => {
      const snap = makeSnapshot({ version: 1, chunkDiffs: undefined as unknown as Record<string, never> });
      const result = migrateIfNeeded(snap);
      expect(result.version).toBe(SAVE_VERSION);
      expect(result.chunkDiffs).toEqual({});
    });

    it("fills in missing optional fields on migration", () => {
      const snap = makeSnapshot({
        version: 1,
        npcRelationships: undefined as unknown as Record<string, number>,
        discoveredSpiritIds: undefined as unknown as string[],
        discoveredCampfires: undefined as unknown as [],
      });
      const result = migrateIfNeeded(snap);
      expect(result.npcRelationships).toEqual({});
      expect(result.discoveredSpiritIds).toEqual([]);
      expect(result.discoveredCampfires).toEqual([]);
    });
  });

  // -- Round-trip: createSaveSnapshot → clearSave → applySaveSnapshot --

  describe("round-trip (Spec §26)", () => {
    it("save → clear → load preserves all key fields", () => {
      mockStoreState.worldSeed = "round-trip-seed";
      mockStoreState.prestigeCount = 4;
      mockStoreState.npcRelationships = { "npc-elder": 8, "npc-trader": 2 };
      mockStoreState.discoveredSpiritIds = ["spirit-A", "spirit-B"];
      mockChunkDiffsState = { "0,1": { plantedTrees: [] }, "2,0": { plantedTrees: [] } };

      const snapshot = createSaveSnapshot();
      expect(snapshot.worldSeed).toBe("round-trip-seed");

      clearSave();
      // Verify reset occurred
      expect(mockGameStateSetFn).toHaveBeenCalledTimes(1);
      expect(mockClearAllChunkDiffs).toHaveBeenCalledTimes(1);

      jest.clearAllMocks();
      applySaveSnapshot(snapshot);

      const restored = mockGameStateSetFn.mock.calls[0][0] as Record<string, unknown>;
      expect(restored.worldSeed).toBe("round-trip-seed");
      expect(restored.prestigeCount).toBe(4);
      expect(restored.npcRelationships).toEqual({ "npc-elder": 8, "npc-trader": 2 });
      expect(restored.discoveredSpiritIds).toEqual(["spirit-A", "spirit-B"]);
      expect(mockChunkDiffsSetFn).toHaveBeenCalledWith({
        "0,1": { plantedTrees: [] },
        "2,0": { plantedTrees: [] },
      });
    });
  });

  // -- deserializeGrove (legacy, for usePersistence.ts) --

  describe("deserializeGrove", () => {
    it("clears existing entities before loading", () => {
      mockEntities.push({ id: "existing" });
      deserializeGrove({ version: 1, timestamp: Date.now(), gridSize: 16, seed: "s", tiles: [], trees: [] });
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
        trees: [{ col: 5, row: 5, speciesId: "white-oak", meshSeed: 42, stage: 3, progress: 0.7, watered: true, totalGrowthTime: 200, plantedAt: 1000 }],
      };
      deserializeGrove(data);
      expect(world.add).toHaveBeenCalledTimes(2); // 1 tile + 1 tree
    });

    it("does not add entities when grove has no tiles or trees", () => {
      deserializeGrove({ version: 1, timestamp: Date.now(), gridSize: 16, seed: "s", tiles: [], trees: [] });
      expect(world.add).not.toHaveBeenCalled();
    });
  });

  // -- loadGroveFromStorage (legacy, for usePersistence.ts) --

  describe("loadGroveFromStorage", () => {
    it("returns null when no save exists", async () => {
      expect(await loadGroveFromStorage()).toBeNull();
    });

    it("returns GroveSaveData when trees exist in db", async () => {
      mockTreeRows.push({ speciesId: "white-oak", gridX: 3, gridZ: 5, stage: 2, progress: 0.5, watered: false, totalGrowthTime: 100, plantedAt: 1000, meshSeed: 42 });
      const loaded = await loadGroveFromStorage();
      expect(loaded).not.toBeNull();
      expect(loaded!.trees).toHaveLength(1);
      expect(loaded!.trees[0].speciesId).toBe("white-oak");
      expect(loaded!.trees[0].col).toBe(3);
      expect(loaded!.trees[0].row).toBe(5);
    });
  });
});
