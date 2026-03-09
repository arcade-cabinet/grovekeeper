/**
 * Yuka GoalEvaluators for the PlayerGovernor.
 * Each evaluator scores a potential action (0-1); the governor picks the highest.
 */

import { GoalEvaluator } from "yuka";
import {
  findHarvestableTrees,
  findMatureTrees,
  findPlantableTiles,
  findWaterableTrees,
} from "@/game/actions";
import { useGameStore } from "@/game/stores";
import { BASE_TRADE_RATES } from "@/game/systems/trading";
import type { GovernorEntity } from "./entity.ts";

export class PlantEvaluator extends GoalEvaluator<GovernorEntity> {
  calculateDesirability(): number {
    const store = useGameStore.getState();
    const tiles = findPlantableTiles();
    if (tiles.length === 0) return 0;
    const totalSeeds = Object.values(store.seeds).reduce((a, b) => a + b, 0);
    if (totalSeeds === 0) return 0;
    const tileFactor = Math.min(1, tiles.length / 8);
    const unwatered = findWaterableTrees().length;
    const tendPenalty = Math.min(0.8, unwatered / 6);
    return this.characterBias * tileFactor * (1 - tendPenalty);
  }
  setGoal(): void {}
}

export class WaterEvaluator extends GoalEvaluator<GovernorEntity> {
  calculateDesirability(): number {
    const trees = findWaterableTrees();
    if (trees.length === 0) return 0;
    return this.characterBias * Math.min(1, trees.length / 4);
  }
  setGoal(): void {}
}

export class HarvestEvaluator extends GoalEvaluator<GovernorEntity> {
  calculateDesirability(): number {
    const trees = findHarvestableTrees();
    if (trees.length === 0) return 0;
    return this.characterBias * Math.min(1, trees.length / 5);
  }
  setGoal(): void {}
}

export class PruneEvaluator extends GoalEvaluator<GovernorEntity> {
  calculateDesirability(): number {
    const trees = findMatureTrees().filter(
      (t) => t.tree && !t.tree.pruned && !t.harvestable?.ready,
    );
    if (trees.length === 0) return 0;
    return this.characterBias * Math.min(1, trees.length / 2);
  }
  setGoal(): void {}
}

export class TradeEvaluator extends GoalEvaluator<GovernorEntity> {
  calculateDesirability(): number {
    const store = useGameStore.getState();
    const { resources } = store;
    for (const rate of BASE_TRADE_RATES) {
      if (resources[rate.from] >= rate.fromAmount && resources[rate.to] === 0) {
        return this.characterBias * 0.8;
      }
    }
    for (const rate of BASE_TRADE_RATES) {
      if (resources[rate.from] >= rate.fromAmount && resources[rate.to] < 10) {
        return this.characterBias * 0.4;
      }
    }
    return 0;
  }
  setGoal(): void {}
}

export class ExploreEvaluator extends GoalEvaluator<GovernorEntity> {
  calculateDesirability(): number {
    return this.characterBias * 0.05;
  }
  setGoal(): void {}
}
