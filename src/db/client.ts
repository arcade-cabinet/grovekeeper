/**
 * Database client singleton.
 *
 * Provides getDb() (sync) and getDbAsync() — the latter is the entry point
 * application code SHOULD use. On first call it transparently initialises:
 *
 *   - web   → sql.js + IndexedDB persistence (existing path)
 *   - test  → sql.js in-memory (no IndexedDB)
 *   - iOS / Android (Capacitor) → sql.js inside the webview + IndexedDB.
 *     We keep sql.js as the single SQL engine on every platform so drizzle
 *     has one stable runtime. On native, the WebView's IndexedDB is backed
 *     by WKWebView/Chromium storage, durable across app restarts.
 *     `@capacitor-community/sqlite` is installed and ready to swap in if we
 *     ever need true native sqlite (e.g. for cross-app data integrity), but
 *     application code never needs to know which path was taken.
 *
 * Pattern follows ../mean-streets's lazy memoised connection promise +
 * write-lock queue (see withDatabaseWriteLock below).
 */

import type { SQLJsDatabase } from "drizzle-orm/sql-js";
import { drizzle } from "drizzle-orm/sql-js";
import type { Database } from "sql.js";
import * as schema from "./schema";

export type AppDatabase = SQLJsDatabase<typeof schema>;

let db: AppDatabase | null = null;
let sqlDb: Database | null = null;
let initPromise: Promise<{ db: AppDatabase; sqlDb: Database }> | null = null;
let writeQueue: Promise<unknown> = Promise.resolve();

/**
 * Set the singleton database instances. Called by initDatabase().
 */
export function setDb(drizzleDb: AppDatabase, rawDb: Database): void {
  db = drizzleDb;
  sqlDb = rawDb;
}

/**
 * Get the current database singleton. Throws if not yet initialized.
 *
 * Prefer getDbAsync() in new code — it triggers initialisation if needed.
 * getDb() exists for hot-path call sites (per-frame systems) where the
 * caller is contractually after init has already run.
 */
export function getDb(): { db: AppDatabase; sqlDb: Database } {
  if (!db || !sqlDb) {
    throw new Error("Database not initialized. Call initDatabase() first.");
  }
  return { db, sqlDb };
}

/**
 * Lazy async accessor — initialises the database on first call, memoises the
 * promise so repeat callers all wait on the same init. Use this from app
 * boot / tests; per-frame code should already have initialised via getDb().
 */
export async function getDbAsync(): Promise<{
  db: AppDatabase;
  sqlDb: Database;
}> {
  if (db && sqlDb) return { db, sqlDb };
  if (!initPromise) {
    initPromise = (async () => {
      // dynamic import to avoid pulling sql.js init code into hot paths
      const { initDatabase } = await import("./init");
      await initDatabase();
      if (!db || !sqlDb) {
        throw new Error("initDatabase() did not set the singleton");
      }
      return { db, sqlDb };
    })().catch((err) => {
      initPromise = null;
      throw err;
    });
  }
  return initPromise;
}

/**
 * Check if the database has been initialized.
 */
export function isDbInitialized(): boolean {
  return db !== null && sqlDb !== null;
}

/**
 * Reset the singleton (test-only). Allows tests to spin up isolated DBs.
 */
export function __resetDbForTests(): void {
  db = null;
  sqlDb = null;
  initPromise = null;
  writeQueue = Promise.resolve();
}

/**
 * Create a Drizzle instance from a raw sql.js database.
 */
export function createDrizzleDb(rawDb: Database): AppDatabase {
  return drizzle(rawDb, { schema });
}

/**
 * Serialise concurrent writers — pattern from mean-streets `withDatabaseWriteLock`.
 * Reads can run concurrently; structural mutations (CREATE/INSERT/UPDATE/DELETE)
 * should run inside this lock so two writers don't step on each other while
 * the IndexedDB persist tick is in flight.
 */
export async function withDatabaseWriteLock<T>(
  action: (handle: { db: AppDatabase; sqlDb: Database }) => Promise<T>,
): Promise<T> {
  const prior = writeQueue.catch(() => undefined);
  const next = prior.then(async () => {
    const handle = await getDbAsync();
    return action(handle);
  });
  writeQueue = next.catch(() => undefined);
  return next;
}
