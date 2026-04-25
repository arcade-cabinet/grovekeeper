/**
 * Worlds repository — CRUD over the `worlds` table.
 *
 * Pure data layer: no business logic, no audio, no UI side-effects. All
 * functions take the drizzle handle so callers can compose them inside
 * a transaction or write-lock.
 */
import { desc, eq } from "drizzle-orm";
import type { AppDatabase } from "@/db/client";
import { type NewWorld, type World, worlds } from "@/db/schema/rc";

export function createWorld(db: AppDatabase, world: NewWorld): World {
  const now = Date.now();
  const row: NewWorld = {
    createdAt: now,
    lastPlayedAt: now,
    ...world,
  };
  db.insert(worlds).values(row).run();
  const created = getWorld(db, row.id);
  if (!created)
    throw new Error("createWorld: insert succeeded but row missing");
  return created;
}

export function getWorld(db: AppDatabase, id: string): World | null {
  const rows = db.select().from(worlds).where(eq(worlds.id, id)).all();
  return rows[0] ?? null;
}

export function listWorlds(db: AppDatabase): World[] {
  return db.select().from(worlds).orderBy(desc(worlds.lastPlayedAt)).all();
}

export function deleteWorld(db: AppDatabase, id: string): void {
  db.delete(worlds).where(eq(worlds.id, id)).run();
}

export function updateLastPlayed(
  db: AppDatabase,
  id: string,
  at: number = Date.now(),
): void {
  db.update(worlds).set({ lastPlayedAt: at }).where(eq(worlds.id, id)).run();
}

export function renameWorld(db: AppDatabase, id: string, name: string): void {
  db.update(worlds).set({ name }).where(eq(worlds.id, id)).run();
}
