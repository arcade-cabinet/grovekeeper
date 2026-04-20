import { GameEntity, GoalEvaluator, Think } from "yuka";
import type { WalkabilityGrid } from "@/input/pathfinding";
import {
  cancelNpcMovement,
  isNpcMoving,
  startNpcPath,
} from "@/systems/npcMovement";

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────

export type NpcBehavior =
  | "idle"
  | "wandering"
  | "approaching"
  | "returning"
  | "tutorial_guide";

export interface NpcBrainContext {
  /** Pre-built walkability grid for pathfinding. */
  grid: WalkabilityGrid;
  /** Player's current world position. */
  playerX: number;
  playerZ: number;
  /** NPC's current world position (from ECS). */
  npcX: number;
  npcZ: number;
  /** NPC's home position (spawn point). */
  homeX: number;
  homeZ: number;
  /** Chebyshev distance to player. */
  distToPlayer: number;
}

// ──────────────────────────────────────────────
// Configuration
// ──────────────────────────────────────────────

const WANDER_RANGE = 3;
const WANDER_INTERVAL = 8;
const NOTICE_RANGE = 6;
const APPROACH_RANGE = 3;
const ADJACENT_RANGE = 1.5;

// ──────────────────────────────────────────────
// Yuka Entity wrapper
// ──────────────────────────────────────────────

class NpcEntity extends GameEntity {
  brain: Think<NpcEntity>;
  /** Transient context set each frame before evaluation. */
  ctx: NpcBrainContext | null = null;
  /** Seconds remaining until next wander attempt. */
  wanderTimer = 0;

  constructor() {
    super();
    this.brain = new Think<NpcEntity>(this);
  }
}

// ──────────────────────────────────────────────
// GoalEvaluators
// ──────────────────────────────────────────────

class IdleEvaluator extends GoalEvaluator<NpcEntity> {
  calculateDesirability(): number {
    return this.characterBias * 0.1;
  }
  setGoal(): void {
    /* Unused — we dispatch behaviors manually, not via Yuka goals */
  }
}

class WanderEvaluator extends GoalEvaluator<NpcEntity> {
  calculateDesirability(entity: NpcEntity): number {
    if (entity.wanderTimer > 0) return 0;
    return this.characterBias * 0.15;
  }
  setGoal(): void {
    /* Unused — we dispatch behaviors manually, not via Yuka goals */
  }
}

class ApproachPlayerEvaluator extends GoalEvaluator<NpcEntity> {
  calculateDesirability(entity: NpcEntity): number {
    const ctx = entity.ctx;
    if (!ctx) return 0;
    if (ctx.distToPlayer <= ADJACENT_RANGE) return 0;
    if (ctx.distToPlayer > NOTICE_RANGE) return 0;
    if (ctx.distToPlayer <= APPROACH_RANGE) {
      return this.characterBias * 0.5;
    }
    // Within notice range but beyond approach range — mild interest
    return this.characterBias * 0.3;
  }
  setGoal(): void {
    /* Unused — we dispatch behaviors manually, not via Yuka goals */
  }
}

class ReturnHomeEvaluator extends GoalEvaluator<NpcEntity> {
  calculateDesirability(entity: NpcEntity): number {
    const ctx = entity.ctx;
    if (!ctx) return 0;
    // Only return home if player is far away AND NPC is far from home
    if (ctx.distToPlayer <= NOTICE_RANGE) return 0;
    const homeDist = Math.max(
      Math.abs(ctx.npcX - ctx.homeX),
      Math.abs(ctx.npcZ - ctx.homeZ),
    );
    if (homeDist <= 2) return 0;
    return this.characterBias * 0.6;
  }
  setGoal(): void {
    /* Unused — we dispatch behaviors manually, not via Yuka goals */
  }
}

// ──────────────────────────────────────────────
// Evaluator type tag for mapping results to behaviors
// ──────────────────────────────────────────────

type EvaluatorTag = "idle" | "wander" | "approach" | "return";

interface TaggedEvaluator {
  tag: EvaluatorTag;
  evaluator: GoalEvaluator<NpcEntity>;
}

