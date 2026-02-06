/**
 * Quest System - Dynamic goal generation from goal pools
 * 
 * Goals are organized into pools by category, and quests are synthesized
 * by combining goals from different pools to create varied objectives.
 */

import type { Season } from './time';

// ============================================
// Goal Types
// ============================================

export type GoalCategory = 
  | 'planting'
  | 'harvesting'
  | 'watering'
  | 'growth'
  | 'collection'
  | 'exploration'
  | 'seasonal'
  | 'economic'
  | 'mastery';

export type GoalDifficulty = 'easy' | 'medium' | 'hard' | 'epic';

export interface GoalTemplate {
  id: string;
  category: GoalCategory;
  name: string;
  description: string;
  targetType: string; // What is being counted
  targetAmount: number | { min: number; max: number };
  timeLimit?: number; // In game hours, optional
  seasonRequired?: Season;
  speciesRequired?: string[];
  prerequisites?: string[]; // Other goal IDs that must be completed first
  rewards: {
    coins: { min: number; max: number };
    xp: { min: number; max: number };
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
  startedAt: number; // Game microseconds
  expiresAt?: number; // Game microseconds
  completed: boolean;
  rewards: {
    coins: number;
    xp: number;
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

// ============================================
// Goal Pools
// ============================================

const PLANTING_GOALS: GoalTemplate[] = [
  {
    id: 'plant_any_1',
    category: 'planting',
    name: 'First Seed',
    description: 'Plant your first tree',
    targetType: 'trees_planted',
    targetAmount: 1,
    rewards: { coins: { min: 10, max: 20 }, xp: { min: 10, max: 15 } },
    difficulty: 'easy',
    repeatable: false,
  },
  {
    id: 'plant_any_5',
    category: 'planting',
    name: 'Growing Grove',
    description: 'Plant 5 trees',
    targetType: 'trees_planted',
    targetAmount: 5,
    rewards: { coins: { min: 30, max: 50 }, xp: { min: 25, max: 40 } },
    difficulty: 'easy',
    repeatable: true,
  },
  {
    id: 'plant_any_10',
    category: 'planting',
    name: 'Forest Starter',
    description: 'Plant 10 trees',
    targetType: 'trees_planted',
    targetAmount: 10,
    rewards: { coins: { min: 75, max: 100 }, xp: { min: 50, max: 75 } },
    difficulty: 'medium',
    repeatable: true,
  },
  {
    id: 'plant_oak_3',
    category: 'planting',
    name: 'Oak Grove',
    description: 'Plant 3 oak trees',
    targetType: 'oak_planted',
    targetAmount: 3,
    rewards: { coins: { min: 40, max: 60 }, xp: { min: 30, max: 45 } },
    difficulty: 'easy',
    repeatable: true,
  },
  {
    id: 'plant_birch_3',
    category: 'planting',
    name: 'White Forest',
    description: 'Plant 3 birch trees',
    targetType: 'birch_planted',
    targetAmount: 3,
    rewards: { coins: { min: 35, max: 55 }, xp: { min: 25, max: 40 } },
    difficulty: 'easy',
    repeatable: true,
  },
  {
    id: 'plant_pine_3',
    category: 'planting',
    name: 'Evergreen Stand',
    description: 'Plant 3 pine trees',
    targetType: 'pine_planted',
    targetAmount: 3,
    rewards: { coins: { min: 50, max: 70 }, xp: { min: 40, max: 55 } },
    difficulty: 'medium',
    repeatable: true,
  },
  {
    id: 'plant_variety_3',
    category: 'planting',
    name: 'Biodiversity',
    description: 'Plant 3 different species',
    targetType: 'unique_species_planted',
    targetAmount: 3,
    rewards: { coins: { min: 60, max: 80 }, xp: { min: 45, max: 60 } },
    difficulty: 'medium',
    repeatable: true,
  },
  {
    id: 'plant_row',
    category: 'planting',
    name: 'Perfect Row',
    description: 'Plant 5 trees in a row',
    targetType: 'trees_in_row',
    targetAmount: 5,
    rewards: { coins: { min: 100, max: 150 }, xp: { min: 75, max: 100 } },
    difficulty: 'hard',
    repeatable: true,
  },
];

const HARVESTING_GOALS: GoalTemplate[] = [
  {
    id: 'harvest_1',
    category: 'harvesting',
    name: 'First Harvest',
    description: 'Harvest your first mature tree',
    targetType: 'trees_harvested',
    targetAmount: 1,
    rewards: { coins: { min: 50, max: 75 }, xp: { min: 25, max: 35 } },
    difficulty: 'easy',
    repeatable: false,
  },
  {
    id: 'harvest_5',
    category: 'harvesting',
    name: 'Lumber Time',
    description: 'Harvest 5 mature trees',
    targetType: 'trees_harvested',
    targetAmount: 5,
    rewards: { coins: { min: 100, max: 150 }, xp: { min: 50, max: 75 } },
    difficulty: 'medium',
    repeatable: true,
  },
  {
    id: 'harvest_ancient',
    category: 'harvesting',
    name: 'Ancient Wisdom',
    description: 'Harvest an ancient tree',
    targetType: 'ancient_harvested',
    targetAmount: 1,
    rewards: { coins: { min: 200, max: 300 }, xp: { min: 100, max: 150 } },
    difficulty: 'hard',
    repeatable: true,
  },
];

const WATERING_GOALS: GoalTemplate[] = [
  {
    id: 'water_5',
    category: 'watering',
    name: 'Tender Care',
    description: 'Water 5 trees',
    targetType: 'trees_watered',
    targetAmount: 5,
    rewards: { coins: { min: 15, max: 25 }, xp: { min: 15, max: 25 } },
    difficulty: 'easy',
    repeatable: true,
  },
  {
    id: 'water_all',
    category: 'watering',
    name: 'Full Service',
    description: 'Water all trees in your grove',
    targetType: 'grove_fully_watered',
    targetAmount: 1,
    rewards: { coins: { min: 40, max: 60 }, xp: { min: 30, max: 45 } },
    difficulty: 'medium',
    repeatable: true,
  },
  {
    id: 'water_streak',
    category: 'watering',
    name: 'Diligent Gardener',
    description: 'Water trees for 3 days in a row',
    targetType: 'watering_streak_days',
    targetAmount: 3,
    rewards: { coins: { min: 75, max: 100 }, xp: { min: 50, max: 75 } },
    difficulty: 'medium',
    repeatable: true,
  },
];

const GROWTH_GOALS: GoalTemplate[] = [
  {
    id: 'grow_sprout',
    category: 'growth',
    name: 'New Beginnings',
    description: 'Grow a seed to sprout stage',
    targetType: 'sprouts_grown',
    targetAmount: 1,
    rewards: { coins: { min: 10, max: 15 }, xp: { min: 10, max: 15 } },
    difficulty: 'easy',
    repeatable: true,
  },
  {
    id: 'grow_sapling',
    category: 'growth',
    name: 'Steady Growth',
    description: 'Grow a tree to sapling stage',
    targetType: 'saplings_grown',
    targetAmount: 1,
    rewards: { coins: { min: 25, max: 35 }, xp: { min: 20, max: 30 } },
    difficulty: 'easy',
    repeatable: true,
  },
  {
    id: 'grow_mature_5',
    category: 'growth',
    name: 'Patient Cultivator',
    description: 'Grow 5 trees to maturity',
    targetType: 'mature_trees_grown',
    targetAmount: 5,
    rewards: { coins: { min: 150, max: 200 }, xp: { min: 100, max: 150 } },
    difficulty: 'hard',
    repeatable: true,
  },
  {
    id: 'grow_ancient',
    category: 'growth',
    name: 'Elder Tree',
    description: 'Grow a tree to ancient stage',
    targetType: 'ancient_trees_grown',
    targetAmount: 1,
    rewards: { coins: { min: 300, max: 400 }, xp: { min: 200, max: 300 } },
    difficulty: 'epic',
    repeatable: true,
  },
];

const SEASONAL_GOALS: GoalTemplate[] = [
  {
    id: 'spring_planting',
    category: 'seasonal',
    name: 'Spring Awakening',
    description: 'Plant 5 trees during spring',
    targetType: 'trees_planted_spring',
    targetAmount: 5,
    seasonRequired: 'spring',
    rewards: { coins: { min: 75, max: 100 }, xp: { min: 50, max: 75 } },
    difficulty: 'medium',
    repeatable: true,
  },
  {
    id: 'summer_growth',
    category: 'seasonal',
    name: 'Summer Bloom',
    description: 'Have 10 trees growing during summer',
    targetType: 'trees_during_summer',
    targetAmount: 10,
    seasonRequired: 'summer',
    rewards: { coins: { min: 100, max: 150 }, xp: { min: 75, max: 100 } },
    difficulty: 'medium',
    repeatable: true,
  },
  {
    id: 'autumn_harvest',
    category: 'seasonal',
    name: 'Autumn Bounty',
    description: 'Harvest 5 trees during autumn',
    targetType: 'trees_harvested_autumn',
    targetAmount: 5,
    seasonRequired: 'autumn',
    rewards: { coins: { min: 150, max: 200 }, xp: { min: 100, max: 125 } },
    difficulty: 'hard',
    repeatable: true,
  },
  {
    id: 'winter_survive',
    category: 'seasonal',
    name: 'Winter Resilience',
    description: 'Keep 5 trees alive through winter',
    targetType: 'trees_survived_winter',
    targetAmount: 5,
    seasonRequired: 'winter',
    rewards: { coins: { min: 200, max: 250 }, xp: { min: 150, max: 200 } },
    difficulty: 'hard',
    repeatable: true,
  },
];

const ECONOMIC_GOALS: GoalTemplate[] = [
  {
    id: 'earn_coins_100',
    category: 'economic',
    name: 'First Fortune',
    description: 'Earn 100 coins',
    targetType: 'coins_earned',
    targetAmount: 100,
    rewards: { coins: { min: 25, max: 35 }, xp: { min: 20, max: 30 } },
    difficulty: 'easy',
    repeatable: true,
  },
  {
    id: 'earn_coins_500',
    category: 'economic',
    name: 'Growing Wealth',
    description: 'Earn 500 coins',
    targetType: 'coins_earned',
    targetAmount: 500,
    rewards: { coins: { min: 75, max: 100 }, xp: { min: 50, max: 75 } },
    difficulty: 'medium',
    repeatable: true,
  },
  {
    id: 'earn_coins_1000',
    category: 'economic',
    name: 'Prosperous Grove',
    description: 'Earn 1000 coins',
    targetType: 'coins_earned',
    targetAmount: 1000,
    rewards: { coins: { min: 150, max: 200 }, xp: { min: 100, max: 150 } },
    difficulty: 'hard',
    repeatable: true,
  },
];

const MASTERY_GOALS: GoalTemplate[] = [
  {
    id: 'level_5',
    category: 'mastery',
    name: 'Apprentice Forester',
    description: 'Reach level 5',
    targetType: 'player_level',
    targetAmount: 5,
    rewards: { coins: { min: 100, max: 150 }, xp: { min: 0, max: 0 }, unlocks: ['pine'] },
    difficulty: 'medium',
    repeatable: false,
  },
  {
    id: 'level_10',
    category: 'mastery',
    name: 'Journeyman Forester',
    description: 'Reach level 10',
    targetType: 'player_level',
    targetAmount: 10,
    rewards: { coins: { min: 250, max: 350 }, xp: { min: 0, max: 0 }, unlocks: ['maple'] },
    difficulty: 'hard',
    repeatable: false,
  },
  {
    id: 'level_20',
    category: 'mastery',
    name: 'Master Forester',
    description: 'Reach level 20',
    targetType: 'player_level',
    targetAmount: 20,
    rewards: { coins: { min: 500, max: 750 }, xp: { min: 0, max: 0 }, unlocks: ['cherry'] },
    difficulty: 'epic',
    repeatable: false,
  },
  {
    id: 'unlock_species_4',
    category: 'mastery',
    name: 'Collector',
    description: 'Unlock 4 tree species',
    targetType: 'species_unlocked',
    targetAmount: 4,
    rewards: { coins: { min: 100, max: 150 }, xp: { min: 75, max: 100 } },
    difficulty: 'medium',
    repeatable: false,
  },
];

// ============================================
// Goal Pool Registry
// ============================================

export const GOAL_POOLS: Record<GoalCategory, GoalTemplate[]> = {
  planting: PLANTING_GOALS,
  harvesting: HARVESTING_GOALS,
  watering: WATERING_GOALS,
  growth: GROWTH_GOALS,
  collection: [], // Can be extended
  exploration: [], // Can be extended
  seasonal: SEASONAL_GOALS,
  economic: ECONOMIC_GOALS,
  mastery: MASTERY_GOALS,
};

// ============================================
// Quest Generation
// ============================================

const randomInRange = (min: number, max: number): number => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

const selectRandomGoals = (
  count: number,
  categories: GoalCategory[],
  excludeIds: Set<string> = new Set(),
  currentSeason?: Season
): GoalTemplate[] => {
  const availableGoals: GoalTemplate[] = [];
  
  for (const category of categories) {
    const pool = GOAL_POOLS[category];
    for (const goal of pool) {
      if (!excludeIds.has(goal.id)) {
        // Check season requirement
        if (goal.seasonRequired && goal.seasonRequired !== currentSeason) {
          continue;
        }
        availableGoals.push(goal);
      }
    }
  }
  
  // Shuffle and take count
  const shuffled = [...availableGoals].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
};

export const generateQuest = (
  difficulty: GoalDifficulty,
  currentSeason?: Season,
  completedGoalIds: Set<string> = new Set()
): ActiveQuest | null => {
  // Determine number of goals based on difficulty
  const goalCounts: Record<GoalDifficulty, number> = {
    easy: 1,
    medium: 2,
    hard: 3,
    epic: 4,
  };
  
  const goalCount = goalCounts[difficulty];
  
  // Select categories based on difficulty
  const categoryOptions: Record<GoalDifficulty, GoalCategory[]> = {
    easy: ['planting', 'watering', 'growth'],
    medium: ['planting', 'watering', 'growth', 'harvesting', 'economic'],
    hard: ['planting', 'harvesting', 'growth', 'seasonal', 'economic'],
    epic: ['planting', 'harvesting', 'growth', 'seasonal', 'economic', 'mastery'],
  };
  
  const categories = categoryOptions[difficulty];
  
  // Select goals
  const goalTemplates = selectRandomGoals(goalCount, categories, completedGoalIds, currentSeason);
  
  if (goalTemplates.length === 0) {
    return null;
  }
  
  // Convert templates to active goals
  const goals: QuestGoal[] = goalTemplates.map(template => {
    const targetAmount = typeof template.targetAmount === 'number'
      ? template.targetAmount
      : randomInRange(template.targetAmount.min, template.targetAmount.max);
    
    return {
      id: `goal_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      templateId: template.id,
      name: template.name,
      description: template.description,
      targetType: template.targetType,
      targetAmount,
      currentProgress: 0,
      completed: false,
    };
  });
  
  // Calculate total rewards
  const totalCoins = goals.reduce((sum, goal) => {
    const template = goalTemplates.find(t => t.id === goal.templateId);
    return sum + (template ? randomInRange(template.rewards.coins.min, template.rewards.coins.max) : 0);
  }, 0);
  
  const totalXp = goals.reduce((sum, goal) => {
    const template = goalTemplates.find(t => t.id === goal.templateId);
    return sum + (template ? randomInRange(template.rewards.xp.min, template.rewards.xp.max) : 0);
  }, 0);
  
  // Quest name generation
  const questNames: Record<GoalDifficulty, string[]> = {
    easy: ['Simple Task', 'Quick Job', 'Small Steps', 'Easy Start'],
    medium: ['Grove Challenge', 'Forest Task', 'Growing Quest', 'Woodland Work'],
    hard: ['Forester\'s Trial', 'Grove Master Challenge', 'Ancient Task', 'Deep Woods Quest'],
    epic: ['Legendary Quest', 'Grand Challenge', 'Epic Undertaking', 'Master\'s Trial'],
  };
  
  const questName = questNames[difficulty][Math.floor(Math.random() * questNames[difficulty].length)];
  
  return {
    id: `quest_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    name: questName,
    description: `Complete ${goals.length} goal${goals.length > 1 ? 's' : ''} to earn rewards`,
    goals,
    startedAt: Date.now(),
    completed: false,
    rewards: {
      coins: totalCoins,
      xp: totalXp,
    },
    difficulty,
  };
};

// ============================================
// Quest Progress Tracking
// ============================================

export const updateQuestProgress = (
  quest: ActiveQuest,
  eventType: string,
  amount: number = 1
): ActiveQuest => {
  const updatedGoals = quest.goals.map(goal => {
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
  
  const allCompleted = updatedGoals.every(g => g.completed);
  
  return {
    ...quest,
    goals: updatedGoals,
    completed: allCompleted,
  };
};

// ============================================
// Daily Quest Generation
// ============================================

export const generateDailyQuests = (
  currentSeason: Season,
  playerLevel: number,
  completedGoalIds: Set<string>
): ActiveQuest[] => {
  const quests: ActiveQuest[] = [];
  
  // Always 1 easy quest
  const easyQuest = generateQuest('easy', currentSeason, completedGoalIds);
  if (easyQuest) quests.push(easyQuest);
  
  // 1 medium quest if level >= 3
  if (playerLevel >= 3) {
    const mediumQuest = generateQuest('medium', currentSeason, completedGoalIds);
    if (mediumQuest) quests.push(mediumQuest);
  }
  
  // 1 hard quest if level >= 7
  if (playerLevel >= 7) {
    const hardQuest = generateQuest('hard', currentSeason, completedGoalIds);
    if (hardQuest) quests.push(hardQuest);
  }
  
  // 1 epic quest if level >= 15
  if (playerLevel >= 15) {
    const epicQuest = generateQuest('epic', currentSeason, completedGoalIds);
    if (epicQuest) quests.push(epicQuest);
  }
  
  return quests;
};

// Export all goals for reference
export const getAllGoals = (): GoalTemplate[] => {
  return Object.values(GOAL_POOLS).flat();
};
