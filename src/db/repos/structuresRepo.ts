/**
 * Placed-structures repository — building placement persistence.
 *
 * Structures can be placed inside a grove (groveId set) or unbound (groveId
 * null) for systems like a hearth that's diegetically anchored to the grove
 * vs. a fence segment that floats in the wider world. Cascade-deletes follow
 * the FK to worlds and groves.
 */
import { eq } from "drizzle-orm";
import type { AppDatabase } from "@/db/client";
import {
  type NewPlacedStructure,
  type PlacedStructure,
  placedStructures,
} from "@/db/schema/rc";

export function placeStructure(
  db: AppDatabase,
  input: NewPlacedStructure,
): PlacedStructure {
  const row: NewPlacedStructure = {
    placedAt: input.placedAt ?? Date.now(),
    ...input,
  };
  db.insert(placedStructures).values(row).run();
  const created = getStructureById(db, row.id);
  if (!created)
    throw new Error("placeStructure: insert succeeded but row missing");
  return created;
}

export function removeStructure(db: AppDatabase, id: string): void {
  db.delete(placedStructures).where(eq(placedStructures.id, id)).run();
}

export function getStructureById(
  db: AppDatabase,
  id: string,
): PlacedStructure | null {
  const rows = db
    .select()
    .from(placedStructures)
    .where(eq(placedStructures.id, id))
    .all();
  return rows[0] ?? null;
}

export function listStructuresInGrove(
  db: AppDatabase,
  groveId: string,
): PlacedStructure[] {
  return db
    .select()
    .from(placedStructures)
    .where(eq(placedStructures.groveId, groveId))
    .all();
}

export function listStructuresInWorld(
  db: AppDatabase,
  worldId: string,
): PlacedStructure[] {
  return db
    .select()
    .from(placedStructures)
    .where(eq(placedStructures.worldId, worldId))
    .all();
}
