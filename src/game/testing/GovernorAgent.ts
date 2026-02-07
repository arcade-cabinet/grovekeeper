/**
 * GovernorAgent — YukaJS goal-driven AI that plays Grovekeeper autonomously.
 *
 * Uses YukaJS's GoalEvaluator pattern to score which action has the highest
 * desirability each decision interval, then executes the winner directly via
 * the headless GameActions layer.
 *
 * Actions: Plant, Water, Harvest, Prune, Explore (idle/fallback)
 *
 * In headless mode, all movement is instant (teleport) and actions complete
 * atomically — no multi-tick goal chains needed.
 */

import { GameEntity, GoalEvaluator, Think } from "yuka";
import {
  findHarvestableTrees,
  findMatureTrees,
  findPlantableTiles,
  findWaterableTrees,
  getPlayerTile,
  harvestTree,
  movePlayerTo,
  plantTree,
  pruneTree,
  selectTool,
  spendToolStamina,
  waterTree,
} from "../actions/GameActions";
import { useGameStore } from "../stores/gameStore";

// ──────────────────────────────────────────────
// Governor Profile
// ──────────────────────────────────────────────

export interface GovernorProfile {
  /** Weight for planting priority (0-1). */
  plantWeight: number;
  /** Weight for watering priority (0-1). */
  waterWeight: number;
  /** Weight for harvesting priority (0-1). */
  harvestWeight: number;
  /** Weight for exploration/movement priority (0-1). */
  exploreWeight: number;
  /** Weight for pruning priority (0-1). */
  pruneWeight: number;
  /** Preferred species to plant. Random from available if empty. */
  preferredSpecies?: string[];
  /** Ticks between decision re-evaluations (default: 10). */
  decisionInterval: number;
}

export const DEFAULT_PROFILE: GovernorProfile = {
  plantWeight: 0.8,
  waterWeight: 0.6,
  harvestWeight: 0.9,
  exploreWeight: 0.3,
  pruneWeight: 0.4,
  decisionInterval: 10,
};

// ──────────────────────────────────────────────
// Governor Entity (extends GameEntity for the Think brain)
// ──────────────────────────────────────────────

class GovernorEntity extends GameEntity {
  brain: Think<GovernorEntity>;

  constructor() {
    super();
    this.brain = new Think<GovernorEntity>(this);
  }
}

// ──────────────────────────────────────────────
// Action types for direct execution
// ──────────────────────────────────────────────

type ActionType = "plant" | "water" | "harvest" | "prune" | "explore";

// ──────────────────────────────────────────────
// Goal Evaluators — score each action's desirability
// ──────────────────────────────────────────────

/**
 * Evaluators score purely on game-state opportunity. Stamina is NOT checked
 * here — the action methods gate on spendToolStamina() and fail harmlessly
 * if stamina is insufficient. This lets the highest-priority action win
 * every cycle and retry until stamina is available.
 */

class PlantEvaluator extends GoalEvaluator<GovernorEntity> {
  calculateDesirability(): number {
    const store = useGameStore.getState();
    const tiles = findPlantableTiles();
    if (tiles.length === 0) return 0;

    const totalSeeds = Object.values(store.seeds).reduce((a, b) => a + b, 0);
    if (totalSeeds === 0) return 0;

    const tileFactor = Math.min(1, tiles.length / 8);

    // Tend existing trees before planting more — reduce desire when many are unwatered
    const unwatered = findWaterableTrees().length;
    const tendPenalty = Math.min(0.8, unwatered / 6);

    return this.characterBias * tileFactor * (1 - tendPenalty);
  }

  setGoal(): void {
    // Not used — direct execution instead
  }
}

class WaterEvaluator extends GoalEvaluator<GovernorEntity> {
  calculateDesirability(): number {
    const trees = findWaterableTrees();
    if (trees.length === 0) return 0;

    return this.characterBias * Math.min(1, trees.length / 4);
  }

  setGoal(): void {}
}

class HarvestEvaluator extends GoalEvaluator<GovernorEntity> {
  calculateDesirability(): number {
    const trees = findHarvestableTrees();
    if (trees.length === 0) return 0;

    return this.characterBias * Math.min(1, trees.length / 5);
  }

  setGoal(): void {}
}

class PruneEvaluator extends GoalEvaluator<GovernorEntity> {
  calculateDesirability(): number {
    const trees = findMatureTrees().filter((t) => t.tree && !t.tree.pruned);
    if (trees.length === 0) return 0;

    return this.characterBias * Math.min(1, trees.length / 3);
  }

  setGoal(): void {}
}

class ExploreEvaluator extends GoalEvaluator<GovernorEntity> {
  calculateDesirability(): number {
    return this.characterBias * 0.2;
  }

  setGoal(): void {}
}

// ──────────────────────────────────────────────
// GovernorAgent (public API)
// ──────────────────────────────────────────────

export class GovernorAgent {
  private entity: GovernorEntity;
  private profile: GovernorProfile;
  private gridSize: number;
  private ticksSinceDecision = 0;

  /** Evaluators indexed by action type. */
  private evaluators: Map<ActionType, GoalEvaluator<GovernorEntity>>;

  /** Stats tracked during the playthrough. */
  readonly stats = {
    decisionsMade: 0,
    plantsAttempted: 0,
    watersAttempted: 0,
    harvestsAttempted: 0,
    prunesAttempted: 0,
    idleTicks: 0,
  };

