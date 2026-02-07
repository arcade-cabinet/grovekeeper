/**
 * Database initialization boot sequence.
 *
 * 1. Load sql.js WASM module
 * 2. Try loading existing database from IndexedDB
 * 3. If not found, try migrating from localStorage
 * 4. If no data, create fresh database
 * 5. Run schema creation (CREATE TABLE IF NOT EXISTS)
 * 6. Set the singleton client
 */
import initSqlJs from "sql.js";
import { setDb, createDrizzleDb } from "./client";
import { loadDatabaseFromIndexedDB, saveDatabaseToIndexedDB } from "./persist";
import { migrateFromLocalStorage } from "./migrate-localStorage";
import * as schema from "./schema";

/**
 * Resolve the WASM file URL. During dev, it's in /sql-wasm/;
 * in production with a base path, it'll be at base/sql-wasm/.
 */
function getWasmUrl(): string {
  const base = import.meta.env.BASE_URL ?? "/";
  return `${base}sql-wasm/sql-wasm.wasm`;
}

/**
 * SQL statements to create all tables. Uses CREATE TABLE IF NOT EXISTS
 * so this is safe to run on existing databases.
 */
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

export interface InitResult {
  isNewGame: boolean;
  migratedFromLocalStorage: boolean;
}

/**
 * Initialize the database. Returns metadata about the initialization.
 */
export async function initDatabase(): Promise<InitResult> {
  // 1. Load WASM
  const SQL = await initSqlJs({
    locateFile: () => getWasmUrl(),
  });

  let isNewGame = true;
  let migratedFromLocalStorage = false;

  // 2. Try loading from IndexedDB
  const savedBytes = await loadDatabaseFromIndexedDB();
  let rawDb: InstanceType<typeof SQL.Database>;

  if (savedBytes) {
    rawDb = new SQL.Database(savedBytes);
    isNewGame = false;
  } else {
    // 3. Create fresh database
    rawDb = new SQL.Database();
  }

  // 4. Run schema creation (idempotent)
  rawDb.run(CREATE_TABLES_SQL);

  // 5. Create Drizzle instance and set singleton
  const drizzleDb = createDrizzleDb(rawDb);
  setDb(drizzleDb, rawDb);

  // 6. If fresh database, try migrating from localStorage
  if (isNewGame) {
    const migrated = migrateFromLocalStorage(drizzleDb);
    if (migrated) {
      migratedFromLocalStorage = true;
      isNewGame = false;
      // Save the migrated data to IndexedDB immediately
      const data = rawDb.export();
      await saveDatabaseToIndexedDB(data);
    }
  }

  // 7. Check if save_config exists (determines if this is truly a new game)
  if (!isNewGame) {
    const configRows = drizzleDb.select().from(schema.saveConfig).all();
    if (configRows.length === 0) {
      isNewGame = true;
    }
  }

  return { isNewGame, migratedFromLocalStorage };
}