// ──────────────────────────────────────────────
// NpcBrain
// ──────────────────────────────────────────────

export class NpcBrain {
  readonly entityId: string;
  readonly templateId: string;

  private readonly entity: NpcEntity;
  private readonly taggedEvaluators: TaggedEvaluator[];

  private currentBehavior: NpcBehavior = "idle";
  private readonly homeX: number;
  private readonly homeZ: number;

  /** Tutorial override — when set, normal AI is suppressed. */
  private tutorialOverride: {
    targetX: number;
    targetZ: number;
    onArrival?: () => void;
    started: boolean;
  } | null = null;

  constructor(
    entityId: string,
    templateId: string,
    homeX: number,
    homeZ: number,
  ) {
    this.entityId = entityId;
    this.templateId = templateId;
    this.homeX = homeX;
    this.homeZ = homeZ;

    this.entity = new NpcEntity();
    // Stagger initial wander timer so NPCs don't all wander at once
    this.entity.wanderTimer = Math.random() * WANDER_INTERVAL;

    const idleEval = new IdleEvaluator(1);
    const wanderEval = new WanderEvaluator(1);
    const approachEval = new ApproachPlayerEvaluator(1);
    const returnEval = new ReturnHomeEvaluator(1);

    this.entity.brain.addEvaluator(idleEval);
    this.entity.brain.addEvaluator(wanderEval);
    this.entity.brain.addEvaluator(approachEval);
    this.entity.brain.addEvaluator(returnEval);

    this.taggedEvaluators = [
      { tag: "idle", evaluator: idleEval },
      { tag: "wander", evaluator: wanderEval },
      { tag: "approach", evaluator: approachEval },
      { tag: "return", evaluator: returnEval },
    ];
  }

  /** Called each frame from the game loop. */
  update(dt: number, ctx: NpcBrainContext): NpcBehavior {
    // Tutorial override takes priority over normal AI
    if (this.tutorialOverride) {
      return this.handleTutorialOverride(ctx);
    }

    // Decrement wander timer
    this.entity.wanderTimer = Math.max(0, this.entity.wanderTimer - dt);

    // If currently moving, wait for movement to complete
    if (isNpcMoving(this.entityId)) {
      return this.currentBehavior;
    }

    // Movement just completed — reset to idle so we re-evaluate
    if (
      this.currentBehavior === "wandering" ||
      this.currentBehavior === "approaching" ||
      this.currentBehavior === "returning"
    ) {
      this.currentBehavior = "idle";
    }

    // Set transient context for evaluators
    this.entity.ctx = ctx;

    // Evaluate all goals manually (like PlayerGovernor)
    let bestTag: EvaluatorTag = "idle";
    let bestScore = 0;
    for (const { tag, evaluator } of this.taggedEvaluators) {
      const score = evaluator.calculateDesirability(this.entity);
      if (score > bestScore) {
        bestScore = score;
        bestTag = tag;
      }
    }

    // Clear transient context
    this.entity.ctx = null;

    // Execute the winning behavior
    switch (bestTag) {
      case "wander":
        this.executeWander(ctx);
        break;
      case "approach":
        this.executeApproach(ctx);
        break;
      case "return":
        this.executeReturn(ctx);
        break;
      default:
        this.currentBehavior = "idle";
        break;
    }

    return this.currentBehavior;
  }

  /** Set a tutorial override — NPC walks to target, ignoring normal AI. */
  setTutorialTarget(
    targetX: number,
    targetZ: number,
    onArrival?: () => void,
  ): void {
    cancelNpcMovement(this.entityId);
    this.tutorialOverride = { targetX, targetZ, onArrival, started: false };
    this.currentBehavior = "tutorial_guide";
  }

  /** Clear tutorial override, return to normal AI. */
  clearTutorialTarget(): void {
    this.tutorialOverride = null;
    cancelNpcMovement(this.entityId);
    this.currentBehavior = "idle";
  }

  /** Get current behavior state. */
  getBehavior(): NpcBehavior {
    return this.currentBehavior;
  }

