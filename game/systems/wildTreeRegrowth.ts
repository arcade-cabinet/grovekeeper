/**
 * Wild Tree Regrowth -- respawn timers for wild (non-player) trees.
 * NO external imports.
 */

// ── Types ────────────────────────────────────────────────────────────────────

export interface RegrowthTimer {
  gridX: number;
  gridZ: number;
  speciesId: string;
  expiresAtDay: number;
}

export interface RegrowthState {
  timers: RegrowthTimer[];
}

// ── Constants ────────────────────────────────────────────────────────────────

const DEFAULT_REGROWTH_DAYS = 7;

// ── Public API ───────────────────────────────────────────────────────────────

/** Create an empty regrowth state. */
export function initializeRegrowthState(): RegrowthState {
  return { timers: [] };
}

/** Schedule a wild tree to regrow after a delay. */
export function scheduleRegrowth(
  state: RegrowthState,
  gridX: number,
  gridZ: number,
  speciesId: string,
  currentDay: number,
  delayDays: number = DEFAULT_REGROWTH_DAYS,
): RegrowthState {
  return {
    timers: [
      ...state.timers,
      { gridX, gridZ, speciesId, expiresAtDay: currentDay + delayDays },
    ],
  };
}

/**
 * Check for expired timers (trees ready to regrow).
 * Returns the timers that have expired and the updated state with those removed.
 */
export function checkRegrowth(
  state: RegrowthState,
  currentDay: number,
): { expired: RegrowthTimer[]; state: RegrowthState } {
  const expired: RegrowthTimer[] = [];
  const remaining: RegrowthTimer[] = [];

  for (const timer of state.timers) {
    if (currentDay >= timer.expiresAtDay) {
      expired.push(timer);
    } else {
      remaining.push(timer);
    }
  }

  if (expired.length === 0) return { expired, state };

  return { expired, state: { timers: remaining } };
}

/** Cancel a regrowth timer at a specific position. */
export function cancelRegrowth(
  state: RegrowthState,
  gridX: number,
  gridZ: number,
): RegrowthState {
  const filtered = state.timers.filter(
    (t) => t.gridX !== gridX || t.gridZ !== gridZ,
  );
  if (filtered.length === state.timers.length) return state;
  return { timers: filtered };
}
