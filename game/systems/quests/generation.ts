/**
 * Quest generation -- synthesizes ActiveQuest objects from goal pools.
 */
import type { ResourceType } from "@/game/config/resources";
import type { Season } from "@/game/systems/time";
import { scopedRNG } from "@/game/utils/seedWords";
import { GOAL_POOLS } from "./registry.ts";
import type {
  ActiveQuest,
  GoalCategory,
  GoalDifficulty,
  GoalRewardResource,
  GoalRewardSeed,
  GoalTemplate,
  QuestGoal,
} from "./types.ts";

// ── Helpers ─────────────────────────────────────────────────────────────────

const randomInRange = (rng: () => number, min: number, max: number): number => {
  return Math.floor(rng() * (max - min + 1)) + min;
};

/** Fisher-Yates shuffle using seeded RNG. */
const shuffle = <T>(arr: T[], rng: () => number): T[] => {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
};

const selectRandomGoals = (
  rng: () => number,
  count: number,
  categories: GoalCategory[],
  excludeIds: Set<string> = new Set(),
  currentSeason?: Season,
): GoalTemplate[] => {
  const availableGoals: GoalTemplate[] = [];

  for (const category of categories) {
    const pool = GOAL_POOLS[category];
    for (const goal of pool) {
      if (!excludeIds.has(goal.id)) {
        if (goal.seasonRequired && goal.seasonRequired !== currentSeason) {
          continue;
        }
        availableGoals.push(goal);
      }
    }
  }

  return shuffle(availableGoals, rng).slice(0, count);
};

// ── Quest Generation ─────────────────────────────────────────────────────────

/**
 * Generate a quest of a given difficulty.
 *
 * @param difficulty - Quest difficulty tier
 * @param currentSeason - Current game season (filters seasonal goals)
 * @param completedGoalIds - Goal IDs to exclude (already completed non-repeatable)
 * @param worldSeed - World seed for deterministic generation
 * @param questIndex - Unique index for this quest within the generation batch
 */
