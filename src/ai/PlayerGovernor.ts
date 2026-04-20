/**
 * PlayerGovernor — Visual AI that walks the player around and takes actions.
 *
 * Unlike the headless GovernorAgent (which teleports + acts atomically),
 * the PlayerGovernor drives the actual movement system via movementRef,
 * navigates with A* pathfinding, and visually walks to targets before
 * executing actions. Designed for observation testing — watch the little
 * character run around, plant trees, water, harvest, trade, explore.
 *
 * State machine: IDLE → DECIDING → NAVIGATING → ACTING → IDLE
 *
 * Toggle with 'G' key in GameScene or via URL param ?autopilot=1.
 */

import type { Entity } from "koota";
import { GameEntity, GoalEvaluator, Think } from "yuka";
import { actions as gameActions } from "@/actions";
import type { ResourceType } from "@/config/resources";
import { getSpeciesById } from "@/config/trees";
import {
  advancePathFollow,
  createPathFollow,
  type PathFollowState,
} from "@/input/pathFollowing";
import {
  buildWalkabilityGrid,
  findPath,
  type TileCoord,
} from "@/input/pathfinding";
import { koota } from "@/koota";
import {
  findHarvestableTrees,
  findMatureTrees,
  findPlantableTiles,
  findWaterableTrees,
  getPlayerTile,
  harvestTree,
  plantTree,
  pruneTree,
  selectTool,
  spendToolStamina,
  waterTree,
} from "@/player-actions/GameActions";
import { BASE_TRADE_RATES, executeTrade } from "@/systems/trading";
import {
  GridCell,
  Harvestable,
  IsPlayer,
  Position,
  Resources,
  Seeds,
  Tree,
} from "@/traits";

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────

type GovernorState = "idle" | "navigating" | "acting";
type ActionType = "plant" | "water" | "harvest" | "prune" | "trade" | "explore";

export interface PlayerGovernorConfig {
  /** Reference to the shared movement vector (same one InputManager writes to). */
  movementRef: { current: { x: number; z: number } };
  /** Get the world bounds for pathfinding. */
  getWorldBounds: () => {
    minX: number;
    minZ: number;
    maxX: number;
    maxZ: number;
  };
}

interface ActionTarget {
  action: ActionType;
  /** Grid tile to walk to. */
  tileX: number;
  tileZ: number;
  /** Target tree entity for tree actions (watering/harvesting/pruning). */
  entity?: Entity;
  /** Species ID for planting. */
  speciesId?: string;
}

// ──────────────────────────────────────────────
// Governor Profile (same as GovernorAgent)
// ──────────────────────────────────────────────

export interface GovernorProfile {
  plantWeight: number;
  waterWeight: number;
  harvestWeight: number;
  exploreWeight: number;
  pruneWeight: number;
  tradeWeight: number;
  preferredSpecies?: string[];
  /** Seconds between decision re-evaluations. */
  decisionInterval: number;
}

const DEFAULT_PROFILE: GovernorProfile = {
  plantWeight: 0.8,
  waterWeight: 0.6,
  harvestWeight: 0.9,
  exploreWeight: 0.1,
  pruneWeight: 0.4,
  tradeWeight: 0.6,
  decisionInterval: 0.5,
};

// ──────────────────────────────────────────────
// Pause between actions (seconds) — so the character doesn't instantly chain
// ──────────────────────────────────────────────

const ACTION_PAUSE = 0.3;

// ──────────────────────────────────────────────
// YukaJS GoalEvaluators (reused from GovernorAgent)
// ──────────────────────────────────────────────

class GovernorEntity extends GameEntity {
  brain: Think<GovernorEntity>;
  constructor() {
    super();
    this.brain = new Think<GovernorEntity>(this);
  }
}

class PlantEvaluator extends GoalEvaluator<GovernorEntity> {
  calculateDesirability(): number {
    const seeds = koota.get(Seeds) ?? {};
    const tiles = findPlantableTiles();
    if (tiles.length === 0) return 0;
    const totalSeeds = Object.values(seeds).reduce((a, b) => a + b, 0);
    if (totalSeeds === 0) return 0;
    const tileFactor = Math.min(1, tiles.length / 8);
    const unwatered = findWaterableTrees().length;
    const tendPenalty = Math.min(0.8, unwatered / 6);
    return this.characterBias * tileFactor * (1 - tendPenalty);
  }
  setGoal(): void {}
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
    const trees = findMatureTrees().filter((t) => {
      const tree = t.get(Tree);
      const h = t.has(Harvestable) ? t.get(Harvestable) : undefined;
      return tree && !tree.pruned && !h?.ready;
    });
    if (trees.length === 0) return 0;
    return this.characterBias * Math.min(1, trees.length / 2);
  }
  setGoal(): void {}
}

