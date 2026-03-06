/**
 * Quest chain engine stub.
 * Manages multi-step quest chains with NPC-driven narratives.
 */

import type { QuestChainState } from "./types";

export interface StepDef {
  id: string;
  name: string;
  reward: {
    xp?: number;
    resources?: Record<string, number>;
    seeds?: { speciesId: string; amount: number }[];
    unlockSpecies?: string;
  };
}

export function initializeChainState(): QuestChainState {
  return {
    activeChains: [],
    completedChainIds: [],
    availableChainIds: [],
  };
}

export function computeAvailableChains(
  state: QuestChainState,
  _playerLevel: number,
): string[] {
  return state.availableChainIds;
}

export function startChain(
  state: QuestChainState,
  _chainId: string,
  _currentDay: number,
): QuestChainState {
  return state;
}

export function advanceObjectives(
  state: QuestChainState,
  _eventType: string,
  _amount: number,
): {
  state: QuestChainState;
  completedSteps: { chainId: string; stepId: string }[];
} {
  return { state, completedSteps: [] };
}

export function claimStepReward(
  state: QuestChainState,
  _chainId: string,
): { state: QuestChainState; stepDef: StepDef | null } {
  return { state, stepDef: null };
}
