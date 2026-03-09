/**
 * tutorial.ts -- Onboarding event bridge.
 * Spec §25.1 Tutorial Village
 *
 * The old 11-step linear overlay tutorial has been replaced by organic
 * quest-driven onboarding via the "elder-awakening" quest chain (see
 * game/quests/data/questChains.json). This file is now a thin event bridge
 * that maps game action signals to quest objective advances so that existing
 * `advanceTutorial(signal)` call sites in actionDispatcher.ts continue to
 * work without modification.
 *
 * There is no overlay UI state. `TutorialState` and `TutorialStepDef` are
 * kept as inert stubs so that imports elsewhere (gameStore, settings.ts)
 * continue to compile without changes.
 *
 * No React, no ECS, no Three.js imports — fully unit-testable.
 */

// ---------------------------------------------------------------------------
// Stub types (kept for backward compatibility — no longer drive overlay UI)
// ---------------------------------------------------------------------------

/** No longer used for overlay rendering. Kept for store type compat. */
export type TutorialStep = "done";

/** No longer used for overlay rendering. Kept for store type compat. */
export interface TutorialState {
  /** Always "done" — the overlay tutorial is retired. */
  currentStep: TutorialStep;
  /** Always true — the overlay tutorial is retired. */
  completed: boolean;
}

/** No longer used. Kept so existing imports compile. */
export interface TutorialStepDef {
  id: TutorialStep;
  signal: string;
  label: string;
}

// ---------------------------------------------------------------------------
// No-op step list (empty — no overlay steps)
// ---------------------------------------------------------------------------

/** No overlay steps remain. Empty array kept for backward compat. */
export const TUTORIAL_STEPS: readonly TutorialStepDef[] = [];

// ---------------------------------------------------------------------------
// Event-to-quest-objective mapping
// ---------------------------------------------------------------------------

/**
 * Map from action signal to quest objective event type for the
 * elder-awakening onboarding chain. Signals that match a key here will be
 * forwarded to the quest engine when `tickTutorial` is called.
 *
 * This map is intentionally minimal — only signals that correspond to real
 * objectives in the elder-awakening quest chain are listed.
 */
export const ONBOARDING_SIGNAL_MAP: Readonly<Record<string, string>> = {
  "action:plant": "trees_planted",
  "action:harvest": "trees_harvested",
  "action:water": "trees_watered",
} as const;

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * Returns the inert tutorial state. The overlay tutorial is retired; the
 * returned object marks the tutorial as immediately complete so no overlay
 * is ever shown.
 */
export function initialTutorialState(): TutorialState {
  return { currentStep: "done", completed: true };
}

// ---------------------------------------------------------------------------
// Pure functions — kept so settings.ts and hook imports compile
// ---------------------------------------------------------------------------

/**
 * No-op: returns null. The overlay tutorial is retired.
 * Kept as bridge stub for backward compat.
 */
export function currentStepDef(_state: TutorialState): TutorialStepDef | null {
  return null;
}

/**
 * No-op: returns null. The overlay tutorial is retired.
 * Kept as bridge stub for backward compat.
 */
export function currentStepLabel(_state: TutorialState): string | null {
  return null;
}

/**
 * Thin event bridge. If `signal` maps to a quest objective event, the caller
 * (settings.ts `advanceTutorial`) is responsible for forwarding to the quest
 * engine. This function itself returns the same state reference unchanged
 * (state machine retired — no state transitions to perform).
 *
 * The signal-to-objective mapping is exposed via `ONBOARDING_SIGNAL_MAP` so
 * `advanceTutorial` in settings.ts can read it without creating a circular
 * dependency.
 */
export function tickTutorial(state: TutorialState, _signal: string): TutorialState {
  // Overlay tutorial is retired. State never changes.
  return state;
}

/**
 * No-op: the tutorial is already always complete.
 * Kept as bridge stub for backward compat.
 */
export function advanceStep(state: TutorialState): TutorialState {
  return state;
}

/**
 * No-op: already complete.
 * Kept as bridge stub for backward compat.
 */
export function skipTutorial(state: TutorialState): TutorialState {
  return state;
}

/**
 * Always returns true — the overlay tutorial is retired and considered
 * perpetually complete.
 */
export function isTutorialComplete(_state: TutorialState): boolean {
  return true;
}
