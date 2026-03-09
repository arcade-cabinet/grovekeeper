/**
 * Trap system — pure functions for placement, triggering, and damage.
 *
 * No ECS world, no R3F, no Rapier dependencies.
 * Callers (R3F components) integrate with the ECS world for entity lifecycle.
 *
 * Spec §22 (P5 Survival Systems):
 *   - Traps arm on placement
 *   - Triggers when enemy enters triggerRadius
 *   - Deals damage to enemy, then enters cooldown before re-arming
 */

import trapsConfig from "@/config/game/traps.json" with { type: "json" };
import type { HealthComponent } from "@/game/ecs/components/combat";
import type { TrapComponent } from "@/game/ecs/components/items";
import { applyDamageToHealth } from "@/game/systems/combat";

// ---------------------------------------------------------------------------
// Minimal entity interfaces — pure system tick, no ECS world import
// ---------------------------------------------------------------------------

export interface TrapEntity {
  trap: TrapComponent;
  position: { x: number; y: number; z: number };
}

export interface EnemyTargetEntity {
  health: HealthComponent;
  position: { x: number; y: number; z: number };
}

// ---------------------------------------------------------------------------
// Config helpers
// ---------------------------------------------------------------------------

type TrapTypeConfig = {
  damage: number;
  triggerRadius: number;
  cooldownDuration: number;
  modelPath: string;
};

/** Resolve config for a trap type. Throws if the type is unknown. */
function getTrapTypeConfig(trapType: string): TrapTypeConfig {
  const cfg = trapsConfig.types[trapType as keyof typeof trapsConfig.types];
  if (!cfg) throw new Error(`Unknown trap type: "${trapType}"`);
  return cfg;
}

// ---------------------------------------------------------------------------
// Factory — Spec §22: traps arm on placement
// ---------------------------------------------------------------------------

/**
 * Create a TrapComponent for the given trap type.
 * The trap is armed immediately — ready to trigger on the next enemy in range.
 */
export function createTrapComponent(trapType: string): TrapComponent {
  const cfg = getTrapTypeConfig(trapType);
  return {
    trapType,
    damage: cfg.damage,
    triggerRadius: cfg.triggerRadius,
    armed: true,
    cooldown: 0,
    modelPath: cfg.modelPath,
  };
}

// ---------------------------------------------------------------------------
// Range check — Spec §22: triggers when enemy enters radius
// ---------------------------------------------------------------------------

/**
 * Returns true when an enemy is within the trap's trigger radius.
 * Uses 2D XZ distance — Y axis is ignored.
 */
export function isEnemyInTrapRange(
  trapX: number,
  trapZ: number,
  enemyX: number,
  enemyZ: number,
  triggerRadius: number,
): boolean {
  const dx = enemyX - trapX;
  const dz = enemyZ - trapZ;
  return dx * dx + dz * dz <= triggerRadius * triggerRadius;
}

// ---------------------------------------------------------------------------
// Trigger — Spec §22: disarm + start cooldown
// ---------------------------------------------------------------------------

/**
 * Trigger a trap: disarm it and start the cooldown timer.
 * Caller must verify `trap.armed === true` before calling.
 * Mutates trap in place.
 */
export function triggerTrap(trap: TrapComponent): void {
  const cfg = getTrapTypeConfig(trap.trapType);
  trap.armed = false;
  trap.cooldown = cfg.cooldownDuration;
}

// ---------------------------------------------------------------------------
// Cooldown tick — re-arms when countdown reaches 0
// ---------------------------------------------------------------------------

/**
 * Decrement the trap's cooldown by `dt` seconds.
 * Re-arms the trap when cooldown reaches 0.
 * No-op when the trap is already armed.
 * Mutates trap in place.
 */
export function tickTrapCooldown(trap: TrapComponent, dt: number): void {
  if (trap.armed) return;
  trap.cooldown = Math.max(0, trap.cooldown - dt);
  if (trap.cooldown === 0) {
    trap.armed = true;
  }
}

// ---------------------------------------------------------------------------
// Damage application — delegates to combat.applyDamageToHealth
// ---------------------------------------------------------------------------

/**
 * Apply trap damage to an enemy's health component.
 * Reuses the combat invulnerability window to prevent double-hits within 0.5s.
 * Mutates health in place.
 */
export function applyTrapDamageToHealth(health: HealthComponent, trap: TrapComponent): void {
  applyDamageToHealth(health, trap.damage, `trap:${trap.trapType}`);
}

// ---------------------------------------------------------------------------
// Per-frame tick — scan all traps against all enemies
// ---------------------------------------------------------------------------

/**
 * Process all traps for one game frame.
 *
 * For each armed trap:
 *   - Scans enemies for range entry
 *   - On the first enemy in range: applies damage + triggers cooldown
 *
 * For each unarmed trap:
 *   - Ticks cooldown; re-arms when the timer expires
 *
 * Spec §22: one trigger per armed trap per tick (break after first hit).
 */
export function tickTraps(traps: TrapEntity[], enemies: EnemyTargetEntity[], dt: number): void {
  for (const trapEntity of traps) {
    const { trap, position: trapPos } = trapEntity;

    if (trap.armed) {
      for (const enemyEntity of enemies) {
        const { health, position: enemyPos } = enemyEntity;
        if (isEnemyInTrapRange(trapPos.x, trapPos.z, enemyPos.x, enemyPos.z, trap.triggerRadius)) {
          applyTrapDamageToHealth(health, trap);
          triggerTrap(trap);
          break; // one trigger per tick
        }
      }
    } else {
      tickTrapCooldown(trap, dt);
    }
  }
}