class TradeEvaluator extends GoalEvaluator<GovernorEntity> {
  calculateDesirability(): number {
    const resources = koota.get(Resources);
    if (!resources) return 0;
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

class ExploreEvaluator extends GoalEvaluator<GovernorEntity> {
  calculateDesirability(): number {
    return this.characterBias * 0.05;
  }
  setGoal(): void {}
}

// ──────────────────────────────────────────────
// PlayerGovernor
// ──────────────────────────────────────────────

export class PlayerGovernor {
  private entity: GovernorEntity;
  private profile: GovernorProfile;
  private config: PlayerGovernorConfig | null = null;
  private _enabled = false;

  // State machine
  private state: GovernorState = "idle";
  private currentTarget: ActionTarget | null = null;
  private pathState: PathFollowState | null = null;
  private pauseTimer = 0;

  // Evaluators
  private evaluators: Map<ActionType, GoalEvaluator<GovernorEntity>>;

  /** Stats for observation and debugging. */
  readonly stats = {
    decisionsMade: 0,
    plantsExecuted: 0,
    watersExecuted: 0,
    harvestsExecuted: 0,
    prunesExecuted: 0,
    tradesExecuted: 0,
    explores: 0,
    pathsCompleted: 0,
    pathsFailed: 0,
  };

  constructor(profile: GovernorProfile = DEFAULT_PROFILE) {
    this.profile = profile;
    this.entity = new GovernorEntity();

    const plantEval = new PlantEvaluator(profile.plantWeight);
    const waterEval = new WaterEvaluator(profile.waterWeight);
    const harvestEval = new HarvestEvaluator(profile.harvestWeight);
    const pruneEval = new PruneEvaluator(profile.pruneWeight);
    const tradeEval = new TradeEvaluator(profile.tradeWeight);
    const exploreEval = new ExploreEvaluator(profile.exploreWeight);

    this.entity.brain.addEvaluator(plantEval);
    this.entity.brain.addEvaluator(waterEval);
    this.entity.brain.addEvaluator(harvestEval);
    this.entity.brain.addEvaluator(pruneEval);
    this.entity.brain.addEvaluator(tradeEval);
    this.entity.brain.addEvaluator(exploreEval);

    this.evaluators = new Map([
      ["plant", plantEval],
      ["water", waterEval],
      ["harvest", harvestEval],
      ["prune", pruneEval],
      ["trade", tradeEval],
      ["explore", exploreEval],
    ]);
  }

  init(config: PlayerGovernorConfig): void {
    this.config = config;
  }

  get enabled(): boolean {
    return this._enabled;
  }

  set enabled(value: boolean) {
    this._enabled = value;
    if (!value) {
      this.reset();
    }
  }

  /** Called every frame from the game loop. Drives the state machine. */
  update(dt: number): void {
    if (!this._enabled || !this.config) return;

    switch (this.state) {
      case "idle":
        this.pauseTimer -= dt;
        if (this.pauseTimer <= 0) {
          this.decide();
        }
        break;

      case "navigating":
        this.navigate();
        break;

      case "acting":
        this.act();
        break;
    }
  }

  // ─────────────────────────────────────────
  // State: DECIDING
  // ─────────────────────────────────────────

  private decide(): void {
    this.stats.decisionsMade++;

    let bestAction: ActionType = "explore";
    let bestScore = 0;

    for (const [action, evaluator] of this.evaluators) {
      const score = evaluator.calculateDesirability(this.entity);
      if (score > bestScore) {
        bestScore = score;
        bestAction = action;
      }
    }

    const target = this.resolveTarget(bestAction);
    if (target) {
      this.currentTarget = target;
      this.navigateTo(target.tileX, target.tileZ);
    } else {
      // No valid target — pause and retry
      this.pauseTimer = ACTION_PAUSE;
      this.state = "idle";
    }
  }

  /** Find the specific tile + entity for the chosen action. */
  private resolveTarget(action: ActionType): ActionTarget | null {
    const playerTile = getPlayerTile();
    const px = playerTile?.gridX ?? 0;
    const pz = playerTile?.gridZ ?? 0;

    switch (action) {
      case "plant": {
        const tiles = findPlantableTiles();
        if (tiles.length === 0) return null;
        const speciesId = this.pickSpecies();
        if (!speciesId) return null;
        const tile = this.pickNearestTile(tiles, px, pz);
        const gc = tile?.get(GridCell);
        if (!gc) return null;
        return {
          action: "plant",
          tileX: gc.gridX,
          tileZ: gc.gridZ,
          speciesId,
        };
      }
      case "water": {
        const trees = findWaterableTrees();
        if (trees.length === 0) return null;
        const tree = this.pickNearestEntity(trees, px, pz);
        if (!tree) return null;
        const pos = tree.get(Position);
        return {
          action: "water",
          tileX: Math.round(pos?.x ?? 0),
          tileZ: Math.round(pos?.z ?? 0),
          entity: tree,
        };
      }
      case "harvest": {
        const trees = findHarvestableTrees();
        if (trees.length === 0) return null;
        const tree = this.pickNearestEntity(trees, px, pz);
        if (!tree) return null;
        const pos = tree.get(Position);
        return {
          action: "harvest",
          tileX: Math.round(pos?.x ?? 0),
          tileZ: Math.round(pos?.z ?? 0),
          entity: tree,
        };
      }
      case "prune": {
        const trees = findMatureTrees().filter((t) => {
          const tree = t.get(Tree);
          return tree && !tree.pruned;
        });
        if (trees.length === 0) return null;
        const tree = this.pickNearestEntity(trees, px, pz);
        if (!tree) return null;
        const pos = tree.get(Position);
        return {
          action: "prune",
          tileX: Math.round(pos?.x ?? 0),
          tileZ: Math.round(pos?.z ?? 0),
          entity: tree,
        };
      }
      case "trade":
        return { action: "trade", tileX: px, tileZ: pz };
      case "explore": {
        const bounds = this.config?.getWorldBounds();
        if (!bounds) return null;
        const rangeX = bounds.maxX - bounds.minX;
        const rangeZ = bounds.maxZ - bounds.minZ;
        const tx = bounds.minX + Math.floor(Math.random() * rangeX);
        const tz = bounds.minZ + Math.floor(Math.random() * rangeZ);
        return { action: "explore", tileX: tx, tileZ: tz };
      }
    }
  }

  // ─────────────────────────────────────────
  // State: NAVIGATING
  // ─────────────────────────────────────────

  private navigateTo(tileX: number, tileZ: number): void {
    if (!this.config) return;

    const playerTile = getPlayerTile();
    if (!playerTile) {
      this.state = "idle";
      this.pauseTimer = ACTION_PAUSE;
      return;
    }

    const start: TileCoord = { x: playerTile.gridX, z: playerTile.gridZ };
    const goal: TileCoord = { x: tileX, z: tileZ };

    // Already at the target
    if (start.x === goal.x && start.z === goal.z) {
      this.state = "acting";
      return;
    }

    const bounds = this.config.getWorldBounds();
    // Adapt koota grid cells to the miniplex-shaped input expected by
    // buildWalkabilityGrid during the coexistence period.
    const cellAdapters = koota
      .query(GridCell)
      .map((e) => ({ gridCell: e.get(GridCell) }));
    const grid = buildWalkabilityGrid(cellAdapters, bounds);
    const path = findPath(grid, start, goal);

    if (!path || path.length === 0) {
      // Can't reach — try walking to an adjacent tile
      this.stats.pathsFailed++;
      this.state = "idle";
      this.pauseTimer = ACTION_PAUSE;
      return;
    }

    this.pathState = createPathFollow(path);
    this.state = "navigating";
  }

  private navigate(): void {
    if (!this.config || !this.pathState) {
      this.state = "idle";
      return;
    }

    const player = koota.queryFirst(IsPlayer, Position);
    const pos = player?.get(Position);
    if (!player || !pos) {
      this.state = "idle";
      return;
    }

    const vec = advancePathFollow(this.pathState, {
      x: pos.x,
      z: pos.z,
    });
    this.config.movementRef.current = vec;

    if (this.pathState.done) {
      this.config.movementRef.current = { x: 0, z: 0 };
      this.pathState = null;
      this.stats.pathsCompleted++;
      this.state = "acting";
    }
  }

  // ─────────────────────────────────────────
  // State: ACTING
  // ─────────────────────────────────────────

  private act(): void {
    if (!this.currentTarget) {
      this.state = "idle";
      this.pauseTimer = ACTION_PAUSE;
      return;
    }

    const { action, entity, speciesId, tileX, tileZ } = this.currentTarget;

    switch (action) {
      case "plant":
        if (speciesId) {
          if (spendToolStamina("trowel")) {
            selectTool("trowel");
            if (plantTree(speciesId, tileX, tileZ)) {
              this.stats.plantsExecuted++;
            }
          }
        }
        break;

      case "water":
        if (entity) {
          if (spendToolStamina("watering-can")) {
            selectTool("watering-can");
            if (waterTree(entity)) {
              this.stats.watersExecuted++;
            }
          }
        }
        break;

      case "harvest":
        if (entity) {
          if (spendToolStamina("axe")) {
            selectTool("axe");
            if (harvestTree(entity)) {
              this.stats.harvestsExecuted++;
            }
          }
        }
        break;

      case "prune":
        if (entity) {
          if (spendToolStamina("pruning-shears")) {
            selectTool("pruning-shears");
            if (pruneTree(entity)) {
              this.stats.prunesExecuted++;
            }
          }
        }
        break;

      case "trade":
        this.doTrade();
        break;

      case "explore":
        this.stats.explores++;
        break;
    }

    this.currentTarget = null;
    this.pauseTimer = ACTION_PAUSE;
    this.state = "idle";
  }

  private doTrade(): void {
    const a = gameActions();
    const resources = koota.get(Resources);
    if (!resources) return;
    for (const rate of BASE_TRADE_RATES) {
      if (resources[rate.from] >= rate.fromAmount) {
        const result = executeTrade(rate, rate.fromAmount, resources);
        if (result) {
          a.spendResource(result.spend.type, result.spend.amount);
          a.addResource(result.gain.type, result.gain.amount);
          this.stats.tradesExecuted++;
          return;
        }
      }
    }
  }

  // ─────────────────────────────────────────
  // Helpers
  // ─────────────────────────────────────────

  private pickSpecies(): string | null {
    const resources = koota.get(Resources);
    const seeds = koota.get(Seeds) ?? {};
    if (!resources) return null;
    const LOW_THRESHOLD = 5;
    const neededResources: ResourceType[] = [];
    if (resources.sap < LOW_THRESHOLD) neededResources.push("sap");
    if (resources.fruit < LOW_THRESHOLD) neededResources.push("fruit");
    if (resources.acorns < LOW_THRESHOLD) neededResources.push("acorns");

    if (neededResources.length > 0) {
      for (const [sp, count] of Object.entries(seeds)) {
        if (count <= 0) continue;
        const species = getSpeciesById(sp);
        if (!species) continue;
        if (species.yield.some((y) => neededResources.includes(y.resource))) {
          return sp;
        }
      }
    }

    if (this.profile.preferredSpecies) {
      for (const sp of this.profile.preferredSpecies) {
        if ((seeds[sp] ?? 0) > 0 && getSpeciesById(sp)) return sp;
      }
    }

    for (const [sp, count] of Object.entries(seeds)) {
      if (count > 0 && getSpeciesById(sp)) return sp;
    }
    return null;
  }

  private pickNearestTile(
    tiles: Entity[],
    px: number,
    pz: number,
  ): Entity | undefined {
    let closest: Entity | undefined = tiles[0];
    let minDist = Number.POSITIVE_INFINITY;
    for (const tile of tiles) {
      const gc = tile.get(GridCell);
      if (!gc) continue;
      const dx = gc.gridX - px;
      const dz = gc.gridZ - pz;
      const dist = dx * dx + dz * dz;
      if (dist < minDist) {
        minDist = dist;
        closest = tile;
      }
    }
    return closest;
  }

  private pickNearestEntity(
    entities: Entity[],
    px: number,
    pz: number,
  ): Entity | undefined {
    let closest: Entity | undefined = entities[0];
    let minDist = Number.POSITIVE_INFINITY;
    for (const entity of entities) {
      const pos = entity.get(Position);
      if (!pos) continue;
      const dx = pos.x - px;
      const dz = pos.z - pz;
      const dist = dx * dx + dz * dz;
      if (dist < minDist) {
        minDist = dist;
        closest = entity;
      }
    }
    return closest;
  }

  private reset(): void {
    this.state = "idle";
    this.currentTarget = null;
    this.pathState = null;
    this.pauseTimer = 0;
    if (this.config) {
      this.config.movementRef.current = { x: 0, z: 0 };
    }
  }
}
