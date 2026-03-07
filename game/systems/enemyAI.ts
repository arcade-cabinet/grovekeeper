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
