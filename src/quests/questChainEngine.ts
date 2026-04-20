/**
 * Quest Chain Engine — pure functions for NPC-driven narrative quest progression.
 *
 * Quest chains are multi-step story arcs tied to NPCs. This engine handles:
 * - Chain availability (level gates, prerequisite chains)
 * - Step progression (objective tracking, completion detection)
 * - Reward computation
 *
 * All functions are pure — they return new state objects without side effects.
 * The game loop (GameScene.tsx) and store (gameStore.ts) are responsible for
 * calling these functions and applying results.
 */

import chainData from "./data/questChains.json";
import type {
  ChainProgress,
  ChainStepProgress,
  ObjectiveProgress,
  QuestChainDef,
  QuestChainState,
  QuestChainStepDef,
} from "./types";

// ── Data Loading ──────────────────────────────────────────────────────

const chainMap = new Map<string, QuestChainDef>();
for (const chain of chainData as QuestChainDef[]) {
  chainMap.set(chain.id, chain);
}

/** Get a quest chain definition by ID. */
export const getChainDef = (chainId: string): QuestChainDef | undefined =>
  chainMap.get(chainId);

/** Get all quest chain definitions. */
export const getAllChainDefs = (): QuestChainDef[] =>
  chainData as QuestChainDef[];

// ── State Initialization ──────────────────────────────────────────────

/** Create a fresh quest chain state with no active chains. */
export const initializeChainState = (): QuestChainState => ({
  activeChains: {},
  completedChainIds: [],
  availableChainIds: [],
});

// ── Chain Availability ────────────────────────────────────────────────

/**
 * Compute which chains are available to start based on level and prerequisites.
 * Does not include already-active or completed chains.
 */
export const computeAvailableChains = (
  state: QuestChainState,
  playerLevel: number,
): string[] => {
  const available: string[] = [];

  for (const chain of chainData as QuestChainDef[]) {
    // Skip already active or completed
    if (
      state.activeChains[chain.id] ||
      state.completedChainIds.includes(chain.id)
    ) {
      continue;
    }

    // Level gate
    if (playerLevel < chain.requiredLevel) continue;

    // Prerequisite chains must be completed
    if (chain.prerequisiteChainIds) {
      const allPrereqsMet = chain.prerequisiteChainIds.every((id) =>
        state.completedChainIds.includes(id),
      );
      if (!allPrereqsMet) continue;
    }

    available.push(chain.id);
  }

  return available;
};

// ── Chain Activation ──────────────────────────────────────────────────

/** Start a quest chain, creating initial progress for step 0. */
export const startChain = (
  state: QuestChainState,
  chainId: string,
  currentDay: number,
): QuestChainState => {
  const def = chainMap.get(chainId);
  if (!def || state.activeChains[chainId]) return state;

  const firstStep = def.steps[0];
  if (!firstStep) return state;

  const stepProgress = createStepProgress(firstStep);

  const chainProgress: ChainProgress = {
    chainId,
    currentStepIndex: 0,
    steps: [stepProgress],
    completed: false,
    startedDay: currentDay,
  };

  return {
    ...state,
    activeChains: { ...state.activeChains, [chainId]: chainProgress },
    availableChainIds: state.availableChainIds.filter((id) => id !== chainId),
  };
};

// ── Objective Progress ────────────────────────────────────────────────

/**
 * Update objective progress for all active chains matching an event type.
 * Returns updated state and a list of any newly completed steps.
 */
export const advanceObjectives = (
  state: QuestChainState,
  eventType: string,
  amount: number = 1,
): {
  state: QuestChainState;
  completedSteps: { chainId: string; stepId: string }[];
} => {
  const completedSteps: { chainId: string; stepId: string }[] = [];
  let changed = false;
  const updatedChains = { ...state.activeChains };

  for (const [chainId, progress] of Object.entries(updatedChains)) {
    if (progress.completed) continue;

    const currentStep = progress.steps[progress.currentStepIndex];
    if (!currentStep || currentStep.completed) continue;

    let stepChanged = false;
    const updatedObjectives = currentStep.objectives.map((obj) => {
      if (obj.completed) return obj;

      // Match event type against objective targetType
      const def = chainMap.get(chainId);
      if (!def) return obj;
      const stepDef = def.steps[progress.currentStepIndex];
      if (!stepDef) return obj;
      const objDef = stepDef.objectives.find((o) => o.id === obj.objectiveId);
      if (!objDef || objDef.targetType !== eventType) return obj;

      const newProgress = Math.min(
        obj.currentProgress + amount,
        objDef.targetAmount,
      );
      const nowCompleted = newProgress >= objDef.targetAmount;
      stepChanged = true;

      return {
        ...obj,
        currentProgress: newProgress,
        completed: nowCompleted,
      };
    });

    if (!stepChanged) continue;
    changed = true;

    const allObjectivesDone = updatedObjectives.every((o) => o.completed);
    const updatedStep: ChainStepProgress = {
      ...currentStep,
      objectives: updatedObjectives,
      completed: allObjectivesDone,
    };

    const updatedSteps = [...progress.steps];
    updatedSteps[progress.currentStepIndex] = updatedStep;

    if (allObjectivesDone) {
      completedSteps.push({ chainId, stepId: currentStep.stepId });
    }

    updatedChains[chainId] = {
      ...progress,
      steps: updatedSteps,
    };
  }

  if (!changed) return { state, completedSteps };

  return {
    state: { ...state, activeChains: updatedChains },
    completedSteps,
  };
};

