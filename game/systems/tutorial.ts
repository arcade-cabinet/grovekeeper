/**
 * Tutorial state machine — pure functions for the 11-step guided tutorial.
 * Spec §25.1 Tutorial Village
 *
 * Steps: look → move → equip → dig → plant → water → wait → harvest →
 *        talk → campfire → explore → done
 *
 * State persists via gameStore. Callers dispatch signals via
 * `useGameStore.getState().advanceTutorial(signal)` from game actions.
 *
 * No React, no ECS, no Three.js imports — fully unit-testable.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type TutorialStep =
  | "look"
  | "move"
  | "equip"
  | "dig"
  | "plant"
  | "water"
  | "wait"
  | "harvest"
  | "talk"
  | "campfire"
  | "explore"
  | "done";

export interface TutorialState {
  /** Current step, or "done" if complete or skipped. */
  currentStep: TutorialStep;
  /** True once tutorial has been completed or skipped. Persists across sessions. */
  completed: boolean;
}

export interface TutorialStepDef {
  id: TutorialStep;
  /** Signal string that advances this step when dispatched. */
  signal: string;
  /** Instruction label shown in the overlay. */
  label: string;
}

// ---------------------------------------------------------------------------
// Step definitions — 11 steps in order
// ---------------------------------------------------------------------------

export const TUTORIAL_STEPS: readonly TutorialStepDef[] = [
  {
    id: "look",
    signal: "action:look",
    label: "Look around — swipe or move your mouse",
  },
  {
    id: "move",
    signal: "action:move",
    label: "Move — use the joystick or WASD",
  },
  {
    id: "equip",
    signal: "action:equip",
    label: "Equip a tool from your tool belt",
  },
  {
    id: "dig",
    signal: "action:dig",
    label: "Dig the soil with your equipped tool",
  },
  {
    id: "plant",
    signal: "action:plant",
    label: "Plant a seed in the prepared soil",
  },
  {
    id: "water",
    signal: "action:water",
    label: "Water the seedling",
  },
  {
    id: "wait",
    signal: "action:wait",
    label: "Wait for the seedling to sprout...",
  },
  {
    id: "harvest",
    signal: "action:harvest",
    label: "Harvest the grown tree",
  },
  {
    id: "talk",
    signal: "action:talk",
    label: "Talk to a villager",
  },
  {
    id: "campfire",
    signal: "action:campfire",
    label: "Rest at the campfire",
  },
  {
    id: "explore",
    signal: "action:explore",
    label: "Explore beyond the village gate",
  },
];

/** Ordered step IDs including sentinel "done" at the end. */
const STEP_ORDER: readonly TutorialStep[] = [
  "look",
  "move",
  "equip",
  "dig",
  "plant",
  "water",
  "wait",
  "harvest",
  "talk",
  "campfire",
  "explore",
  "done",
];

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export function initialTutorialState(): TutorialState {
  return { currentStep: "look", completed: false };
}

// ---------------------------------------------------------------------------
// Pure state machine functions
// ---------------------------------------------------------------------------

/**
 * Returns the step definition for the current step, or null if done/skipped.
 */
export function currentStepDef(state: TutorialState): TutorialStepDef | null {
  if (state.completed || state.currentStep === "done") return null;
  return TUTORIAL_STEPS.find((s) => s.id === state.currentStep) ?? null;
}

/**
 * Returns the instruction label for the current step, or null if done.
 */
export function currentStepLabel(state: TutorialState): string | null {
  return currentStepDef(state)?.label ?? null;
}

/**
 * Advance to the next step if the given signal matches the current step's
 * expected signal. Returns the same state reference if the signal does not
 * match or the tutorial is already complete.
 */
export function tickTutorial(state: TutorialState, signal: string): TutorialState {
  if (state.completed || state.currentStep === "done") return state;

  const stepDef = TUTORIAL_STEPS.find((s) => s.id === state.currentStep);
  if (!stepDef || stepDef.signal !== signal) return state;

  return advanceStep(state);
}

/**
 * Unconditionally advance to the next step. Returns { currentStep: "done",
 * completed: true } when called on the last step.
 */
export function advanceStep(state: TutorialState): TutorialState {
  const currentIndex = STEP_ORDER.indexOf(state.currentStep);
  if (currentIndex === -1 || currentIndex >= STEP_ORDER.length - 1) {
    return { currentStep: "done", completed: true };
  }
  const nextStep = STEP_ORDER[currentIndex + 1];
  const completed = nextStep === "done";
  return { currentStep: nextStep, completed };
}

/**
 * Skip the tutorial entirely. Idempotent.
 */
export function skipTutorial(_state: TutorialState): TutorialState {
  return { currentStep: "done", completed: true };
}

/**
 * Returns true if the tutorial is complete (all steps done or skipped).
 */
export function isTutorialComplete(state: TutorialState): boolean {
  return state.completed || state.currentStep === "done";
}
