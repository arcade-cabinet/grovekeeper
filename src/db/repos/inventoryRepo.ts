/**
 * Inventory repository — per-world item counts.
 *
 * Cap-aware add/remove are NOT implemented here — that's the inventory
 * gameplay system's job. This repo is pure storage.
 */
import { and, eq, sql } from "drizzle-orm";
import type { AppDatabase } from "@/db/client";
import { type InventoryRow, inventory } from "@/db/schema/rc";

export function getItemCount(
  db: AppDatabase,
  worldId: string,
  itemId: string,
): number {
  const rows = db
    .select()
    .from(inventory)
    .where(and(eq(inventory.worldId, worldId), eq(inventory.itemId, itemId)))
    .all();
  return rows[0]?.count ?? 0;
}

export function listItems(db: AppDatabase, worldId: string): InventoryRow[] {
  return db
    .select()
    .from(inventory)
    .where(eq(inventory.worldId, worldId))
    .all();
}

/**
 * Add `amount` to the count for (worldId, itemId), creating the row if needed.
 * Negative amounts are allowed; the caller is responsible for floor-clamping.
 * Returns the new count.
 */
export function addItem(
  db: AppDatabase,
  worldId: string,
  itemId: string,
  amount: number,
): number {
  const current = getItemCount(db, worldId, itemId);
  const next = current + amount;
  if (current === 0 && amount > 0) {
    db.insert(inventory).values({ worldId, itemId, count: next }).run();
    return next;
  }
  db.update(inventory)
    .set({ count: sql`${inventory.count} + ${amount}` })
    .where(and(eq(inventory.worldId, worldId), eq(inventory.itemId, itemId)))
    .run();
  return next;
}

/**
 * Remove `amount` from the item count. Floors at zero (a no-op when count is
 * already zero). Returns the new count.
 */
export function removeItem(
  db: AppDatabase,
  worldId: string,
  itemId: string,
  amount: number,
): number {
  const current = getItemCount(db, worldId, itemId);
  if (current === 0) return 0;
  const next = Math.max(0, current - amount);
  db.update(inventory)
    .set({ count: next })
    .where(and(eq(inventory.worldId, worldId), eq(inventory.itemId, itemId)))
    .run();
  return next;
}

export function setItemCount(
  db: AppDatabase,
  worldId: string,
  itemId: string,
  count: number,
): void {
  const clamped = Math.max(0, Math.floor(count));
  const current = getItemCount(db, worldId, itemId);
  if (current === 0 && clamped > 0) {
    db.insert(inventory).values({ worldId, itemId, count: clamped }).run();
    return;
  }
  db.update(inventory)
    .set({ count: clamped })
    .where(and(eq(inventory.worldId, worldId), eq(inventory.itemId, itemId)))
    .run();
}
