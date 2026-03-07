/**
 * Combat system — pure functions for damage, knockback, and health tracking.
 *
 * No ECS world, no Rapier, no R3F dependencies.
 * Callers (R3F components) translate knockback vectors into Rapier impulses.
 *
 * Spec §34.2 Combat Mechanics:
 *   - Damage = tool.effectPower × difficulty.damageMultiplier
 *   - Player damage = enemy.attackPower × difficulty.incomingDamageMultiplier
 *   - Enemy knockback on hit (returned as impulse vector)
 *   - Invulnerability window prevents damage stacking
 */

import combatConfig from "@/config/game/combat.json" with { type: "json" };
import type { CombatComponent, HealthComponent } from "@/game/ecs/components/combat";

const { invulnSeconds } = combatConfig;

// ---------------------------------------------------------------------------
// Damage calculation — Spec §34.2
// ---------------------------------------------------------------------------

/**
 * Compute outgoing damage from a player tool hit.
 * Spec §34.2: Damage = tool.effectPower × difficulty.damageMultiplier
 * Returns 0 in Explore mode (damageMultiplier = 0).
 */
export function computePlayerDamage(effectPower: number, damageMultiplier: number): number {
  return effectPower * damageMultiplier;
}

/**
 * Compute incoming damage from an enemy attack.
 * Spec §34.2: Player damage = enemy.attackPower × difficulty.incomingDamageMultiplier
 * Returns 0 in Explore mode (incomingDamageMultiplier = 0).
 */
export function computeEnemyDamage(attackPower: number, incomingDamageMultiplier: number): number {
  return attackPower * incomingDamageMultiplier;
}

// ---------------------------------------------------------------------------
// Health operations — Spec §34.2
// ---------------------------------------------------------------------------

/**
 * Apply damage to a health component.
 * Skips if the entity is still within the invulnerability window.
 * Mutates health in place.
 */
export function applyDamageToHealth(health: HealthComponent, amount: number, source: string): void {
  if (health.invulnFrames > 0) return;

  health.current = Math.max(0, health.current - amount);
  health.lastDamageSource = source;

  if (amount > 0) {
    health.invulnFrames = invulnSeconds;
  }
}

/**
 * Returns true if the entity has been defeated (health.current <= 0).
 */
export function isDefeated(health: HealthComponent): boolean {
  return health.current <= 0;
}

/**
 * Tick the invulnerability timer down by dt seconds. Clamps to 0.
 */
export function tickInvulnFrames(health: HealthComponent, dt: number): void {
  health.invulnFrames = Math.max(0, health.invulnFrames - dt);
}

// ---------------------------------------------------------------------------
// Knockback — Spec §34.2: enemy knockback on hit
// ---------------------------------------------------------------------------

/**
 * Compute a knockback impulse vector pointing from attacker to target.
 * Returns { x: 0, z: 0 } when positions are identical to avoid NaN.
 *
 * Caller applies this as a Rapier rigid body impulse on the hit entity.
 */
export function computeKnockback(
  fromX: number,
  fromZ: number,
  toX: number,
  toZ: number,
  force: number,
): { x: number; z: number } {
  const dx = toX - fromX;
  const dz = toZ - fromZ;
  const dist = Math.sqrt(dx * dx + dz * dz);

  if (dist < 0.001) return { x: 0, z: 0 };

  return {
    x: (dx / dist) * force,
    z: (dz / dist) * force,
  };
}

// ---------------------------------------------------------------------------
// Attack cooldown — rate limiting
// ---------------------------------------------------------------------------

/**
 * Tick the attack cooldown timer down by dt seconds. Clamps to 0.
 */
export function tickAttackCooldown(combat: CombatComponent, dt: number): void {
  combat.cooldownRemaining = Math.max(0, combat.cooldownRemaining - dt);
}
