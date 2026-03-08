/**
 * Tests for database query functions.
 *
 * We mock the drizzle db client to verify the correct SQL operations
 * are built without needing a real SQLite database.
 */

// Mock the client module before importing queries
const mockInsert = jest.fn();
const mockSelect = jest.fn();
const mockDelete = jest.fn();
const mockValues = jest.fn().mockResolvedValue(undefined);
const mockFrom = jest.fn();
const mockTransaction = jest.fn();

// Build a mock transaction that mirrors the db interface
const mockTx = {
  insert: (...args: unknown[]) => {
    mockInsert(...args);
    return {
      values: (...vArgs: unknown[]) => {
        mockValues(...vArgs);
        return Promise.resolve();
      },
    };
  },
  delete: (...args: unknown[]) => {
    mockDelete(...args);
    return Promise.resolve();
  },
  select: (...args: unknown[]) => {
    mockSelect(...args);
    return {
      from: (...fArgs: unknown[]) => {
        mockFrom(...fArgs);
        return Promise.resolve([]);
      },
    };
  },
};

jest.mock("@/game/db/client", () => ({
  getDb: () => ({
    insert: mockTx.insert,
    select: mockTx.select,
    delete: mockTx.delete,
    transaction: async (fn: (tx: typeof mockTx) => Promise<void>) => {
      mockTransaction();
      await fn(mockTx);
    },
  }),
}));

import { hydrateGameStore, persistGameStore, setupNewGame } from "@/game/db/queries";
import * as schema from "@/game/db/schema";

describe("db queries", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("hydrateGameStore", () => {
    it("returns a HydratedGameState with defaults when tables are empty", async () => {
      const result = await hydrateGameStore();
      expect(result).not.toBeNull();
      expect(result!.level).toBe(1);
      expect(result!.xp).toBe(0);
      expect(result!.coins).toBe(100);
      expect(result!.difficulty).toBe("sapling");
      expect(result!.currentSeason).toBe("spring");
      expect(result!.currentDay).toBe(1);
    });

    it("queries all schema tables", async () => {
      await hydrateGameStore();
      // Should query: saveConfig, player, resources, seeds, unlocks,
      // achievements, worldState, timeState, tracking, settings,
      // toolUpgrades, structures, trees
      expect(mockFrom.mock.calls.length).toBeGreaterThanOrEqual(13);
    });
  });

  describe("persistGameStore", () => {
    it("runs inside a transaction", async () => {
      await persistGameStore({
        level: 5,
        xp: 200,
        coins: 500,
        resources: { timber: 10, sap: 5, fruit: 3, acorns: 1 },
        lifetimeResources: { timber: 50, sap: 20, fruit: 10, acorns: 5 },
        seeds: {},
        unlockedTools: ["trowel"],
        unlockedSpecies: ["white-oak"],
        achievements: [],
        treesPlanted: 0,
        treesMatured: 0,
        treesHarvested: 0,
        treesWatered: 0,
        toolUseCounts: {},
        wildTreesHarvested: 0,
        wildTreesRegrown: 0,
        visitedZoneTypes: [],
        treesPlantedInSpring: 0,
        treesHarvestedInAutumn: 0,
        wildSpeciesHarvested: [],
        completedQuestIds: [],
        completedGoalIds: [],
        lastQuestRefresh: 0,
        stamina: 100,
        maxStamina: 100,
        selectedTool: "trowel",
        selectedSpecies: "white-oak",
        gridSize: 12,
        prestigeCount: 0,
        activeBorderCosmetic: null,
        worldSeed: "",
        discoveredZones: ["starting-grove"],
        currentZoneId: "starting-grove",
        gameTimeMicroseconds: 0,
        currentSeason: "spring",
        currentDay: 1,
        hasSeenRules: false,
        hapticsEnabled: true,
        soundEnabled: true,
        toolUpgrades: {},
        placedStructures: [],
        groveData: null,
        seasonsExperienced: [],
        speciesPlanted: [],
      });

      expect(mockTransaction).toHaveBeenCalled();
      // Should delete and re-insert into multiple tables
      expect(mockDelete.mock.calls.length).toBeGreaterThan(0);
      expect(mockInsert.mock.calls.length).toBeGreaterThan(0);
    });
  });

  describe("setupNewGame", () => {
    it("clears all tables and inserts defaults in a transaction", async () => {
      await setupNewGame("normal", false, { timber: 0, sap: 0, fruit: 0, acorns: 0 }, {});

      expect(mockTransaction).toHaveBeenCalled();
      // Should delete from all 16 tables
      expect(mockDelete.mock.calls.length).toBe(16);
      // Should insert: saveConfig, player, 4 resources, unlocks (3), worldState,
      // timeState, tracking, settings = at least 13
      expect(mockInsert.mock.calls.length).toBeGreaterThanOrEqual(13);
    });

    it("inserts starting seeds when provided", async () => {
      await setupNewGame("hard", true, { timber: 10 }, { "white-oak": 5, maple: 3 });

      // Find seed inserts
      const seedInserts = mockInsert.mock.calls.filter(
        (call: unknown[]) => call[0] === schema.seeds,
      );
      expect(seedInserts.length).toBe(2);
    });
  });
});
