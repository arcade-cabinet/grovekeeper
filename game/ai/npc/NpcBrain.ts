/**
 * NpcBrain -- Yuka-based NPC AI with idle/wander/approach/return behaviors.
 */

import { useGameStore } from "@/game/stores";
import { cancelNpcMovement, isNpcMoving, startNpcPath } from "@/game/systems/npcMovement";
import { scopedRNG } from "@/game/utils/seedWords";
import { ADJACENT_RANGE, WANDER_INTERVAL, WANDER_RANGE } from "./config.ts";
import { NpcEntity } from "./entity.ts";
import {
  ApproachPlayerEvaluator,
  IdleEvaluator,
  ReturnHomeEvaluator,
  WanderEvaluator,
} from "./evaluators.ts";
import type { EvaluatorTag, NpcBehavior, NpcBrainContext, TaggedEvaluator } from "./types.ts";

export class NpcBrain {
  readonly entityId: string;
  readonly templateId: string;

  private readonly entity: NpcEntity;
  private readonly taggedEvaluators: TaggedEvaluator<NpcEntity>[];

  private currentBehavior: NpcBehavior = "idle";
  private readonly homeX: number;
  private readonly homeZ: number;
  /** Counter for wander decisions -- unique per wander so destination varies. */
  private wanderDecisionCount = 0;

  /** Tutorial override -- when set, normal AI is suppressed. */
  private tutorialOverride: {
    targetX: number;
    targetZ: number;
    onArrival?: () => void;
    started: boolean;
  } | null = null;

  constructor(entityId: string, templateId: string, homeX: number, homeZ: number) {
    this.entityId = entityId;
    this.templateId = templateId;
    this.homeX = homeX;
    this.homeZ = homeZ;

    this.entity = new NpcEntity();
    // Stagger initial wander timer so NPCs don't all wander at once
    const worldSeed = useGameStore.getState().worldSeed;
    const staggerRng = scopedRNG("npc-wander-stagger", worldSeed, entityId);
    this.entity.wanderTimer = staggerRng() * WANDER_INTERVAL;

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

    // Movement just completed -- reset to idle so we re-evaluate
    if (
      this.currentBehavior === "wandering" ||
      this.currentBehavior === "approaching" ||
      this.currentBehavior === "returning"
    ) {
      this.currentBehavior = "idle";
    }

    // Set transient context for evaluators
    this.entity.ctx = ctx;

    // Evaluate all goals manually
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

  /** Set a tutorial override -- NPC walks to target, ignoring normal AI. */
  setTutorialTarget(targetX: number, targetZ: number, onArrival?: () => void): void {
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
    const worldSeed = useGameStore.getState().worldSeed;
    const rng = scopedRNG("npc-wander", worldSeed, this.entityId, this.wanderDecisionCount++);
    const offsetX = Math.floor(rng() * (WANDER_RANGE * 2 + 1)) - WANDER_RANGE;
    const offsetZ = Math.floor(rng() * (WANDER_RANGE * 2 + 1)) - WANDER_RANGE;
    const targetX = this.homeX + offsetX;
    const targetZ = this.homeZ + offsetZ;

    const started = startNpcPath(this.entityId, ctx.npcX, ctx.npcZ, targetX, targetZ, ctx.grid);
    this.currentBehavior = started ? "wandering" : "idle";
    this.entity.wanderTimer = WANDER_INTERVAL;
  }

  private executeApproach(ctx: NpcBrainContext): void {
    const dx = ctx.npcX - ctx.playerX;
    const dz = ctx.npcZ - ctx.playerZ;
    const dist = Math.max(Math.abs(dx), Math.abs(dz));

    const offsetX = dist > 0 ? Math.sign(dx) : 1;
    const offsetZ = dist > 0 ? Math.sign(dz) : 0;
    const targetX = Math.round(ctx.playerX) + offsetX;
    const targetZ = Math.round(ctx.playerZ) + offsetZ;

    const started = startNpcPath(this.entityId, ctx.npcX, ctx.npcZ, targetX, targetZ, ctx.grid);
    this.currentBehavior = started ? "approaching" : "idle";
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
    this.currentBehavior = started ? "returning" : "idle";
  }

  // ──────────────────────────────────────────────
  // Tutorial override handler
  // ──────────────────────────────────────────────

  private handleTutorialOverride(ctx: NpcBrainContext): NpcBehavior {
    if (!this.tutorialOverride) return this.currentBehavior;

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
        const cb = this.tutorialOverride.onArrival;
        this.tutorialOverride = null;
        this.currentBehavior = "idle";
        cb?.();
        return this.currentBehavior;
      }
    }

    if (!isNpcMoving(this.entityId)) {
      const dx = Math.abs(ctx.npcX - this.tutorialOverride.targetX);
      const dz = Math.abs(ctx.npcZ - this.tutorialOverride.targetZ);
      if (Math.max(dx, dz) < ADJACENT_RANGE) {
        const cb = this.tutorialOverride.onArrival;
        this.tutorialOverride = null;
        this.currentBehavior = "idle";
        cb?.();
      }
    }

    return this.currentBehavior;
  }
}
