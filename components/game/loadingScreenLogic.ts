/**
 * Pure logic for the LoadingScreen component (Spec §1.3).
 *
 * Extracted to a plain .ts file so it can be unit-tested without pulling in
 * the React Native JSX runtime chain (which crashes in Jest).
 *
 * 4-phase loading: fonts -> store init -> world gen -> first frame
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** 0 = idle (not started), 1-4 = loading phases, 4 = complete */
export type LoadingPhase = 0 | 1 | 2 | 3 | 4;

// ---------------------------------------------------------------------------
// Phase labels
// ---------------------------------------------------------------------------

const PHASE_LABELS: Record<LoadingPhase, string> = {
  0: "Preparing...",
  1: "Loading fonts...",
  2: "Initializing grove...",
  3: "Generating world...",
  4: "Ready!",
};

/** Returns the human-readable label for a loading phase. */
export function getPhaseLabel(phase: LoadingPhase): string {
  return PHASE_LABELS[phase];
}

// ---------------------------------------------------------------------------
// Progress percentage
// ---------------------------------------------------------------------------

/** Returns the progress bar fill as 0–100 for the given phase. */
export function getProgressPercent(phase: LoadingPhase): number {
  return (phase / 4) * 100;
}

// ---------------------------------------------------------------------------
// Loading tips
// ---------------------------------------------------------------------------

export const LOADING_TIPS: readonly string[] = [
  "Trees take time to grow. Your grove is no different.",
  "Watering in the morning gives the best growth bonus.",
  "Different seasons unlock different tree species.",
  "Prune old branches to redirect energy to new growth.",
  "Trade surplus resources with visiting merchants.",
  "Grovekeeper spirits hold ancient secrets of the forest.",
  "A well-tended grove attracts more visitors over time.",
  "Your seed phrase shapes the entire world layout.",
  "Different species thrive in different biomes.",
  "Stamina regenerates over time — rest between sessions.",
];

/**
 * Returns the tip at the given index, wrapping around the array.
 * Index is modulo-safe — any non-negative integer works.
 */
export function getTip(index: number): string {
  const i = ((index % LOADING_TIPS.length) + LOADING_TIPS.length) % LOADING_TIPS.length;
  return LOADING_TIPS[i];
}

/** Returns the number of tips available. */
export function tipCount(): number {
  return LOADING_TIPS.length;
}
