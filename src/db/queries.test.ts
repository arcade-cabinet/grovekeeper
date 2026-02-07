import { describe, it, expect, beforeEach, vi, beforeAll } from "vitest";
import initSqlJs, { type Database } from "sql.js";
import { drizzle } from "drizzle-orm/sql-js";
import * as schema from "./schema";
import type { AppDatabase } from "./client";

// We'll create a real in-memory SQL.js database (no WASM needed in Node/happy-dom)
let SQL: Awaited<ReturnType<typeof initSqlJs>>;
let rawDb: Database;
let db: AppDatabase;

// Mock the client module to return our test database
vi.mock("./client", () => ({
  getDb: () => ({ db, sqlDb: rawDb }),
  setDb: vi.fn(),
  isDbInitialized: () => true,
  createDrizzleDb: vi.fn(),
}));

// Schema creation SQL (same as init.ts)
const CREATE_TABLES_SQL = `
  CREATE TABLE IF NOT EXISTS save_config (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    difficulty TEXT NOT NULL DEFAULT 'normal',
    permadeath INTEGER NOT NULL DEFAULT 0,
    version INTEGER NOT NULL DEFAULT 1,
    created_at INTEGER NOT NULL DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS player (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    level INTEGER NOT NULL DEFAULT 1,
    xp INTEGER NOT NULL DEFAULT 0,
    coins INTEGER NOT NULL DEFAULT 100,
    stamina REAL NOT NULL DEFAULT 100,
    max_stamina REAL NOT NULL DEFAULT 100,
    selected_tool TEXT NOT NULL DEFAULT 'trowel',
    selected_species TEXT NOT NULL DEFAULT 'white-oak',
    grid_size INTEGER NOT NULL DEFAULT 12,
    prestige_count INTEGER NOT NULL DEFAULT 0,
    active_border_cosmetic TEXT,
    body_temp REAL NOT NULL DEFAULT 37.0
  );
  CREATE TABLE IF NOT EXISTS resources (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL,
    current INTEGER NOT NULL DEFAULT 0,
    lifetime INTEGER NOT NULL DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS seeds (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    species_id TEXT NOT NULL,
    amount INTEGER NOT NULL DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS unlocks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL,
    item_id TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS achievements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    achievement_id TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS trees (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    species_id TEXT NOT NULL,
    grid_x INTEGER NOT NULL,
    grid_z INTEGER NOT NULL,
    zone_id TEXT NOT NULL DEFAULT 'starting-grove',
    stage INTEGER NOT NULL DEFAULT 0,
    progress REAL NOT NULL DEFAULT 0,
    watered INTEGER NOT NULL DEFAULT 0,
    fertilized INTEGER NOT NULL DEFAULT 0,
    pruned INTEGER NOT NULL DEFAULT 0,
    total_growth_time REAL NOT NULL DEFAULT 0,
    planted_at INTEGER NOT NULL DEFAULT 0,
    mesh_seed INTEGER NOT NULL DEFAULT 0,
    harvest_cooldown_elapsed REAL NOT NULL DEFAULT 0,
    harvest_ready INTEGER NOT NULL DEFAULT 0,
    blight_type TEXT
  );
  CREATE TABLE IF NOT EXISTS grid_cells (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    grid_x INTEGER NOT NULL,
    grid_z INTEGER NOT NULL,
    zone_id TEXT NOT NULL DEFAULT 'starting-grove',
    type TEXT NOT NULL DEFAULT 'soil'
  );
  CREATE TABLE IF NOT EXISTS structures (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    template_id TEXT NOT NULL,
    world_x INTEGER NOT NULL,
    world_z INTEGER NOT NULL,
    zone_id TEXT NOT NULL DEFAULT 'starting-grove',
    integrity REAL NOT NULL DEFAULT 100
  );
  CREATE TABLE IF NOT EXISTS quests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    quest_id TEXT NOT NULL,
    difficulty TEXT NOT NULL DEFAULT 'normal',
    completed INTEGER NOT NULL DEFAULT 0,
    rewards_json TEXT NOT NULL DEFAULT '{}'
  );
  CREATE TABLE IF NOT EXISTS quest_goals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    quest_id TEXT NOT NULL,
    goal_id TEXT NOT NULL,
    target INTEGER NOT NULL DEFAULT 1,
    progress INTEGER NOT NULL DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS world_state (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    world_seed TEXT NOT NULL DEFAULT '',
    discovered_zones_json TEXT NOT NULL DEFAULT '["starting-grove"]',
    current_zone_id TEXT NOT NULL DEFAULT 'starting-grove',
    player_pos_x REAL NOT NULL DEFAULT 6,
    player_pos_z REAL NOT NULL DEFAULT 6
  );
  CREATE TABLE IF NOT EXISTS time_state (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    game_time_us REAL NOT NULL DEFAULT 0,
    season TEXT NOT NULL DEFAULT 'spring',
    day INTEGER NOT NULL DEFAULT 1
  );
  CREATE TABLE IF NOT EXISTS tracking (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    trees_planted INTEGER NOT NULL DEFAULT 0,
    trees_matured INTEGER NOT NULL DEFAULT 0,
    trees_harvested INTEGER NOT NULL DEFAULT 0,
    trees_watered INTEGER NOT NULL DEFAULT 0,
    seasons_experienced_json TEXT NOT NULL DEFAULT '[]',
    species_planted_json TEXT NOT NULL DEFAULT '[]',
    tool_use_counts_json TEXT NOT NULL DEFAULT '{}',
    wild_trees_harvested INTEGER NOT NULL DEFAULT 0,
    wild_trees_regrown INTEGER NOT NULL DEFAULT 0,
    visited_zone_types_json TEXT NOT NULL DEFAULT '[]',
    trees_planted_in_spring INTEGER NOT NULL DEFAULT 0,
    trees_harvested_in_autumn INTEGER NOT NULL DEFAULT 0,
    wild_species_harvested_json TEXT NOT NULL DEFAULT '[]',
    completed_quest_ids_json TEXT NOT NULL DEFAULT '[]',
    completed_goal_ids_json TEXT NOT NULL DEFAULT '[]',
    last_quest_refresh INTEGER NOT NULL DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    has_seen_rules INTEGER NOT NULL DEFAULT 0,
    haptics_enabled INTEGER NOT NULL DEFAULT 1,
    sound_enabled INTEGER NOT NULL DEFAULT 1
  );
  CREATE TABLE IF NOT EXISTS tool_upgrades (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tool_id TEXT NOT NULL,
    tier INTEGER NOT NULL DEFAULT 0
  );
`;

