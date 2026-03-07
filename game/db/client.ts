import { Platform } from "react-native";
import * as schema from "./schema.ts";

type DrizzleDb = ReturnType<typeof import("drizzle-orm/expo-sqlite").drizzle>;

let _db: DrizzleDb | null = null;
let _initAttempted = false;

/**
 * Raw SQL for creating all 16 tables. Each uses
 * CREATE TABLE IF NOT EXISTS for idempotency.
 */
const MIGRATION_SQL = `
CREATE TABLE IF NOT EXISTS "save_config" (
  "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  "difficulty" text NOT NULL DEFAULT 'normal',
  "permadeath" integer NOT NULL DEFAULT 0,
  "version" integer NOT NULL DEFAULT 1,
  "created_at" integer NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS "player" (
  "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  "level" integer NOT NULL DEFAULT 1,
  "xp" integer NOT NULL DEFAULT 0,
  "coins" integer NOT NULL DEFAULT 100,
  "stamina" real NOT NULL DEFAULT 100,
  "max_stamina" real NOT NULL DEFAULT 100,
  "selected_tool" text NOT NULL DEFAULT 'trowel',
  "selected_species" text NOT NULL DEFAULT 'white-oak',
  "grid_size" integer NOT NULL DEFAULT 12,
  "prestige_count" integer NOT NULL DEFAULT 0,
  "active_border_cosmetic" text,
  "body_temp" real NOT NULL DEFAULT 37
);

CREATE TABLE IF NOT EXISTS "resources" (
  "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  "type" text NOT NULL,
  "current" integer NOT NULL DEFAULT 0,
  "lifetime" integer NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS "seeds" (
  "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  "species_id" text NOT NULL,
  "amount" integer NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS "unlocks" (
  "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  "type" text NOT NULL,
  "item_id" text NOT NULL
);

CREATE TABLE IF NOT EXISTS "achievements" (
  "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  "achievement_id" text NOT NULL
);

CREATE TABLE IF NOT EXISTS "trees" (
  "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  "species_id" text NOT NULL,
  "grid_x" integer NOT NULL,
  "grid_z" integer NOT NULL,
  "zone_id" text NOT NULL DEFAULT 'starting-grove',
  "stage" integer NOT NULL DEFAULT 0,
  "progress" real NOT NULL DEFAULT 0,
  "watered" integer NOT NULL DEFAULT 0,
  "fertilized" integer NOT NULL DEFAULT 0,
  "pruned" integer NOT NULL DEFAULT 0,
  "total_growth_time" real NOT NULL DEFAULT 0,
  "planted_at" integer NOT NULL DEFAULT 0,
  "mesh_seed" integer NOT NULL DEFAULT 0,
  "harvest_cooldown_elapsed" real NOT NULL DEFAULT 0,
  "harvest_ready" integer NOT NULL DEFAULT 0,
  "blight_type" text
);

CREATE TABLE IF NOT EXISTS "grid_cells" (
  "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  "grid_x" integer NOT NULL,
  "grid_z" integer NOT NULL,
  "zone_id" text NOT NULL DEFAULT 'starting-grove',
  "type" text NOT NULL DEFAULT 'soil'
);

CREATE TABLE IF NOT EXISTS "structures" (
  "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  "template_id" text NOT NULL,
  "world_x" integer NOT NULL,
  "world_z" integer NOT NULL,
  "zone_id" text NOT NULL DEFAULT 'starting-grove',
  "integrity" real NOT NULL DEFAULT 100
);

CREATE TABLE IF NOT EXISTS "quests" (
  "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  "quest_id" text NOT NULL,
  "difficulty" text NOT NULL DEFAULT 'normal',
  "completed" integer NOT NULL DEFAULT 0,
  "rewards_json" text NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS "quest_goals" (
  "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  "quest_id" text NOT NULL,
  "goal_id" text NOT NULL,
  "target" integer NOT NULL DEFAULT 1,
  "progress" integer NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS "world_state" (
  "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  "world_seed" text NOT NULL DEFAULT '',
  "discovered_zones_json" text NOT NULL DEFAULT '["starting-grove"]',
  "current_zone_id" text NOT NULL DEFAULT 'starting-grove',
  "player_pos_x" real NOT NULL DEFAULT 6,
  "player_pos_z" real NOT NULL DEFAULT 6
);

CREATE TABLE IF NOT EXISTS "time_state" (
  "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  "game_time_us" real NOT NULL DEFAULT 0,
  "season" text NOT NULL DEFAULT 'spring',
  "day" integer NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS "tracking" (
  "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  "trees_planted" integer NOT NULL DEFAULT 0,
  "trees_matured" integer NOT NULL DEFAULT 0,
  "trees_harvested" integer NOT NULL DEFAULT 0,
  "trees_watered" integer NOT NULL DEFAULT 0,
  "seasons_experienced_json" text NOT NULL DEFAULT '[]',
  "species_planted_json" text NOT NULL DEFAULT '[]',
  "tool_use_counts_json" text NOT NULL DEFAULT '{}',
  "wild_trees_harvested" integer NOT NULL DEFAULT 0,
  "wild_trees_regrown" integer NOT NULL DEFAULT 0,
  "visited_zone_types_json" text NOT NULL DEFAULT '[]',
  "trees_planted_in_spring" integer NOT NULL DEFAULT 0,
  "trees_harvested_in_autumn" integer NOT NULL DEFAULT 0,
  "wild_species_harvested_json" text NOT NULL DEFAULT '[]',
  "completed_quest_ids_json" text NOT NULL DEFAULT '[]',
  "completed_goal_ids_json" text NOT NULL DEFAULT '[]',
  "last_quest_refresh" integer NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS "settings" (
  "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  "has_seen_rules" integer NOT NULL DEFAULT 0,
  "haptics_enabled" integer NOT NULL DEFAULT 1,
  "sound_enabled" integer NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS "tool_upgrades" (
  "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  "tool_id" text NOT NULL,
  "tier" integer NOT NULL DEFAULT 0
);
`;