  /** Get the NPC's spawn/home position. */
  get homePosition(): { x: number; z: number } {
    return { x: this.homeX, z: this.homeZ };
  }

  /** Clean up resources. */
  dispose(): void {
    cancelNpcMovement(this.entityId);
    this.tutorialOverride = null;
    this.currentBehavior = "idle";
    this.entity.ctx = null;
  }

  // ──────────────────────────────────────────────
  // Behavior executors
  // ──────────────────────────────────────────────

  private executeWander(ctx: NpcBrainContext): void {
    // Pick a random walkable tile within WANDER_RANGE of home
    const offsetX =
      Math.floor(Math.random() * (WANDER_RANGE * 2 + 1)) - WANDER_RANGE;
    const offsetZ =
      Math.floor(Math.random() * (WANDER_RANGE * 2 + 1)) - WANDER_RANGE;
    const targetX = this.homeX + offsetX;
    const targetZ = this.homeZ + offsetZ;

    const started = startNpcPath(
      this.entityId,
      ctx.npcX,
      ctx.npcZ,
      targetX,
      targetZ,
      ctx.grid,
    );

    if (started) {
      this.currentBehavior = "wandering";
    } else {
      this.currentBehavior = "idle";
    }

    // Reset wander timer regardless of success
    this.entity.wanderTimer = WANDER_INTERVAL;
  }

  private executeApproach(ctx: NpcBrainContext): void {
    // Walk to a tile adjacent to the player, not the exact player tile
    const dx = ctx.npcX - ctx.playerX;
    const dz = ctx.npcZ - ctx.playerZ;
    const dist = Math.max(Math.abs(dx), Math.abs(dz));

    // Pick an offset direction toward the NPC's current side
    const offsetX = dist > 0 ? Math.sign(dx) : 1;
    const offsetZ = dist > 0 ? Math.sign(dz) : 0;
    const targetX = Math.round(ctx.playerX) + offsetX;
    const targetZ = Math.round(ctx.playerZ) + offsetZ;

    const started = startNpcPath(
      this.entityId,
      ctx.npcX,
      ctx.npcZ,
      targetX,
      targetZ,
      ctx.grid,
    );

    if (started) {
      this.currentBehavior = "approaching";
    } else {
      this.currentBehavior = "idle";
    }
  }

  private executeReturn(ctx: NpcBrainContext): void {
    const started = startNpcPath(
      this.entityId,
      ctx.npcX,
      ctx.npcZ,
      this.homeX,
      this.homeZ,
      ctx.grid,
    );

    if (started) {
      this.currentBehavior = "returning";
    } else {
      this.currentBehavior = "idle";
    }
  }

  // ──────────────────────────────────────────────
  // Tutorial override handler
  // ──────────────────────────────────────────────

  private handleTutorialOverride(ctx: NpcBrainContext): NpcBehavior {
    if (!this.tutorialOverride) return this.currentBehavior;

    // Start path if not yet started
    if (!this.tutorialOverride.started) {
      const started = startNpcPath(
        this.entityId,
        ctx.npcX,
        ctx.npcZ,
        this.tutorialOverride.targetX,
        this.tutorialOverride.targetZ,
        ctx.grid,
      );
      this.tutorialOverride.started = true;
      if (!started) {
        // Can't reach target — clear override first, then fire callback
        const cb = this.tutorialOverride.onArrival;
        this.tutorialOverride = null;
        this.currentBehavior = "idle";
        cb?.();
        return this.currentBehavior;
      }
    }

    // Check if arrived (movement complete)
    if (!isNpcMoving(this.entityId)) {
      const dx = Math.abs(ctx.npcX - this.tutorialOverride.targetX);
      const dz = Math.abs(ctx.npcZ - this.tutorialOverride.targetZ);
      const chebyshev = Math.max(dx, dz);

      if (chebyshev < ADJACENT_RANGE) {
        const cb = this.tutorialOverride.onArrival;
        this.tutorialOverride = null;
        this.currentBehavior = "idle";
        cb?.();
      }
    }

    return this.currentBehavior;
  }
}