export const generateQuest = (
  difficulty: GoalDifficulty,
  currentSeason?: Season,
  completedGoalIds: Set<string> = new Set(),
  worldSeed: string = "default",
  questIndex: number = 0,
): ActiveQuest | null => {
  const rng = scopedRNG("quest-gen", worldSeed, difficulty, questIndex, Date.now());

  const goalCounts: Record<GoalDifficulty, number> = {
    easy: 1,
    medium: 2,
    hard: 3,
    epic: 4,
  };

  const goalCount = goalCounts[difficulty];

  const categoryOptions: Record<GoalDifficulty, GoalCategory[]> = {
    easy: ["planting", "watering", "growth", "exploration"],
    medium: [
      "planting",
      "watering",
      "growth",
      "harvesting",
      "economic",
      "collection",
      "exploration",
    ],
    hard: ["planting", "harvesting", "growth", "seasonal", "economic", "collection", "exploration"],
    epic: [
      "planting",
      "harvesting",
      "growth",
      "seasonal",
      "economic",
      "mastery",
      "collection",
      "exploration",
    ],
  };

  const categories = categoryOptions[difficulty];

  const goalTemplates = selectRandomGoals(
    rng,
    goalCount,
    categories,
    completedGoalIds,
    currentSeason,
  );

  if (goalTemplates.length === 0) {
    return null;
  }

  const goals: QuestGoal[] = goalTemplates.map((template, i) => {
    const targetAmount =
      typeof template.targetAmount === "number"
        ? template.targetAmount
        : randomInRange(rng, template.targetAmount.min, template.targetAmount.max);

    const idSuffix = Math.floor(rng() * 0xffffffff).toString(36);

    return {
      id: `goal_${questIndex}_${i}_${idSuffix}`,
      templateId: template.id,
      name: template.name,
      description: template.description,
      targetType: template.targetType,
      targetAmount,
      currentProgress: 0,
      completed: false,
    };
  });

  const totalXp = goals.reduce((sum, goal) => {
    const template = goalTemplates.find((t) => t.id === goal.templateId);
    return (
      sum + (template ? randomInRange(rng, template.rewards.xp.min, template.rewards.xp.max) : 0)
    );
  }, 0);

  const resourceMap = new Map<ResourceType, number>();
  const seedMap = new Map<string, number>();
  for (const template of goalTemplates) {
    if (template.rewards.resources) {
      for (const r of template.rewards.resources) {
        resourceMap.set(r.type, (resourceMap.get(r.type) ?? 0) + r.amount);
      }
    }
    if (template.rewards.seeds) {
      for (const s of template.rewards.seeds) {
        seedMap.set(s.speciesId, (seedMap.get(s.speciesId) ?? 0) + s.amount);
      }
    }
  }

  const mergedResources: GoalRewardResource[] = Array.from(resourceMap.entries()).map(
    ([type, amount]) => ({ type, amount }),
  );
  const mergedSeeds: GoalRewardSeed[] = Array.from(seedMap.entries()).map(
    ([speciesId, amount]) => ({ speciesId, amount }),
  );

  const questNames: Record<GoalDifficulty, string[]> = {
    easy: ["Simple Task", "Quick Job", "Small Steps", "Easy Start"],
    medium: ["Grove Challenge", "Forest Task", "Growing Quest", "Woodland Work"],
    hard: ["Forester's Trial", "Grove Master Challenge", "Ancient Task", "Deep Woods Quest"],
    epic: ["Legendary Quest", "Grand Challenge", "Epic Undertaking", "Master's Trial"],
  };

  const questName = questNames[difficulty][Math.floor(rng() * questNames[difficulty].length)];
  const questIdSuffix = Math.floor(rng() * 0xffffffff).toString(36);

  return {
    id: `quest_${questIndex}_${questIdSuffix}`,
    name: questName,
    description: `Complete ${goals.length} goal${goals.length > 1 ? "s" : ""} to earn rewards`,
    goals,
    startedAt: Date.now(),
    completed: false,
    rewards: {
      xp: totalXp,
      resources: mergedResources.length > 0 ? mergedResources : undefined,
      seeds: mergedSeeds.length > 0 ? mergedSeeds : undefined,
    },
    difficulty,
  };
};

// ── Quest Progress Tracking ──────────────────────────────────────────────────

export const updateQuestProgress = (
  quest: ActiveQuest,
  eventType: string,
  amount: number = 1,
): ActiveQuest => {
  const updatedGoals = quest.goals.map((goal) => {
    if (goal.targetType === eventType && !goal.completed) {
      const newProgress = Math.min(goal.currentProgress + amount, goal.targetAmount);
      return {
        ...goal,
        currentProgress: newProgress,
        completed: newProgress >= goal.targetAmount,
      };
    }
    return goal;
  });

  const allCompleted = updatedGoals.every((g) => g.completed);

  return {
    ...quest,
    goals: updatedGoals,
    completed: allCompleted,
  };
};

// ── Daily Quest Generation ───────────────────────────────────────────────────

export const generateDailyQuests = (
  currentSeason: Season,
  playerLevel: number,
  completedGoalIds: Set<string>,
  worldSeed: string = "default",
): ActiveQuest[] => {
  const quests: ActiveQuest[] = [];
  let index = 0;

  const easyQuest = generateQuest("easy", currentSeason, completedGoalIds, worldSeed, index++);
  if (easyQuest) quests.push(easyQuest);

  if (playerLevel >= 3) {
    const mediumQuest = generateQuest(
      "medium",
      currentSeason,
      completedGoalIds,
      worldSeed,
      index++,
    );
    if (mediumQuest) quests.push(mediumQuest);
  }

  if (playerLevel >= 7) {
    const hardQuest = generateQuest("hard", currentSeason, completedGoalIds, worldSeed, index++);
    if (hardQuest) quests.push(hardQuest);
  }

  if (playerLevel >= 15) {
    const epicQuest = generateQuest("epic", currentSeason, completedGoalIds, worldSeed, index++);
    if (epicQuest) quests.push(epicQuest);
  }

  return quests;
};

export const getAllGoals = (): GoalTemplate[] => {
  return Object.values(GOAL_POOLS).flat();
};