/**
 * Get the drizzle database instance. Returns null on web where
 * expo-sqlite WASM may not be available.
 *
 * On first successful init, runs migration SQL to create all 16 tables.
 * Also drops legacy tables (saves, key-value settings) from 0000_initial.sql
 * if they exist.
 */
export function getDb(): DrizzleDb | null {
  if (_db) return _db;
  if (_initAttempted) return null;
  _initAttempted = true;

  try {
    const { drizzle } = require("drizzle-orm/expo-sqlite");
    const { openDatabaseSync } = require("expo-sqlite");
    const expoDb = openDatabaseSync("grovekeeper.db");

    // Drop legacy tables from the old simple schema (0000_initial.sql).
    // The old `settings` table used `key TEXT PRIMARY KEY` which conflicts
    // with the new `settings` table that uses `id INTEGER PRIMARY KEY`.
    // The old `saves` table is replaced by the relational `trees` table.
    // We must drop these BEFORE running CREATE TABLE IF NOT EXISTS to avoid
    // schema conflicts.
    try {
      // Check if the old key-based settings table exists
      const result = expoDb.getFirstSync(
        "SELECT sql FROM sqlite_master WHERE type='table' AND name='settings'",
      );
      if (result && typeof result === "object" && "sql" in result) {
        const sqlText = (result as { sql: string }).sql;
        if (sqlText.includes('"key" text') || sqlText.includes("`key` text")) {
          // Old key-value settings table detected -- drop it
          expoDb.runSync("DROP TABLE IF EXISTS settings");
        }
      }
      // Drop the legacy saves table
      expoDb.runSync("DROP TABLE IF EXISTS saves");
    } catch {
      // Ignore errors during legacy cleanup
    }

    // Run migration SQL to create all 16 tables (idempotent)
    expoDb.execSync(MIGRATION_SQL);

    _db = drizzle(expoDb, { schema });
    return _db;
  } catch {
    if (Platform.OS === "web") {
      console.warn("[db] expo-sqlite not available on web, persistence disabled");
    }
    return null;
  }
}
