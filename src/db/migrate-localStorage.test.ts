import { describe, it, expect, beforeEach, beforeAll, vi } from "vitest";
import initSqlJs, { type Database } from "sql.js";
import { drizzle } from "drizzle-orm/sql-js";
import * as schema from "./schema";
import type { AppDatabase } from "./client";
import { migrateFromLocalStorage } from "./migrate-localStorage";

let SQL: Awaited<ReturnType<typeof initSqlJs>>;
let rawDb: Database;
let db: AppDatabase;

// Same CREATE_TABLES_SQL as used in init.ts
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
  rawDb = new SQL.Database();
  rawDb.run(CREATE_TABLES_SQL);
  db = drizzle(rawDb, { schema });
  // Reset localStorage mock
  vi.mocked(localStorage.getItem).mockReset();
  vi.mocked(localStorage.setItem).mockReset();
  vi.mocked(localStorage.removeItem).mockReset();
});

describe("migrateFromLocalStorage", () => {
  it("returns false when no localStorage data exists", () => {
    vi.mocked(localStorage.getItem).mockReturnValue(null);
    expect(migrateFromLocalStorage(db)).toBe(false);
  });

  it("returns false for invalid JSON", () => {
    vi.mocked(localStorage.getItem).mockReturnValue("{invalid json");
    expect(migrateFromLocalStorage(db)).toBe(false);
  });

  it("migrates Zustand persist format (state wrapper)", () => {
    const zustandData = {
      state: {
        level: 7,
        xp: 300,
        coins: 250,
        stamina: 80,
        maxStamina: 100,
        selectedTool: "axe",
        selectedSpecies: "elder-pine",
        gridSize: 16,
        prestigeCount: 1,
        resources: { timber: 50, sap: 20, fruit: 10, acorns: 15 },
        lifetimeResources: { timber: 200, sap: 80, fruit: 40, acorns: 60 },
        seeds: { "white-oak": 5, "elder-pine": 3 },
        unlockedTools: ["trowel", "watering-can", "axe"],
        unlockedSpecies: ["white-oak", "elder-pine"],
        achievements: ["first-seed"],
        treesPlanted: 25,
        treesMatured: 10,
        treesHarvested: 8,
        treesWatered: 20,
        seasonsExperienced: ["spring", "summer"],
        speciesPlanted: ["white-oak"],
        toolUseCounts: { trowel: 50 },
        wildTreesHarvested: 2,
        wildTreesRegrown: 1,
        visitedZoneTypes: [],
        treesPlantedInSpring: 5,
        treesHarvestedInAutumn: 3,
        wildSpeciesHarvested: [],
        completedQuestIds: [],
        completedGoalIds: [],
        lastQuestRefresh: 0,
        gameTimeMicroseconds: 500000000,
        currentSeason: "summer",
        currentDay: 10,
        worldSeed: "my-seed",
        discoveredZones: ["starting-grove"],
        currentZoneId: "starting-grove",
        hasSeenRules: true,
        hapticsEnabled: true,
        soundEnabled: false,
        toolUpgrades: { trowel: 1 },
        placedStructures: [],
        groveData: null,
      },
    };

    vi.mocked(localStorage.getItem).mockImplementation((key: string) => {
      if (key === "grove-keeper-save") return JSON.stringify(zustandData);
      return null;
    });

    const result = migrateFromLocalStorage(db);
    expect(result).toBe(true);

    // Verify save_config created with "normal" difficulty (migration default)
    const config = db.select().from(schema.saveConfig).all();
    expect(config).toHaveLength(1);
    expect(config[0].difficulty).toBe("normal");

    // Verify player state
    const p = db.select().from(schema.player).all();
    expect(p).toHaveLength(1);
    expect(p[0].level).toBe(7);
    expect(p[0].coins).toBe(250);
    expect(p[0].selectedTool).toBe("axe");

    // Verify resources
    const resourceRows = db.select().from(schema.resources).all();
    const timber = resourceRows.find((r) => r.type === "timber");
    expect(timber!.current).toBe(50);
    expect(timber!.lifetime).toBe(200);

    // Verify seeds
    const seedRows = db.select().from(schema.seeds).all();
    expect(seedRows).toHaveLength(2);

    // Verify unlocks
    const unlockRows = db.select().from(schema.unlocks).all();
    const tools = unlockRows.filter((u) => u.type === "tool");
    expect(tools).toHaveLength(3);

    // Verify settings
    const st = db.select().from(schema.settings).all();
    expect(st[0].hasSeenRules).toBe(true);
    expect(st[0].soundEnabled).toBe(false);

    // Verify time state
    const ts = db.select().from(schema.timeState).all();
    expect(ts[0].season).toBe("summer");
    expect(ts[0].day).toBe(10);
  });

  it("archives localStorage keys after migration", () => {
    const data = JSON.stringify({ state: { level: 1 } });
    vi.mocked(localStorage.getItem).mockImplementation((key: string) => {
      if (key === "grove-keeper-save") return data;
      if (key === "grovekeeper-grove") return '{"trees":[]}';
      return null;
    });

    migrateFromLocalStorage(db);

    // Should archive and remove originals
    expect(localStorage.setItem).toHaveBeenCalledWith("grove-keeper-save-archived", data);
    expect(localStorage.removeItem).toHaveBeenCalledWith("grove-keeper-save");
    expect(localStorage.setItem).toHaveBeenCalledWith("grovekeeper-grove-archived", '{"trees":[]}');
    expect(localStorage.removeItem).toHaveBeenCalledWith("grovekeeper-grove");
  });
});
