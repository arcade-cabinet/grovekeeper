/**
 * Chunks repository — sparse player modifications to procgen chunks.
 *
 * Most chunks have no row (pure procgen). A row only appears once the
 * player edits the chunk (places a block, removes a wild tree, etc.).
 * The `modifiedBlocksJson` column carries the diff list; the runtime
 * applies these on top of deterministic procgen output at chunk load.
 */
import { and, eq } from "drizzle-orm";
import type { AppDatabase } from "@/db/client";
import {
  type Chunk,
  type ChunkBlockMod,
  chunks,
  type NewChunk,
} from "@/db/schema/rc";

export function getChunk(
  db: AppDatabase,
  worldId: string,
  chunkX: number,
  chunkZ: number,
): Chunk | null {
  const rows = db
    .select()
    .from(chunks)
    .where(
      and(
        eq(chunks.worldId, worldId),
        eq(chunks.chunkX, chunkX),
        eq(chunks.chunkZ, chunkZ),
      ),
    )
    .all();
  return rows[0] ?? null;
}

export function hasChunk(
  db: AppDatabase,
  worldId: string,
  chunkX: number,
  chunkZ: number,
): boolean {
  return getChunk(db, worldId, chunkX, chunkZ) != null;
}

export function getModifiedBlocks(
  db: AppDatabase,
  worldId: string,
  chunkX: number,
  chunkZ: number,
): ChunkBlockMod[] {
  const chunk = getChunk(db, worldId, chunkX, chunkZ);
  if (!chunk) return [];
  try {
    const parsed = JSON.parse(chunk.modifiedBlocksJson) as unknown;
    return Array.isArray(parsed) ? (parsed as ChunkBlockMod[]) : [];
  } catch {
    return [];
  }
}

/**
 * Append (or overwrite, by coordinate match) a single block mod to a chunk.
 * Creates the chunk row if it doesn't exist yet.
 */
export function applyBlockMod(
  db: AppDatabase,
  worldId: string,
  chunkX: number,
  chunkZ: number,
  biome: string,
  mod: ChunkBlockMod,
): void {
  const existing = getChunk(db, worldId, chunkX, chunkZ);
  const mods = existing
    ? (() => {
        try {
          const parsed = JSON.parse(existing.modifiedBlocksJson) as unknown;
          return Array.isArray(parsed) ? (parsed as ChunkBlockMod[]) : [];
        } catch {
          return [] as ChunkBlockMod[];
        }
      })()
    : [];
  // Replace any prior mod at the same voxel so the latest write wins.
  const filtered = mods.filter(
    (m) => !(m.x === mod.x && m.y === mod.y && m.z === mod.z),
  );
  filtered.push(mod);

  if (existing) {
    db.update(chunks)
      .set({ modifiedBlocksJson: JSON.stringify(filtered) })
      .where(
        and(
          eq(chunks.worldId, worldId),
          eq(chunks.chunkX, chunkX),
          eq(chunks.chunkZ, chunkZ),
        ),
      )
      .run();
  } else {
    const row: NewChunk = {
      worldId,
      chunkX,
      chunkZ,
      biome,
      generatedAt: Date.now(),
      modifiedBlocksJson: JSON.stringify(filtered),
    };
    db.insert(chunks).values(row).run();
  }
}

/** Clear all mods on a chunk (the deterministic procgen output remains canonical). */
export function clearChunkMods(
  db: AppDatabase,
  worldId: string,
  chunkX: number,
  chunkZ: number,
): void {
  db.update(chunks)
    .set({ modifiedBlocksJson: "[]" })
    .where(
      and(
        eq(chunks.worldId, worldId),
        eq(chunks.chunkX, chunkX),
        eq(chunks.chunkZ, chunkZ),
      ),
    )
    .run();
}
