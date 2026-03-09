/**
 * FishingPanel pure display helpers — Spec §44.
 *
 * Extracted to a plain .ts file (no JSX) so Jest can import them
 * without triggering the react-native-css-interop JSX runtime chain.
 */

import type { FishingPhase } from "@/game/systems/fishing";

// ---------------------------------------------------------------------------
// Phase display text
// ---------------------------------------------------------------------------

const PHASE_TEXT: Record<FishingPhase, string> = {
  idle: "Cast your line!",
  casting: "Casting...",
  waiting: "Waiting for a bite...",
  biting: "A fish is biting! Tap now!",
  minigame: "Hit the zone!",
  caught: "Caught a fish!",
  escaped: "The fish escaped!",
};

/**
 * Returns a human-readable label for the current fishing phase.
 */
export function getPhaseText(phase: FishingPhase): string {
  return PHASE_TEXT[phase] ?? "...";
}

// ---------------------------------------------------------------------------
// Timing bar display
// ---------------------------------------------------------------------------

/**
 * Returns whether the timing bar should be visible.
 * Only shown during the minigame phase.
 */
export function isTimingBarVisible(phase: FishingPhase): boolean {
  return phase === "minigame";
}

/**
 * Returns whether the action button should be enabled.
 * Enabled during biting (respond to bite) and minigame (hit zone).
 */
export function isActionEnabled(phase: FishingPhase): boolean {
  return phase === "biting" || phase === "minigame";
}

/**
 * Returns whether the fishing session has ended (caught or escaped).
 */
export function isSessionComplete(phase: FishingPhase): boolean {
  return phase === "caught" || phase === "escaped";
}

/**
 * Compute the percentage fill for the wait indicator.
 * Returns 0 during non-waiting phases.
 */
export function computeWaitProgress(
  phase: FishingPhase,
  elapsed: number,
  waitDuration: number,
): number {
  if (phase !== "waiting" || waitDuration <= 0) return 0;
  return Math.min(1, elapsed / waitDuration);
}

/**
 * Compute the percentage fill for the bite timer.
 * Returns 0 during non-biting phases.
 */
export function computeBiteUrgency(
  phase: FishingPhase,
  elapsed: number,
  biteDuration: number,
): number {
  if (phase !== "biting" || biteDuration <= 0) return 0;
  return Math.min(1, elapsed / biteDuration);
}
