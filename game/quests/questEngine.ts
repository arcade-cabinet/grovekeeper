/**
 * Quest State Machine -- general-purpose quest lifecycle management.
 *
 * Implements the state transitions defined in GAME_SPEC.md §14:
 *   available -> active -> completed
 *                       -> failed
 *
 * All functions are pure -- they return new quest objects without mutation.
 * This engine is intentionally minimal and type-agnostic -- it handles
 * any quest regardless of category (world, procedural, NPC chain, main).
 */

// -- Types --

export type QuestState = "available" | "active" | "completed" | "failed";

export interface QuestStepDef {
  id: string;
  objectiveText: string;
  targetType: string;
  targetAmount: number;
}

export interface QuestDef {
  id: string;
  title: string;
  description: string;
  steps: QuestStepDef[];
}

export interface QuestStepProgress {
  stepId: string;
  objectiveText: string;
  currentProgress: number;
  targetAmount: number;
  completed: boolean;
}

export interface Quest {
  id: string;
  title: string;
  description: string;
  state: QuestState;
  currentStepIndex: number;
  steps: QuestStepProgress[];
}

// -- Factory --

/** Create a new quest in "available" state from a definition. */
export const createQuest = (def: QuestDef): Quest => ({
  id: def.id,
  title: def.title,
  description: def.description,
  state: "available",
  currentStepIndex: 0,
  steps: def.steps.map(
    (s): QuestStepProgress => ({
      stepId: s.id,
      objectiveText: s.objectiveText,
      currentProgress: 0,
      targetAmount: s.targetAmount,
      completed: false,
    }),
  ),
});

// -- State Transitions --

/** Transition a quest from "available" to "active". Returns the same reference if already active or not available. */
export const startQuest = (quest: Quest): Quest => {
  if (quest.state !== "available") return quest;
  return { ...quest, state: "active" };
};

/** Transition an "active" quest to "failed". Returns the same reference if not active. */
export const failQuest = (quest: Quest): Quest => {
  if (quest.state !== "active") return quest;
  return { ...quest, state: "failed" };
};

// -- Step Tracking --

/** Mark the current step as completed. Returns the same reference if not active. */
export const completeCurrentStep = (quest: Quest): Quest => {
  if (quest.state !== "active") return quest;

  const updatedSteps = quest.steps.map((step, i) =>
    i === quest.currentStepIndex ? { ...step, completed: true } : step,
  );

  return { ...quest, steps: updatedSteps };
};

/**
 * Advance to the next step, or transition to "completed" if all steps are done.
 * Returns the same reference if current step is not completed, or if not active.
 */
export const advanceQuestStep = (quest: Quest): Quest => {
  if (quest.state !== "active") return quest;

  const currentStep = quest.steps[quest.currentStepIndex];
  if (!currentStep?.completed) return quest;

  const nextIndex = quest.currentStepIndex + 1;
  if (nextIndex >= quest.steps.length) {
    return { ...quest, state: "completed" };
  }

  return { ...quest, currentStepIndex: nextIndex };
};

// -- Query Helpers --

/** Get the objective text for the current step, or null if the quest is not active. */
export const getObjectiveText = (quest: Quest): string | null => {
  if (quest.state !== "active") return null;
  return quest.steps[quest.currentStepIndex]?.objectiveText ?? null;
};

/** Returns true if the quest is in the "active" state. */
export const isQuestActive = (quest: Quest): boolean => quest.state === "active";

/** Returns true if the quest is in the "completed" state. */
export const isQuestCompleted = (quest: Quest): boolean => quest.state === "completed";

/** Returns true if the quest is in the "failed" state. */
export const isQuestFailed = (quest: Quest): boolean => quest.state === "failed";
