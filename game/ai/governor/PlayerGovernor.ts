/**
 * PlayerGovernor -- Visual AI that walks the player around and takes actions.
 * State machine: IDLE -> DECIDING -> NAVIGATING -> ACTING -> IDLE
 */

import type { GoalEvaluator } from "yuka";
import {
  harvestTree,
  plantTree,
  pruneTree,
  selectTool,
  spendToolStamina,
  waterTree,
} from "@/game/actions";
import { useGameStore } from "@/game/stores";
import type { PathFollowState } from "@/game/systems/pathFollowing";
import { BASE_TRADE_RATES, executeTrade } from "@/game/systems/trading";
import { GovernorEntity } from "./entity.ts";
import {
  ExploreEvaluator,
  HarvestEvaluator,
  PlantEvaluator,
  PruneEvaluator,
  TradeEvaluator,
  WaterEvaluator,
} from "./evaluators.ts";
import { advanceNav, buildNavPath } from "./navigation.ts";
import { resolveTarget } from "./targeting.ts";
import {
  ACTION_PAUSE,
  type ActionTarget,
  type ActionType,
  DEFAULT_PROFILE,
  type GovernorProfile,
  type GovernorState,
  type PlayerGovernorConfig,
} from "./types.ts";

export class PlayerGovernor {
  private entity: GovernorEntity;
  private profile: GovernorProfile;
  private config: PlayerGovernorConfig | null = null;
  private _enabled = false;

  private state: GovernorState = "idle";
  private currentTarget: ActionTarget | null = null;
  private pathState: PathFollowState | null = null;
  private pauseTimer = 0;

  private evaluators: Map<ActionType, GoalEvaluator<GovernorEntity>>;

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

  private exploreCountRef = { current: 0 };

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
    if (!value) this.reset();
  }

  update(dt: number): void {
    if (!this._enabled || !this.config) return;
    switch (this.state) {
      case "idle":
        this.pauseTimer -= dt;
        if (this.pauseTimer <= 0) this.decide();
        break;
      case "navigating":
        this.tickNavigate();
        break;
      case "acting":
        this.act();
        break;
    }
  }

  // ─── DECIDING ────────────────────────────────

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

    if (!this.config) return;
    const target = resolveTarget(bestAction, this.config, this.profile, this.exploreCountRef);
    if (target) {
      this.currentTarget = target;
      this.startNav(target.tileX, target.tileZ);
    } else {
      this.pauseTimer = ACTION_PAUSE;
      this.state = "idle";
    }
  }

  // ─── NAVIGATING ──────────────────────────────

  private startNav(tileX: number, tileZ: number): void {
    if (!this.config) return;
    const result = buildNavPath(this.config, tileX, tileZ);
    if (result === "at_goal") {
      this.state = "acting";
    } else if (result === null) {
      this.stats.pathsFailed++;
      this.pauseTimer = ACTION_PAUSE;
      this.state = "idle";
    } else {
      this.pathState = result;
      this.state = "navigating";
    }
  }

  private tickNavigate(): void {
    if (!this.config || !this.pathState) {
      this.state = "idle";
      return;
    }
    const done = advanceNav(this.pathState, this.config);
    if (done) {
      this.pathState = null;
      this.stats.pathsCompleted++;
      this.state = "acting";
    }
  }

  // ─── ACTING ──────────────────────────────────

  private act(): void {
    if (!this.currentTarget) {
      this.pauseTimer = ACTION_PAUSE;
      this.state = "idle";
      return;
    }
    const { action, entityId, speciesId, tileX, tileZ } = this.currentTarget;

    switch (action) {
      case "plant":
        if (speciesId && spendToolStamina("trowel")) {
          selectTool("trowel");
          if (plantTree(speciesId, tileX, tileZ)) this.stats.plantsExecuted++;
        }
        break;
      case "water":
        if (entityId && spendToolStamina("watering-can")) {
          selectTool("watering-can");
          if (waterTree(entityId)) this.stats.watersExecuted++;
        }
        break;
      case "harvest":
        if (entityId && spendToolStamina("axe")) {
          selectTool("axe");
          if (harvestTree(entityId)) this.stats.harvestsExecuted++;
        }
        break;
      case "prune":
        if (entityId && spendToolStamina("pruning-shears")) {
          selectTool("pruning-shears");
          if (pruneTree(entityId)) this.stats.prunesExecuted++;
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
    const store = useGameStore.getState();
    for (const rate of BASE_TRADE_RATES) {
      if (store.resources[rate.from] >= rate.fromAmount) {
        const result = executeTrade(rate, rate.fromAmount, store.resources);
        if (result) {
          store.spendResource(result.spend.type, result.spend.amount);
          store.addResource(result.gain.type, result.gain.amount);
          this.stats.tradesExecuted++;
          return;
        }
      }
    }
  }

  private reset(): void {
    this.state = "idle";
    this.currentTarget = null;
    this.pathState = null;
    this.pauseTimer = 0;
    if (this.config) this.config.movementRef.current = { x: 0, z: 0 };
  }
}
