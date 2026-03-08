/** GOAL_POOLS registry -- assembles all category pools into one record. */

import { GROWTH_GOALS, SEASONAL_GOALS } from "./growthGoals.ts";
import {
  COLLECTION_GOALS,
  ECONOMIC_GOALS,
  EXPLORATION_GOALS,
  MASTERY_GOALS,
} from "./resourceGoals.ts";
import { HARVESTING_GOALS, PLANTING_GOALS, WATERING_GOALS } from "./treeGoals.ts";
import type { GoalCategory, GoalTemplate } from "./types.ts";

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
