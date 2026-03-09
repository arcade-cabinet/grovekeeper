/**
 * Yuka GoalEvaluators for NPC AI behaviors.
 */

import { GoalEvaluator } from "yuka";
import { ADJACENT_RANGE, APPROACH_RANGE, NOTICE_RANGE } from "./config.ts";
import type { NpcEntity } from "./entity.ts";

export class IdleEvaluator extends GoalEvaluator<NpcEntity> {
  calculateDesirability(): number {
    return this.characterBias * 0.1;
  }
  setGoal(): void {
    /* Unused -- behaviors are dispatched manually, not via Yuka goals */
  }
}

export class WanderEvaluator extends GoalEvaluator<NpcEntity> {
  calculateDesirability(entity: NpcEntity): number {
    if (entity.wanderTimer > 0) return 0;
    return this.characterBias * 0.15;
  }
  setGoal(): void {
    /* Unused -- behaviors are dispatched manually, not via Yuka goals */
  }
}

export class ApproachPlayerEvaluator extends GoalEvaluator<NpcEntity> {
  calculateDesirability(entity: NpcEntity): number {
    const ctx = entity.ctx;
    if (!ctx) return 0;
    if (ctx.distToPlayer <= ADJACENT_RANGE) return 0;
    if (ctx.distToPlayer > NOTICE_RANGE) return 0;
    if (ctx.distToPlayer <= APPROACH_RANGE) {
      return this.characterBias * 0.5;
    }
    // Within notice range but beyond approach range -- mild interest
    return this.characterBias * 0.3;
  }
  setGoal(): void {
    /* Unused -- behaviors are dispatched manually, not via Yuka goals */
  }
}

export class ReturnHomeEvaluator extends GoalEvaluator<NpcEntity> {
  calculateDesirability(entity: NpcEntity): number {
    const ctx = entity.ctx;
    if (!ctx) return 0;
    // Only return home if player is far away AND NPC is far from home
    if (ctx.distToPlayer <= NOTICE_RANGE) return 0;
    const homeDist = Math.max(Math.abs(ctx.npcX - ctx.homeX), Math.abs(ctx.npcZ - ctx.homeZ));
    if (homeDist <= 2) return 0;
    return this.characterBias * 0.6;
  }
  setGoal(): void {
    /* Unused -- behaviors are dispatched manually, not via Yuka goals */
  }
}
