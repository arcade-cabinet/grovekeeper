/**
 * In-memory test fixture: builds a sql.js Database with the full RC schema
 * applied and wraps it with drizzle. Used by repo tests; never imported by
 * runtime code.
 */
import { drizzle } from "drizzle-orm/sql-js";
import initSqlJs, { type Database } from "sql.js";
import type { AppDatabase } from "@/db/client";
import * as schema from "@/db/schema";

const RC_SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS worlds (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL DEFAULT 'Grovekeeper',
  gardener_name TEXT NOT NULL DEFAULT 'Gardener',
  world_seed TEXT NOT NULL,
  difficulty TEXT NOT NULL DEFAULT 'sapling',
  created_at INTEGER NOT NULL DEFAULT 0,
  last_played_at INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS groves (
  id TEXT PRIMARY KEY,
  world_id TEXT NOT NULL REFERENCES worlds(id) ON DELETE CASCADE,
  chunk_x INTEGER NOT NULL,
  chunk_z INTEGER NOT NULL,
  biome TEXT NOT NULL,
  state TEXT NOT NULL DEFAULT 'discovered',
  discovered_at INTEGER NOT NULL DEFAULT 0,
  claimed_at INTEGER,
  hearth_lit_at INTEGER
);
CREATE UNIQUE INDEX IF NOT EXISTS groves_world_chunk_uq
  ON groves(world_id, chunk_x, chunk_z);
CREATE INDEX IF NOT EXISTS groves_world_state_idx
  ON groves(world_id, state);
CREATE TABLE IF NOT EXISTS chunks (
  world_id TEXT NOT NULL REFERENCES worlds(id) ON DELETE CASCADE,
  chunk_x INTEGER NOT NULL,
  chunk_z INTEGER NOT NULL,
  biome TEXT NOT NULL,
  generated_at INTEGER NOT NULL DEFAULT 0,
  modified_blocks_json TEXT NOT NULL DEFAULT '[]',
  PRIMARY KEY (world_id, chunk_x, chunk_z)
);
CREATE TABLE IF NOT EXISTS inventory (
  world_id TEXT NOT NULL REFERENCES worlds(id) ON DELETE CASCADE,
  item_id TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (world_id, item_id)
);
CREATE TABLE IF NOT EXISTS known_recipes (
  world_id TEXT NOT NULL REFERENCES worlds(id) ON DELETE CASCADE,
  recipe_id TEXT NOT NULL,
  learned_at INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (world_id, recipe_id)
);
CREATE TABLE IF NOT EXISTS placed_structures (
  id TEXT PRIMARY KEY,
  world_id TEXT NOT NULL REFERENCES worlds(id) ON DELETE CASCADE,
  grove_id TEXT REFERENCES groves(id) ON DELETE CASCADE,
  x REAL NOT NULL,
  y REAL NOT NULL,
  z REAL NOT NULL,
  type TEXT NOT NULL,
  rotation REAL NOT NULL DEFAULT 0,
  placed_at INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS placed_structures_world_idx
  ON placed_structures(world_id);
CREATE INDEX IF NOT EXISTS placed_structures_grove_idx
  ON placed_structures(grove_id);
CREATE TABLE IF NOT EXISTS dialogue_history (
  world_id TEXT NOT NULL REFERENCES worlds(id) ON DELETE CASCADE,
  npc_id TEXT NOT NULL,
  last_phrase_id TEXT NOT NULL,
  said_at INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (world_id, npc_id)
);
`;

export interface TestDbHandle {
  db: AppDatabase;
  sqlDb: Database;
  close: () => void;
}

export async function createTestDb(): Promise<TestDbHandle> {
  const SQL = await initSqlJs({});
  const sqlDb = new SQL.Database();
  // Enforce FKs so cascade tests actually cascade.
  sqlDb.run("PRAGMA foreign_keys = ON;");
  sqlDb.run(RC_SCHEMA_SQL);
  const db = drizzle(sqlDb, { schema });
  return {
    db,
    sqlDb,
    close: () => sqlDb.close(),
  };
}
