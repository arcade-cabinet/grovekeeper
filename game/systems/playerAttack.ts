/**
 * Player Attack System — Spec §34.4
 *
 * Pure functions for resolving and executing player melee attacks.
 * No ECS world, no store, no R3F dependencies.
 *
 * Callers (dispatchAction, useInteraction) resolve context from ECS + store
 * before calling executePlayerAttack.
 *
 * Formula (Spec §34.4.3):
 *   damage = tool.effectPower × difficulty.damageMultiplier
 *   staminaCost = tools.json[toolId].staminaCost
 *   playerAttackCooldown from config/game/combat.json
 */

import combatConfig from "@/config/game/combat.json" with { type: "json" };
import toolsData from "@/config/game/tools.json" with { type: "json" };
import type { CombatComponent, HealthComponent } from "@/game/ecs/components/combat";
import { applyDamageToHealth, computePlayerDamage, isDefeated } from "@/game/systems/combat";

/**
 * Narrow string union for attack target resolution — avoids importing R3F-dependent
 * useRaycast.ts into a pure system module. Must stay in sync with RaycastEntityType.
 */
type AttackTargetType = "tree" | "npc" | "structure" | "enemy" | null;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Full context needed to execute a player melee swing. */
export interface PlayerAttackContext {
  /** Currently equipped tool ID. */
  toolId: string;
  /** difficulty.damageMultiplier from the active difficulty config. */
  damageMultiplier: number;
  /** Player's current stamina. */
  stamina: number;
  /** Player's max stamina (for future percentage-cost tools). */
  maxStamina: number;
  /** The target entity's HealthComponent — mutated in place on hit. */
  targetHealth: HealthComponent;
  /** The player entity's CombatComponent — cooldownRemaining is set on hit. */
  playerCombat: CombatComponent;
}

/** Result returned by executePlayerAttack. */
export interface AttackResult {
  /** True if the attack was attempted (not blocked by cooldown or stamina). */
  hit: boolean;
  /** Damage dealt (0 if blocked by invuln or damageMultiplier=0). */
  damage: number;
  /** True if the target's health reached 0 after this hit. */
  killed: boolean;
  /** Stamina consumed (0 if attack failed before stamina deduction). */
  staminaCost: number;
}

// ---------------------------------------------------------------------------
// Tool data helpers
// ---------------------------------------------------------------------------

interface ToolEntry {
  id: string;
  effectPower?: number;
  staminaCost: number;
}

const _tools = toolsData as ToolEntry[];

/**
 * Returns the effectPower for a tool, or 0 if the tool has no combat use.
 * Spec §34.4.2: only tools with effectPower > 0 are melee weapons.
 */
export function resolveToolEffectPower(toolId: string): number {
  const tool = _tools.find((t) => t.id === toolId);
  return tool?.effectPower ?? 0;
}

/**
 * Returns the stamina cost for a tool, or 0 for unknown tools.
 */
export function resolveToolStaminaCost(toolId: string): number {
  const tool = _tools.find((t) => t.id === toolId);
  return tool?.staminaCost ?? 0;
}

// ---------------------------------------------------------------------------
// Action resolution — Spec §34.4.6
// ---------------------------------------------------------------------------

/**
 * Returns "ATTACK" when toolId has effectPower > 0 and targetType is "enemy".
 * Returns null for all other combinations.
 *
 * Mirrors the pattern of resolveAction() in actionDispatcher.ts.
 * Trees/NPCs/structures are not attackable via this path.
 */
export function resolvePlayerAttack(toolId: string, targetType: AttackTargetType): "ATTACK" | null {
  if (targetType !== "enemy") return null;
  if (resolveToolEffectPower(toolId) <= 0) return null;
  return "ATTACK";
}

// ---------------------------------------------------------------------------
// Core attack execution — Spec §34.4.1
// ---------------------------------------------------------------------------

const { playerAttackCooldown } = combatConfig;

/**
 * Executes a player melee swing against a target.
 *
 * Pure: mutates targetHealth.current, targetHealth.invulnFrames, and
 * playerCombat.cooldownRemaining in place. Returns AttackResult.
 *
 * Guards (return hit=false, no mutations):
 *   1. playerCombat.cooldownRemaining > 0 — rate limit in effect
 *   2. stamina < staminaCost — not enough stamina
 *
 * Spec §34.4.1 — §34.4.4.
 */
export function executePlayerAttack(ctx: PlayerAttackContext): AttackResult {
  const noHit: AttackResult = { hit: false, damage: 0, killed: false, staminaCost: 0 };

  // Guard 1: attack cooldown (Spec §34.4.4)
  if (ctx.playerCombat.cooldownRemaining > 0) return noHit;

  // Guard 2: stamina check (Spec §34.4.3)
  const staminaCost = resolveToolStaminaCost(ctx.toolId);
  if (ctx.stamina < staminaCost) return noHit;

  // Compute damage (Spec §34.4.3: damage = effectPower × damageMultiplier)
  const effectPower = resolveToolEffectPower(ctx.toolId);
  const damage = computePlayerDamage(effectPower, ctx.damageMultiplier);

  // Apply damage — applyDamageToHealth skips if target is invulnerable
  const healthBefore = ctx.targetHealth.current;
  applyDamageToHealth(ctx.targetHealth, damage, "player");
  const actualDamage = healthBefore - ctx.targetHealth.current;

  // Set player attack cooldown regardless of invuln outcome (Spec §34.4.4)
  ctx.playerCombat.cooldownRemaining = playerAttackCooldown;

  return {
    hit: true,
    damage: actualDamage,
    killed: isDefeated(ctx.targetHealth),
    staminaCost,
  };
}