beforeAll(async () => {
  SQL = await initSqlJs();
});

beforeEach(() => {
  // Fresh database for each test
  rawDb = new SQL.Database();
  rawDb.run(CREATE_TABLES_SQL);
  db = drizzle(rawDb, { schema });
});

// Import AFTER mocking
const { hydrateGameStore, persistGameStore, saveGroveToDb, loadGroveFromDb, setupNewGame } = await import("./queries");

describe("Database Queries", () => {
  describe("setupNewGame", () => {
    it("creates save_config with chosen difficulty", () => {
      setupNewGame("hard", false, { timber: 10, sap: 5, fruit: 5, acorns: 10 }, { "white-oak": 8 });
      const config = db.select().from(schema.saveConfig).all();
      expect(config).toHaveLength(1);
      expect(config[0].difficulty).toBe("hard");
      expect(config[0].permadeath).toBe(false);
    });

    it("creates save_config with permadeath on", () => {
      setupNewGame("ultra-brutal", true, { timber: 3 }, { "white-oak": 3 });
      const config = db.select().from(schema.saveConfig).all();
      expect(config[0].permadeath).toBe(true);
    });

    it("inserts default unlocks (trowel, watering-can, white-oak)", () => {
      setupNewGame("normal", false, {}, {});
      const unlockRows = db.select().from(schema.unlocks).all();
      const tools = unlockRows.filter((u) => u.type === "tool").map((u) => u.itemId);
      const species = unlockRows.filter((u) => u.type === "species").map((u) => u.itemId);
      expect(tools).toContain("trowel");
      expect(tools).toContain("watering-can");
      expect(species).toContain("white-oak");
    });

    it("inserts starting resources correctly", () => {
      setupNewGame("explore", false, { timber: 50, sap: 30, fruit: 20, acorns: 30 }, {});
      const resourceRows = db.select().from(schema.resources).all();
      const timberRow = resourceRows.find((r) => r.type === "timber");
      expect(timberRow).toBeDefined();
      expect(timberRow!.current).toBe(50);
    });

    it("inserts starting seeds correctly", () => {
      setupNewGame("normal", false, {}, { "white-oak": 10 });
      const seedRows = db.select().from(schema.seeds).all();
      expect(seedRows).toHaveLength(1);
      expect(seedRows[0].speciesId).toBe("white-oak");
      expect(seedRows[0].amount).toBe(10);
    });

    it("creates initial time_state at Spring Day 1", () => {
      setupNewGame("normal", false, {}, {});
      const ts = db.select().from(schema.timeState).all();
      expect(ts).toHaveLength(1);
      expect(ts[0].season).toBe("spring");
      expect(ts[0].day).toBe(1);
    });

    it("clears previous data when called again", () => {
      setupNewGame("normal", false, { timber: 20 }, { "white-oak": 10 });
      setupNewGame("hard", true, { timber: 5 }, { "white-oak": 3 });

      const config = db.select().from(schema.saveConfig).all();
      expect(config).toHaveLength(1);
      expect(config[0].difficulty).toBe("hard");

      const seedRows = db.select().from(schema.seeds).all();
      expect(seedRows).toHaveLength(1);
      expect(seedRows[0].amount).toBe(3);
    });
  });

  describe("hydrateGameStore", () => {
    it("returns sensible defaults for empty database", () => {
      const state = hydrateGameStore();
      expect(state.difficulty).toBe("normal");
      expect(state.level).toBe(1);
      expect(state.coins).toBe(100);
      expect(state.resources.timber).toBe(0);
      expect(state.currentSeason).toBe("spring");
    });

    it("hydrates after setupNewGame", () => {
      setupNewGame("hard", true, { timber: 10, sap: 5, fruit: 5, acorns: 10 }, { "white-oak": 8 });
      const state = hydrateGameStore();
      expect(state.difficulty).toBe("hard");
      expect(state.permadeath).toBe(true);
      expect(state.resources.timber).toBe(10);
      expect(state.seeds["white-oak"]).toBe(8);
      expect(state.unlockedTools).toContain("trowel");
    });
  });

  describe("persistGameStore / hydrateGameStore round-trip", () => {
    it("round-trips player state", () => {
      // Set up initial data so tables have rows
      setupNewGame("normal", false, {}, {});

      // biome-ignore lint/suspicious/noExplicitAny: mirrors persistGameStore signature
      const gameState: Record<string, any> = {
        level: 5,
        xp: 450,
        coins: 500,
        stamina: 75.5,
        maxStamina: 120,
        selectedTool: "axe",
        selectedSpecies: "elder-pine",
        gridSize: 20,
        prestigeCount: 2,
        activeBorderCosmetic: "stone-wall",
        resources: { timber: 100, sap: 50, fruit: 30, acorns: 20 },
        lifetimeResources: { timber: 500, sap: 200, fruit: 100, acorns: 80 },
        seeds: { "white-oak": 15, "elder-pine": 8 },
        unlockedTools: ["trowel", "watering-can", "axe", "pruners"],
        unlockedSpecies: ["white-oak", "elder-pine", "birch"],
        achievements: ["first-seed", "grove-tender"],
        treesPlanted: 42,
        treesMatured: 20,
        treesHarvested: 15,
        treesWatered: 30,
        seasonsExperienced: ["spring", "summer", "autumn"],
        speciesPlanted: ["white-oak", "elder-pine"],
        toolUseCounts: { trowel: 100, axe: 50 },
        wildTreesHarvested: 5,
        wildTreesRegrown: 3,
        visitedZoneTypes: ["forest", "meadow"],
        treesPlantedInSpring: 10,
        treesHarvestedInAutumn: 8,
        wildSpeciesHarvested: ["wild-oak"],
        completedQuestIds: ["quest-1"],
        completedGoalIds: ["goal-1", "goal-2"],
        lastQuestRefresh: 12345,
        gameTimeMicroseconds: 999000000,
        currentSeason: "summer",
        currentDay: 15,
        worldSeed: "test-seed",
        discoveredZones: ["starting-grove", "forest-north"],
        currentZoneId: "forest-north",
        hasSeenRules: true,
        hapticsEnabled: false,
        soundEnabled: true,
        toolUpgrades: { trowel: 2, axe: 1 },
        placedStructures: [{ templateId: "tool-shed", worldX: 5, worldZ: 7 }],
        groveData: {
          trees: [],
          playerPosition: { x: 10, z: 12 },
        },
      };

      persistGameStore(gameState);
      const hydrated = hydrateGameStore();

      // Verify key fields round-trip correctly
      expect(hydrated.level).toBe(5);
      expect(hydrated.xp).toBe(450);
      expect(hydrated.coins).toBe(500);
      expect(hydrated.stamina).toBeCloseTo(75.5);
      expect(hydrated.maxStamina).toBeCloseTo(120);
      expect(hydrated.selectedTool).toBe("axe");
      expect(hydrated.selectedSpecies).toBe("elder-pine");
      expect(hydrated.gridSize).toBe(20);
      expect(hydrated.prestigeCount).toBe(2);
      expect(hydrated.activeBorderCosmetic).toBe("stone-wall");
      expect(hydrated.resources.timber).toBe(100);
      expect(hydrated.resources.sap).toBe(50);
      expect(hydrated.lifetimeResources.timber).toBe(500);
      expect(hydrated.seeds["white-oak"]).toBe(15);
      expect(hydrated.seeds["elder-pine"]).toBe(8);
      expect(hydrated.unlockedTools).toContain("axe");
      expect(hydrated.unlockedSpecies).toContain("birch");
      expect(hydrated.achievements).toContain("grove-tender");
      expect(hydrated.treesPlanted).toBe(42);
      expect(hydrated.seasonsExperienced).toContain("autumn");
      expect(hydrated.toolUseCounts.trowel).toBe(100);
      expect(hydrated.gameTimeMicroseconds).toBe(999000000);
      expect(hydrated.currentSeason).toBe("summer");
      expect(hydrated.currentDay).toBe(15);
      expect(hydrated.worldSeed).toBe("test-seed");
      expect(hydrated.discoveredZones).toContain("forest-north");
      expect(hydrated.hasSeenRules).toBe(true);
      expect(hydrated.hapticsEnabled).toBe(false);
      expect(hydrated.toolUpgrades.trowel).toBe(2);
      expect(hydrated.placedStructures).toHaveLength(1);
      expect(hydrated.placedStructures[0].templateId).toBe("tool-shed");
    });
  });

  describe("saveGroveToDb / loadGroveFromDb", () => {
    it("returns null for empty trees table", () => {
      // Need world_state for player position
      setupNewGame("normal", false, {}, {});
      const grove = loadGroveFromDb();
      expect(grove).toBeNull();
    });

    it("round-trips tree data", () => {
      setupNewGame("normal", false, {}, {});

      const trees = [
        {
          speciesId: "white-oak",
          gridX: 3,
          gridZ: 5,
          stage: 2 as const,
          progress: 0.45,
          watered: true,
          totalGrowthTime: 120.5,
          plantedAt: 1000,
          meshSeed: 42,
        },
        {
          speciesId: "elder-pine",
          gridX: 7,
          gridZ: 2,
          stage: 0 as const,
          progress: 0.1,
          watered: false,
          totalGrowthTime: 10,
          plantedAt: 2000,
          meshSeed: 99,
        },
      ];

      saveGroveToDb(trees, { x: 8, z: 9 });
      const loaded = loadGroveFromDb();

      expect(loaded).not.toBeNull();
      expect(loaded!.trees).toHaveLength(2);
      expect(loaded!.playerPosition).toEqual({ x: 8, z: 9 });

      const oak = loaded!.trees.find((t) => t.speciesId === "white-oak")!;
      expect(oak.gridX).toBe(3);
      expect(oak.gridZ).toBe(5);
      expect(oak.stage).toBe(2);
      expect(oak.progress).toBeCloseTo(0.45);
      expect(oak.watered).toBe(true);
      expect(oak.meshSeed).toBe(42);
    });
  });
});
