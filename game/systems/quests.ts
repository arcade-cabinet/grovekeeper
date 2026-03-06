/**
 * Quest system types -- goal pools and quest generation.
 * Only the ActiveQuest type is needed by the gameStore; full system to be ported separately.
 */

import type { ResourceType } from "@/game/config/resources";

export type GoalCategory =
  | "planting"
  | "harvesting"
  | "watering"
  | "growth"
  | "collection"
  | "exploration"
  | "seasonal"
  | "economic"
  | "mastery";

export type GoalDifficulty = "easy" | "medium" | "hard" | "epic";

export interface GoalRewardResource {
  type: ResourceType;
  amount: number;
}

export interface GoalRewardSeed {
  speciesId: string;
  amount: number;
}

export interface QuestGoal {
  id: string;
  templateId: string;
  name: string;
  description: string;
  targetType: string;
  targetAmount: number;
  currentProgress: number;
  completed: boolean;
}

export interface ActiveQuest {
  id: string;
  name: string;
  description: string;
  goals: QuestGoal[];
  startedAt: number;
  expiresAt?: number;
  completed: boolean;
  rewards: {
    xp: number;
    resources?: GoalRewardResource[];
    seeds?: GoalRewardSeed[];
    unlocks?: string[];
  };
  difficulty: GoalDifficulty;
}