  constructor(profile: GovernorProfile = DEFAULT_PROFILE, gridSize = 12) {
    this.profile = profile;
    this.gridSize = gridSize;
    this.entity = new GovernorEntity();

    // Create evaluators (also register with brain for inspection)
    const plantEval = new PlantEvaluator(profile.plantWeight);
    const waterEval = new WaterEvaluator(profile.waterWeight);
    const harvestEval = new HarvestEvaluator(profile.harvestWeight);
    const pruneEval = new PruneEvaluator(profile.pruneWeight);
    const exploreEval = new ExploreEvaluator(profile.exploreWeight);

    this.entity.brain.addEvaluator(plantEval);
    this.entity.brain.addEvaluator(waterEval);
    this.entity.brain.addEvaluator(harvestEval);
    this.entity.brain.addEvaluator(pruneEval);
    this.entity.brain.addEvaluator(exploreEval);

    this.evaluators = new Map<ActionType, GoalEvaluator<GovernorEntity>>([
      ["plant", plantEval],
      ["water", waterEval],
      ["harvest", harvestEval],
      ["prune", pruneEval],
      ["explore", exploreEval],
    ]);
  }

  /**
   * Called every simulation tick. On the decision interval, evaluates which
   * action has the highest desirability and executes it directly.
   */
  update(): void {
    this.ticksSinceDecision++;

    if (this.ticksSinceDecision < this.profile.decisionInterval) {
      this.stats.idleTicks++;
      return;
    }

    this.ticksSinceDecision = 0;
    this.stats.decisionsMade++;

    // Find the action with the highest desirability
    let bestAction: ActionType = "explore";
    let bestScore = -1;

    for (const [action, evaluator] of this.evaluators) {
      const score = evaluator.calculateDesirability(this.entity);
      if (score > bestScore) {
        bestScore = score;
        bestAction = action;
      }
    }

    this.executeAction(bestAction);
  }

  /** Execute the chosen action directly via GameActions. */
  private executeAction(action: ActionType): void {
    switch (action) {
      case "plant":
        this.doPlant();
        break;
      case "water":
        this.doWater();
        break;
      case "harvest":
        this.doHarvest();
        break;
      case "prune":
        this.doPrune();
        break;
      case "explore":
        this.doExplore();
        break;
    }
  }

  private doPlant(): void {
    this.stats.plantsAttempted++;

    const tiles = findPlantableTiles();
    if (tiles.length === 0) return;

    const target = tiles[Math.floor(Math.random() * tiles.length)];
    const speciesId = this.pickSpecies();
    if (!speciesId) return;

    if (!spendToolStamina("trowel")) return;

    selectTool("trowel");
    movePlayerTo(target.gridX, target.gridZ);
    plantTree(speciesId, target.gridX, target.gridZ);
  }

  private doWater(): void {
    this.stats.watersAttempted++;

    const trees = findWaterableTrees();
    if (trees.length === 0) return;

    // Pick nearest unwatered tree
    const closest = this.pickNearest(trees);
    const gx = closest.position ? Math.round(closest.position.x) : 0;
    const gz = closest.position ? Math.round(closest.position.z) : 0;

    if (!spendToolStamina("watering-can")) return;

    selectTool("watering-can");
    movePlayerTo(gx, gz);
    waterTree(closest.id);
  }

  private doHarvest(): void {
    this.stats.harvestsAttempted++;

    const trees = findHarvestableTrees();
    if (trees.length === 0) return;

    const target = trees[0];
    const gx = target.position ? Math.round(target.position.x) : 0;
    const gz = target.position ? Math.round(target.position.z) : 0;

    if (!spendToolStamina("axe")) return;

    selectTool("axe");
    movePlayerTo(gx, gz);
    harvestTree(target.id);
  }

  private doPrune(): void {
    this.stats.prunesAttempted++;

    const trees = findMatureTrees().filter((t) => t.tree && !t.tree.pruned);
    if (trees.length === 0) return;

    const target = trees[0];
    const gx = target.position ? Math.round(target.position.x) : 0;
    const gz = target.position ? Math.round(target.position.z) : 0;

    if (!spendToolStamina("pruning-shears")) return;

    selectTool("pruning-shears");
    movePlayerTo(gx, gz);
    pruneTree(target.id);
  }

  private doExplore(): void {
    const targetX = Math.floor(Math.random() * this.gridSize);
    const targetZ = Math.floor(Math.random() * this.gridSize);
    movePlayerTo(targetX, targetZ);
  }

  /** Pick the best species to plant based on profile preferences and seed availability. */
  private pickSpecies(): string | null {
    const store = useGameStore.getState();

    if (this.profile.preferredSpecies) {
      for (const sp of this.profile.preferredSpecies) {
        if ((store.seeds[sp] ?? 0) > 0) return sp;
      }
    }

    for (const [sp, count] of Object.entries(store.seeds)) {
      if (count > 0) return sp;
    }

    return null;
  }

  /** Pick the nearest entity to the current player position. */
  private pickNearest(
    entities: { id: string; position?: { x: number; z: number } }[],
  ): (typeof entities)[0] {
    const playerTile = { gridX: 0, gridZ: 0 };
    const tile = getPlayerTile();
    if (tile) {
      playerTile.gridX = tile.gridX;
      playerTile.gridZ = tile.gridZ;
    }

    let closest = entities[0];
    let minDist = Number.POSITIVE_INFINITY;

    for (const entity of entities) {
      if (!entity.position) continue;
      const dx = entity.position.x - playerTile.gridX;
      const dz = entity.position.z - playerTile.gridZ;
      const dist = dx * dx + dz * dz;
      if (dist < minDist) {
        minDist = dist;
        closest = entity;
      }
    }

    return closest;
  }

  /** The underlying YukaJS entity. */
  get yukaEntity(): GameEntity {
    return this.entity;
  }

  /** The Think brain for testing/inspection. */
  get brain(): Think<GovernorEntity> {
    return this.entity.brain;
  }
}
