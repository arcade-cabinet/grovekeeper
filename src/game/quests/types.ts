/**
 * Quest Chain Types — NPC-driven narrative story arcs.
 *
 * Quest chains are multi-step story progressions tied to specific NPCs.
 * Each step has objectives, dialogue triggers, and rewards.
 * Steps unlock sequentially — completing step N unlocks step N+1.
 *
 * Chains complement the existing daily quest system in systems/quests.ts.
 */

import type { ResourceType } from "../constants/resources";

export type QuestChainCategory = "npc" | "main_story" | "seasonal";

export interface ChainObjective {
  id: string;
  description: string;
  targetType: string;
  targetAmount: number;
  speciesId?: string;
}

export interface ChainStepReward {
  xp: number;
  resources?: Partial<Record<ResourceType, number>>;
  seeds?: { speciesId: string; amount: number }[];
  friendshipPoints?: number;
  unlockSpecies?: string;
  unlockRecipe?: string;
}

export interface QuestChainStepDef {
  id: string;
  name: string;
  description: string;
  npcDialogueId: string;
  objectives: ChainObjective[];
  reward: ChainStepReward;
  completionDialogueId?: string;
}

export interface QuestChainDef {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: QuestChainCategory;
  npcId: string;
  requiredLevel: number;
  prerequisiteChainIds?: string[];
  steps: QuestChainStepDef[];
}

export interface ObjectiveProgress {
  objectiveId: string;
  currentProgress: number;
  completed: boolean;
}

export interface ChainStepProgress {
  stepId: string;
  objectives: ObjectiveProgress[];
  completed: boolean;
  rewardClaimed: boolean;
}

export interface ChainProgress {
  chainId: string;
  currentStepIndex: number;
  steps: ChainStepProgress[];
  completed: boolean;
  startedDay: number;
}

export interface QuestChainState {
  activeChains: Record<string, ChainProgress>;
  completedChainIds: string[];
  availableChainIds: string[];
}