// ── Step Completion & Advancement ─────────────────────────────────────

/**
 * Claim the reward for a completed step and advance to the next one.
 * Returns updated state and the step definition (for reward application).
 */
export const claimStepReward = (
  state: QuestChainState,
  chainId: string,
): { state: QuestChainState; stepDef: QuestChainStepDef | null } => {
  const progress = state.activeChains[chainId];
  if (!progress) return { state, stepDef: null };

  const currentStep = progress.steps[progress.currentStepIndex];
  if (!currentStep?.completed || currentStep.rewardClaimed) {
    return { state, stepDef: null };
  }

  const def = chainMap.get(chainId);
  if (!def) return { state, stepDef: null };

  const stepDef = def.steps[progress.currentStepIndex];
  if (!stepDef) return { state, stepDef: null };

  // Mark reward claimed
  const claimedStep: ChainStepProgress = {
    ...currentStep,
    rewardClaimed: true,
  };
  const updatedSteps = [...progress.steps];
  updatedSteps[progress.currentStepIndex] = claimedStep;

  // Check if this was the last step
  const nextStepIndex = progress.currentStepIndex + 1;
  const isChainComplete = nextStepIndex >= def.steps.length;

  if (isChainComplete) {
    // Chain completed — move to completed list
    const { [chainId]: _, ...remainingChains } = state.activeChains;
    return {
      state: {
        ...state,
        activeChains: remainingChains,
        completedChainIds: [...state.completedChainIds, chainId],
      },
      stepDef,
    };
  }

  // Advance to next step
  const nextStepDef = def.steps[nextStepIndex];
  const nextStepProgress = createStepProgress(nextStepDef);

  const updatedProgress: ChainProgress = {
    ...progress,
    currentStepIndex: nextStepIndex,
    steps: [...updatedSteps, nextStepProgress],
  };

  return {
    state: {
      ...state,
      activeChains: { ...state.activeChains, [chainId]: updatedProgress },
    },
    stepDef,
  };
};

// ── Query Helpers ─────────────────────────────────────────────────────

/** Get the current step definition for an active chain. */
export const getCurrentStep = (
  chainId: string,
  state: QuestChainState,
): QuestChainStepDef | null => {
  const progress = state.activeChains[chainId];
  if (!progress) return null;

  const def = chainMap.get(chainId);
  if (!def) return null;

  return def.steps[progress.currentStepIndex] ?? null;
};

/** Get progress for the current step of an active chain. */
export const getCurrentStepProgress = (
  chainId: string,
  state: QuestChainState,
): ChainStepProgress | null => {
  const progress = state.activeChains[chainId];
  if (!progress) return null;
  return progress.steps[progress.currentStepIndex] ?? null;
};

/** Check if a chain is active. */
export const isChainActive = (
  chainId: string,
  state: QuestChainState,
): boolean => chainId in state.activeChains;

/** Check if a chain is completed. */
export const isChainCompleted = (
  chainId: string,
  state: QuestChainState,
): boolean => state.completedChainIds.includes(chainId);

/** Get all active chain IDs. */
export const getActiveChainIds = (state: QuestChainState): string[] =>
  Object.keys(state.activeChains);

/** Get the total number of steps in a chain. */
export const getChainTotalSteps = (chainId: string): number => {
  const def = chainMap.get(chainId);
  return def?.steps.length ?? 0;
};

// ── Internal Helpers ──────────────────────────────────────────────────

function createStepProgress(stepDef: QuestChainStepDef): ChainStepProgress {
  return {
    stepId: stepDef.id,
    objectives: stepDef.objectives.map(
      (obj): ObjectiveProgress => ({
        objectiveId: obj.id,
        currentProgress: 0,
        completed: false,
      }),
    ),
    completed: false,
    rewardClaimed: false,
  };
}
