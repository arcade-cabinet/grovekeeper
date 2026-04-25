/**
 * Groves repository — discovery + claim lifecycle.
 *
 * A grove enters the table in `discovered` state when the player first
 * walks into the chunk. `claimGrove` flips it to `claimed`; double-claim
 * is idempotent (no-op, no throw — the spec calls for cinematic moments
 * to be invariant under retries).
 */
import { and, eq } from "drizzle-orm";
import type { AppDatabase } from "@/db/client";
import {
  type Grove,
  type GroveState,
  groves,
  type NewGrove,
} from "@/db/schema/rc";

export function discoverGrove(
  db: AppDatabase,
  input: Omit<NewGrove, "state" | "discoveredAt"> & {
    discoveredAt?: number;
  },
): Grove {
  const existing = getGroveAt(db, input.worldId, input.chunkX, input.chunkZ);
  if (existing) return existing;

  const row: NewGrove = {
    state: "discovered",
    discoveredAt: input.discoveredAt ?? Date.now(),
    ...input,
  };
  db.insert(groves).values(row).run();
  const created = getGroveById(db, input.id);
  if (!created) throw new Error("discoverGrove: insert lost");
  return created;
}

export function claimGrove(
  db: AppDatabase,
  groveId: string,
  at: number = Date.now(),
): Grove {
  const grove = getGroveById(db, groveId);
  if (!grove) throw new Error(`claimGrove: grove ${groveId} not found`);
  if (grove.state === "claimed") return grove; // idempotent

  db.update(groves)
    .set({ state: "claimed", claimedAt: at })
    .where(eq(groves.id, groveId))
    .run();
  return { ...grove, state: "claimed", claimedAt: at };
}

export function lightHearth(
  db: AppDatabase,
  groveId: string,
  at: number = Date.now(),
): Grove {
  const grove = getGroveById(db, groveId);
  if (!grove) throw new Error(`lightHearth: grove ${groveId} not found`);
  // Idempotent: lighting an already-lit hearth is a no-op (spec: cinematic
  // state must not flicker if the player triggers it twice).
  if (grove.hearthLitAt != null) return grove;

  db.update(groves)
    .set({ hearthLitAt: at })
    .where(eq(groves.id, groveId))
    .run();
  return { ...grove, hearthLitAt: at };
}

export function getGroveById(db: AppDatabase, id: string): Grove | null {
  const rows = db.select().from(groves).where(eq(groves.id, id)).all();
  return rows[0] ?? null;
}

export function getGroveAt(
  db: AppDatabase,
  worldId: string,
  chunkX: number,
  chunkZ: number,
): Grove | null {
  const rows = db
    .select()
    .from(groves)
    .where(
      and(
        eq(groves.worldId, worldId),
        eq(groves.chunkX, chunkX),
        eq(groves.chunkZ, chunkZ),
      ),
    )
    .all();
  return rows[0] ?? null;
}

export function listGrovesByWorld(
  db: AppDatabase,
  worldId: string,
  state?: GroveState,
): Grove[] {
  const where = state
    ? and(eq(groves.worldId, worldId), eq(groves.state, state))
    : eq(groves.worldId, worldId);
  return db.select().from(groves).where(where).all();
}
