import { GameEntity, GoalEvaluator } from "yuka";
import enemiesConfig from "@/config/game/enemies.json" with { type: "json" };
import type { Entity, Position } from "@/game/ecs/world";

const { tierScaling } = enemiesConfig;

function distanceBetween(a: Position, b: Position): number {
  const dx = a.x - b.x;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dz * dz);
}

function scaleStatByTier(base: number, tier: number, perTier: number): number {
  return base * perTier ** (tier - 1);
}

export function getScaledHealth(baseHealth: number, tier: number): number {
  return Math.round(
    scaleStatByTier(baseHealth, tier, tierScaling.healthPerTier),
  );
}

export function getScaledAttack(baseAttack: number, tier: number): number {
  return Math.round(
    scaleStatByTier(baseAttack, tier, tierScaling.attackPerTier),
  );
}

export interface AIState {
  mode: "idle" | "aggro" | "returning";
  homeX: number;
  homeZ: number;
  patrolAngle: number;
  timeSinceLastAttack: number;
}

export function createAIState(homeX: number, homeZ: number): AIState {
  return {
    mode: "idle",
    homeX,
    homeZ,
    patrolAngle: 0,
    timeSinceLastAttack: 0,
  };
}

export function updatePatrol(
  entity: Entity,
  ai: AIState,
  dt: number,
  patrolSpeed: number,
  patrolRadius: number,
): void {
  if (!entity.position) return;

  ai.patrolAngle += dt * patrolSpeed;
  entity.position.x =
    ai.homeX + Math.cos(ai.patrolAngle) * patrolRadius;
  entity.position.z =
    ai.homeZ + Math.sin(ai.patrolAngle) * patrolRadius;
}

export function updateGuard(
  entity: Entity,
  ai: AIState,
  dt: number,
  guardSway: number,
): void {
  if (!entity.position) return;

  ai.patrolAngle += dt * guardSway;
  entity.position.x = ai.homeX + Math.sin(ai.patrolAngle) * 0.5;
  entity.position.z = ai.homeZ + Math.cos(ai.patrolAngle) * 0.5;
}

export function checkAggro(
  entityPos: Position,
  playerPos: Position,
  aggroRange: number,
  deaggroRange: number,
  currentMode: AIState["mode"],
): AIState["mode"] {
  const dist = distanceBetween(entityPos, playerPos);

  if (currentMode === "aggro") {
    return dist > deaggroRange ? "returning" : "aggro";
  }

  if (dist <= aggroRange) {
    return "aggro";
  }

  return "idle";
}

export function moveToward(
  entity: Entity,
  targetX: number,
  targetZ: number,
  speed: number,
  dt: number,
): boolean {
  if (!entity.position) return false;

  const dx = targetX - entity.position.x;
  const dz = targetZ - entity.position.z;
  const dist = Math.sqrt(dx * dx + dz * dz);

  if (dist < 0.1) return true;

  const step = Math.min(speed * dt, dist);
  entity.position.x += (dx / dist) * step;
  entity.position.z += (dz / dist) * step;
  return false;
}

