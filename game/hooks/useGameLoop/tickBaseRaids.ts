/**
 * tickBaseRaids -- checks raid eligibility on day change in Survival mode.
 *
 * Wires `game/systems/baseRaids.ts` into the game loop. Spec §18.5, §34.
 *
 * Raid flow:
 *   1. On day change, check if survival mode is active.
 *   2. If a DayNight ECS entity exists and it's night, roll raid probability.
 *   3. If a raid triggers, generate waves and store them for the combat pipeline.
 *   4. Enforce minimum 3-day gap between raids.
 *
 * The actual enemy spawning from raid waves is handled by the combat pipeline
 * (EnemyEntityManager). This tick only DECIDES whether a raid occurs and
 * populates the raid state.
 */

import { dayNightQuery } from "@/game/ecs/world";
import { useGameStore } from "@/game/stores";
import {
  calculateRaidProbability,
  generateRaidWave,
  getRaidWarning,
  type RaidEvent,
  shouldTriggerRaid,
} from "@/game/systems/baseRaids";
import { scopedRNG } from "@/game/utils/seedWords";

/** Minimum number of game days between raids. */
const RAID_COOLDOWN_DAYS = 3;

/** Module-level raid state tracked across frames. */
let lastRaidDay = -999;
let activeRaid: RaidEvent | null = null;
let raidCountdownSeconds = 0;

/** Reset raid state (for tests or new game). */
export function resetRaidState(): void {
  lastRaidDay = -999;
  activeRaid = null;
  raidCountdownSeconds = 0;
}

/**
 * Called once per day change from the game loop.
 * Checks whether a raid should trigger this night.
 */
export function tickBaseRaids(dayNumber: number, affectsGameplay: boolean): void {
  if (!affectsGameplay) return;

  // Enforce cooldown between raids
  if (dayNumber - lastRaidDay < RAID_COOLDOWN_DAYS) return;

  // Need DayNight ECS entity to check time of day
  const dayNightEntities = dayNightQuery.entities;
  if (dayNightEntities.length === 0) return;
  const dayNight = dayNightEntities[0].dayNight;
  if (!dayNight) return;

  if (!shouldTriggerRaid(dayNight, affectsGameplay)) return;

  const store = useGameStore.getState();
  const worldSeed = store.worldSeed || "default";

  // Calculate base value from placed structures
  const baseValue = store.placedStructures?.length ?? 0;

  const raidProb = calculateRaidProbability(baseValue, dayNumber, store.difficulty);

  // Use seeded RNG for the raid roll
  const rng = scopedRNG("raid-roll", worldSeed, dayNumber);
  if (rng() > raidProb) return;

  // Raid triggered!
  activeRaid = generateRaidWave(baseValue, dayNumber, worldSeed);
  lastRaidDay = dayNumber;
  raidCountdownSeconds = 120; // 2 minute warning period
}

/**
 * Per-frame tick for active raid countdown and warnings.
 * Called every frame when a raid is pending.
 */
export function tickRaidCountdown(dt: number): string | null {
  if (!activeRaid || raidCountdownSeconds <= 0) return null;

  raidCountdownSeconds -= dt;

  const warning = getRaidWarning(raidCountdownSeconds);

  if (raidCountdownSeconds <= 0) {
    // Raid starts now -- the combat pipeline reads activeRaid
    raidCountdownSeconds = 0;
  }

  return warning;
}

/** Get the current active raid event, if any. */
export function getActiveRaid(): RaidEvent | null {
  return activeRaid;
}

/** Clear the active raid (called when raid is defeated or timed out). */
export function clearActiveRaid(): void {
  activeRaid = null;
  raidCountdownSeconds = 0;
}
