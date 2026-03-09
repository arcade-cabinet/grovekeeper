/**
 * NPC Schedule system (Spec §19.5).
 *
 * NPCs follow daily routines driven by NpcScheduleEntry[]. Each entry
 * specifies the hour at which the NPC moves to a new position and
 * adopts a new activity/animation state.
 *
 * Dawn/Day/Dusk/Night locations per NPC. Movement is delegated to
 * startNpcPath from npcMovement.ts.
 *
 * Pure functions (resolveScheduleEntry, activityToAnimState,
 * isAtPosition) plus thin stateful layer (tickNpcSchedule) that
 * tracks last-triggered schedule slot per NPC entity ID.
 */

import type { NpcAnimState, NpcScheduleEntry } from "@/game/ecs/components/npc";
import { startNpcPath } from "@/game/systems/npcMovement";
import type { WalkabilityGrid } from "@/game/systems/pathfinding";

// ── Module state ─────────────────────────────────────────────────────────────

/**
 * Tracks the `hour` value of the last-triggered schedule entry per NPC.
 * Used to detect slot transitions and avoid re-triggering movement every tick.
 */
const scheduleState = new Map<string, number>();

// ── Pure helpers ─────────────────────────────────────────────────────────────

/**
 * Resolve the active NpcScheduleEntry for a given hour (0–23).
 *
 * Returns the last entry whose `hour <= currentHour`. If the current hour
 * precedes the first scheduled entry (overnight wrap), returns the last
 * entry in the schedule (the night slot).
 *
 * Returns undefined if the schedule is empty.
 */
export function resolveScheduleEntry(
  schedule: NpcScheduleEntry[],
  hour: number,
): NpcScheduleEntry | undefined {
  if (schedule.length === 0) return undefined;

  // Sort ascending by hour — schedule may not be pre-sorted
  const sorted = [...schedule].sort((a, b) => a.hour - b.hour);

  // Find the last entry whose hour <= currentHour
  let active: NpcScheduleEntry | undefined;
  for (const entry of sorted) {
    if (entry.hour <= hour) {
      active = entry;
    }
  }

  // Overnight wrap: hour is before the first entry → use last entry
  if (active === undefined) {
    active = sorted[sorted.length - 1];
  }

  return active;
}

/**
 * Map an NPC activity string to an NpcAnimState.
 *
 * Known mappings: "sleep" → "sleep", "walk" → "walk",
 * "talk" → "talk", "work" → "work". All other activities → "idle".
 */
export function activityToAnimState(activity: string): NpcAnimState {
  switch (activity) {
    case "sleep":
      return "sleep";
    case "walk":
      return "walk";
    case "talk":
      return "talk";
    case "work":
      return "work";
    default:
      return "idle";
  }
}

/**
 * Check if an NPC is close enough to a target position to be considered
 * "arrived". Default tolerance is 0.5 world units (Chebyshev-aligned).
 */
export function isAtPosition(
  currentX: number,
  currentZ: number,
  targetX: number,
  targetZ: number,
  tolerance = 0.5,
): boolean {
  return Math.hypot(currentX - targetX, currentZ - targetZ) <= tolerance;
}

// ── Stateful tick ─────────────────────────────────────────────────────────────

export interface ScheduleTickResult {
  /** Whether movement was triggered this tick (startNpcPath returned true). */
  triggered: boolean;
  /** Animation state for the active schedule entry. */
  animState: NpcAnimState;
  /** Target X from the active schedule entry. */
  targetX: number;
  /** Target Z from the active schedule entry. */
  targetZ: number;
}

/**
 * Tick the schedule for one NPC.
 *
 * - Resolves the active NpcScheduleEntry for the current hour.
 * - If the active slot changed since the last tick, triggers pathfinding
 *   movement via startNpcPath.
 * - Returns the animation state for the current activity so callers can
 *   update the NPC entity's `currentAnim`.
 *
 * Call once per game tick per NPC entity.
 */
export function tickNpcSchedule(
  schedule: NpcScheduleEntry[],
  entityId: string,
  currentX: number,
  currentZ: number,
  hour: number,
  grid: WalkabilityGrid,
): ScheduleTickResult {
  const entry = resolveScheduleEntry(schedule, hour);

  if (!entry) {
    return {
      triggered: false,
      animState: "idle",
      targetX: currentX,
      targetZ: currentZ,
    };
  }

  const animState = activityToAnimState(entry.activity);
  const lastHour = scheduleState.get(entityId);

  // Trigger movement only when the schedule slot changes
  if (lastHour !== entry.hour) {
    scheduleState.set(entityId, entry.hour);
    const moved = startNpcPath(
      entityId,
      currentX,
      currentZ,
      entry.position.x,
      entry.position.z,
      grid,
    );
    return {
      triggered: moved,
      animState,
      targetX: entry.position.x,
      targetZ: entry.position.z,
    };
  }

  return {
    triggered: false,
    animState,
    targetX: entry.position.x,
    targetZ: entry.position.z,
  };
}

// ── State management ──────────────────────────────────────────────────────────

/** Clear schedule tracking state for one NPC. Call when an NPC is unloaded. */
export function clearScheduleState(entityId: string): void {
  scheduleState.delete(entityId);
}

/** Clear all NPC schedule states. Call on scene dispose or game reset. */
export function clearAllScheduleStates(): void {
  scheduleState.clear();
}
