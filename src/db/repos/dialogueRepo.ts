/**
 * Dialogue history repository — last-said tracking for NPC phrase pools.
 *
 * Each NPC has a phrase pool; the gameplay layer wants to avoid playing
 * the same phrase twice in a row. This repo persists the most recent
 * (npcId → phraseId) so the next encounter can sample-without-repeat
 * across sessions.
 */
import { and, eq } from "drizzle-orm";
import type { AppDatabase } from "@/db/client";
import { type DialogueHistoryRow, dialogueHistory } from "@/db/schema/rc";

export function recordPhrase(
  db: AppDatabase,
  worldId: string,
  npcId: string,
  phraseId: string,
  at: number = Date.now(),
): void {
  const existing = getLastPhrase(db, worldId, npcId);
  if (existing) {
    db.update(dialogueHistory)
      .set({ lastPhraseId: phraseId, saidAt: at })
      .where(
        and(
          eq(dialogueHistory.worldId, worldId),
          eq(dialogueHistory.npcId, npcId),
        ),
      )
      .run();
    return;
  }
  db.insert(dialogueHistory)
    .values({ worldId, npcId, lastPhraseId: phraseId, saidAt: at })
    .run();
}

export function getLastPhrase(
  db: AppDatabase,
  worldId: string,
  npcId: string,
): DialogueHistoryRow | null {
  const rows = db
    .select()
    .from(dialogueHistory)
    .where(
      and(
        eq(dialogueHistory.worldId, worldId),
        eq(dialogueHistory.npcId, npcId),
      ),
    )
    .all();
  return rows[0] ?? null;
}

export function clearNpcHistory(
  db: AppDatabase,
  worldId: string,
  npcId: string,
): void {
  db.delete(dialogueHistory)
    .where(
      and(
        eq(dialogueHistory.worldId, worldId),
        eq(dialogueHistory.npcId, npcId),
      ),
    )
    .run();
}