export function canAttack(
  entityPos: Position,
  targetPos: Position,
  attackRange: number,
  cooldownRemaining: number,
): boolean {
  return (
    distanceBetween(entityPos, targetPos) <= attackRange &&
    cooldownRemaining <= 0
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Yuka-backed EnemyBrain
// ─────────────────────────────────────────────────────────────────────────────

export interface EnemyBrainContext {
  playerX: number;
  playerZ: number;
  enemyX: number;
  enemyZ: number;
  homeX: number;
  homeZ: number;
  aggroRange: number;
  deaggroRange: number;
}

export type EnemyAIMode = "idle" | "aggro" | "returning";
export type EnemyBehavior = "patrol" | "guard" | "swarm" | "ambush";

// Yuka entity wrapper — carries transient context and behavior config
class EnemyEntity extends GameEntity {
  ctx: EnemyBrainContext | null = null;
  behavior: EnemyBehavior = "patrol";
  currentMode: EnemyAIMode = "idle";
}

// Aggro evaluator — behavior modifies effective aggro range:
//   swarm:  1.2× range (group sensitivity)
//   ambush: 0.5× range (surprise at close quarters)
//   patrol/guard: standard range
// Once aggro'd, the enemy chases until player exits deaggroRange (hysteresis).
class AggroEvaluator extends GoalEvaluator<EnemyEntity> {
  calculateDesirability(entity: EnemyEntity): number {
    const ctx = entity.ctx;
    if (!ctx) return 0;

    const dist = Math.sqrt(
      (ctx.playerX - ctx.enemyX) ** 2 + (ctx.playerZ - ctx.enemyZ) ** 2,
    );

    // Already aggro'd: maintain pursuit while player is within deaggro range
    if (entity.currentMode === "aggro") {
      return dist <= ctx.deaggroRange ? this.characterBias * 0.9 : 0;
    }

    // Initial aggro trigger — behavior modifies effective range
    const rangeMult =
      entity.behavior === "swarm" ? 1.2 :
      entity.behavior === "ambush" ? 0.5 : 1.0;
    const effectiveRange = ctx.aggroRange * rangeMult;

    if (dist > effectiveRange) return 0;
    return this.characterBias * (1 - dist / (effectiveRange + 0.001));
  }
  setGoal(): void {}
}

// Return evaluator — triggers when player exits deaggro range
class ReturnEvaluator extends GoalEvaluator<EnemyEntity> {
  calculateDesirability(entity: EnemyEntity): number {
    const ctx = entity.ctx;
    if (!ctx) return 0;
    if (entity.currentMode !== "aggro") return 0;

    const dist = Math.sqrt(
      (ctx.playerX - ctx.enemyX) ** 2 + (ctx.playerZ - ctx.enemyZ) ** 2,
    );
    return dist > ctx.deaggroRange ? this.characterBias * 0.8 : 0;
  }
  setGoal(): void {}
}

// Idle evaluator — lowest priority fallback
class IdleEvaluator extends GoalEvaluator<EnemyEntity> {
  calculateDesirability(): number {
    return this.characterBias * 0.05;
  }
  setGoal(): void {}
}

type EvaluatorTag = "aggro" | "returning" | "idle";

interface TaggedEval {
  tag: EvaluatorTag;
  ev: GoalEvaluator<EnemyEntity>;
}

/**
 * Yuka-backed enemy AI brain.
 * Each enemy entity gets one EnemyBrain instance, managed by EnemyEntityManager.
 * Behavior (patrol/guard/swarm/ambush) modifies evaluator weights — same class
 * handles all 4 via the entity.behavior field.
 */
export class EnemyBrain {
  readonly entityId: string;
  readonly enemyType: string;
  readonly behavior: EnemyBehavior;

  private readonly entity: EnemyEntity;
  private readonly evaluators: TaggedEval[];
  private currentMode: EnemyAIMode = "idle";

  constructor(
    entityId: string,
    enemyType: string,
    behavior: EnemyBehavior,
  ) {
    this.entityId = entityId;
    this.enemyType = enemyType;
    this.behavior = behavior;

    this.entity = new EnemyEntity();
    this.entity.behavior = behavior;

    const aggroEv = new AggroEvaluator(1);
    const returnEv = new ReturnEvaluator(1);
    const idleEv = new IdleEvaluator(1);

    this.evaluators = [
      { tag: "aggro", ev: aggroEv },
      { tag: "returning", ev: returnEv },
      { tag: "idle", ev: idleEv },
    ];
  }

  /** Evaluate AI state for this frame. Returns the new mode. */
  update(_dt: number, ctx: EnemyBrainContext): EnemyAIMode {
    this.entity.ctx = ctx;
    this.entity.currentMode = this.currentMode;

    let bestTag: EvaluatorTag = "idle";
    let bestScore = 0;
    for (const { tag, ev } of this.evaluators) {
      const score = ev.calculateDesirability(this.entity);
      if (score > bestScore) {
        bestScore = score;
        bestTag = tag;
      }
    }

    this.entity.ctx = null;
    this.currentMode = bestTag;
    return this.currentMode;
  }

  getMode(): EnemyAIMode {
    return this.currentMode;
  }

  dispose(): void {
    this.entity.ctx = null;
    this.currentMode = "idle";
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// EnemyEntityManager — module-level registry for all active enemy brains
// ─────────────────────────────────────────────────────────────────────────────

const _registry = new Map<string, EnemyBrain>();

export const EnemyEntityManager = {
  /** Register a new enemy brain. */
  register(brain: EnemyBrain): void {
    _registry.set(brain.entityId, brain);
  },

  /** Retrieve brain by entity ID. */
  get(entityId: string): EnemyBrain | undefined {
    return _registry.get(entityId);
  },

  /** Remove and dispose brain by entity ID. */
  remove(entityId: string): void {
    const brain = _registry.get(entityId);
    brain?.dispose();
    _registry.delete(entityId);
  },

  /**
   * Tick all registered brains.
   * getCtx receives the entityId and should return current position/context,
   * or null if the entity is no longer valid.
   */
  updateAll(
    dt: number,
    getCtx: (entityId: string) => EnemyBrainContext | null,
  ): void {
    for (const [id, brain] of _registry) {
      const ctx = getCtx(id);
      if (ctx) brain.update(dt, ctx);
    }
  },

  /** Remove all brains (e.g. on chunk unload or game reset). */
  clear(): void {
    for (const brain of _registry.values()) brain.dispose();
    _registry.clear();
  },

  get size(): number {
    return _registry.size;
  },
};
