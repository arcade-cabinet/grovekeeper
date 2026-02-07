/**
 * Wild tree regrowth system.
 * When a wild tree is chopped, it leaves a regrow timer.
 * After 3 game-days (in seconds), a new wild tree spawns at stage 2.
 */

export interface RegrowthEntry {
  worldX: number;
  worldZ: number;
  speciesId: string;
  timerSeconds: number;
}

const REGROWTH_TIME = 3 * 24 * 60 * 60; // 3 game-days in seconds

export function createRegrowthEntry(worldX: number, worldZ: number, speciesId: string): RegrowthEntry {
  return { worldX, worldZ, speciesId, timerSeconds: REGROWTH_TIME };
}

/**
 * Advance all regrowth timers. Returns entries that are complete (timer <= 0)
 * and the remaining still-active entries.
 */
export function advanceRegrowthTimers(
  entries: RegrowthEntry[],
  deltaTime: number,
): { completed: RegrowthEntry[]; remaining: RegrowthEntry[] } {
  const completed: RegrowthEntry[] = [];
  const remaining: RegrowthEntry[] = [];

  for (const entry of entries) {
    const updated = { ...entry, timerSeconds: entry.timerSeconds - deltaTime };
    if (updated.timerSeconds <= 0) {
      completed.push(updated);
    } else {
      remaining.push(updated);
    }
  }

  return { completed, remaining };
}

export function getRegrowthTime(): number {
  return REGROWTH_TIME;
}
