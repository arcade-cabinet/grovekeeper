/**
 * Database client singleton.
 *
 * Provides getDb() which returns the Drizzle instance and the underlying
 * sql.js Database. Lazily initialized by initDatabase().
 */
import { drizzle } from "drizzle-orm/sql-js";
import type { SQLJsDatabase } from "drizzle-orm/sql-js";
import type { Database } from "sql.js";
import * as schema from "./schema";

export type AppDatabase = SQLJsDatabase<typeof schema>;

let db: AppDatabase | null = null;
let sqlDb: Database | null = null;

/**
 * Set the singleton database instances. Called by initDatabase().
 */
export function setDb(drizzleDb: AppDatabase, rawDb: Database): void {
  db = drizzleDb;
  sqlDb = rawDb;
}

/**
 * Get the current database singleton. Throws if not yet initialized.
 */
export function getDb(): { db: AppDatabase; sqlDb: Database } {
  if (!db || !sqlDb) {
    throw new Error("Database not initialized. Call initDatabase() first.");
  }
  return { db, sqlDb };
}

/**
 * Check if the database has been initialized.
 */
export function isDbInitialized(): boolean {
  return db !== null && sqlDb !== null;
}

/**
 * Create a Drizzle instance from a raw sql.js database.
 */
export function createDrizzleDb(rawDb: Database): AppDatabase {
  return drizzle(rawDb, { schema });
}
