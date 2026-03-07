/** GOAL_POOLS registry -- assembles all category pools into one record. */
import type { GoalCategory, GoalTemplate } from "./types";
import { GROWTH_GOALS, SEASONAL_GOALS } from "./growthGoals";
import { ECONOMIC_GOALS, COLLECTION_GOALS, EXPLORATION_GOALS, MASTERY_GOALS } from "./resourceGoals";
import { HARVESTING_GOALS, PLANTING_GOALS, WATERING_GOALS } from "./treeGoals";

export const GOAL_POOLS: Record<GoalCategory, GoalTemplate[]> = {
  planting: PLANTING_GOALS,
  harvesting: HARVESTING_GOALS,
  watering: WATERING_GOALS,
  growth: GROWTH_GOALS,
  collection: COLLECTION_GOALS,
  exploration: EXPLORATION_GOALS,
  seasonal: SEASONAL_GOALS,
  economic: ECONOMIC_GOALS,
  mastery: MASTERY_GOALS,
};
