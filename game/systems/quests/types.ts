import type { ResourceType } from "@/game/config/resources";
import type { Season } from "@/game/systems/time";

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

export interface GoalTemplate {
  id: string;
  category: GoalCategory;
  name: string;
  description: string;
  targetType: string;
  targetAmount: number | { min: number; max: number };
  timeLimit?: number;
  seasonRequired?: Season;
  speciesRequired?: string[];
  prerequisites?: string[];
  zoneType?: string;
  rewards: {
    xp: { min: number; max: number };
    resources?: GoalRewardResource[];
    seeds?: GoalRewardSeed[];
    unlocks?: string[];
  };
  difficulty: GoalDifficulty;
  repeatable: boolean;
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
