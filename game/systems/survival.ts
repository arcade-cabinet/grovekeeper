/**
 * Survival system — hearts, hunger, and stamina drain.
 *
 * Pure functions operating on plain value types.
 * No ECS world, no R3F, no Rapier dependencies.
 * Callers apply returned values to player/health state.
 *
 * Spec §12 Stamina & Survival, §2.2 Survival Systems, §37.1 Exploration Mode.
 */

import survivalConfig from "@/config/game/survival.json" with { type: "json" };
import type { HealthComponent } from "@/game/ecs/components/combat";

// ---------------------------------------------------------------------------
// Constants — Spec §12 (values live in config/game/survival.json)
// ---------------------------------------------------------------------------

const BASE_HUNGER_DRAIN_PER_MIN: number = survivalConfig.baseHungerDrainPerMin;
const STARVATION_HEART_DRAIN_PER_MIN: number = survivalConfig.starvationHeartDrainPerMin;
const WELL_FED_THRESHOLD: number = survivalConfig.wellFedThreshold;
const WELL_FED_REGEN_BONUS: number = survivalConfig.wellFedRegenBonus;

// ---------------------------------------------------------------------------
// Hunger — Spec §12.2
// ---------------------------------------------------------------------------

/**
 * Drain hunger over time at the difficulty-scaled rate.
 * Returns the new hunger value clamped to [0, maxHunger].
 *
 * Spec §12.2: drain = hungerDrainRate/min (difficulty-scaled).
 * Exploration mode (affectsGameplay=false) skips drain entirely.
 */
export function tickHunger(
  currentHunger: number,
  maxHunger: number,
  dt: number,
  hungerDrainRate: number,
  affectsGameplay: boolean = true,
): number {
  if (!affectsGameplay) return currentHunger;
  const drainPerSec = (hungerDrainRate * BASE_HUNGER_DRAIN_PER_MIN) / 60;
  return Math.max(0, Math.min(maxHunger, currentHunger - drainPerSec * dt));
}

/**
 * Returns true when the player is "Well Fed" (hunger > 80).
 * Well Fed grants +10% stamina regen for 120s. Spec §12.2.
 */
export function isWellFed(hunger: number): boolean {
  return hunger > WELL_FED_THRESHOLD;
}

// ---------------------------------------------------------------------------
// Hearts — Spec §12.3
// ---------------------------------------------------------------------------

/**
 * Drain hearts from starvation when hunger reaches zero.
 * Spec §12.2: 0.25 hearts/min drain at 0 hunger.
 * Mutates health in place.
 */
export function tickHeartsFromStarvation(
  health: HealthComponent,
  hunger: number,
  dt: number,
  affectsGameplay: boolean = true,
): void {
  if (!affectsGameplay) return;
  if (hunger > 0) return;
  const drainPerSec = STARVATION_HEART_DRAIN_PER_MIN / 60;
  health.current = Math.max(0, health.current - drainPerSec * dt);
}

/**
 * Drain hearts from environmental exposure.
 * Spec §2.2: exposure damage based on difficulty exposureDriftRate.
 * Mutates health in place.
 */
export function tickHeartsFromExposure(
  health: HealthComponent,
  dt: number,
  exposureDriftRate: number,
  exposureEnabled: boolean,
  affectsGameplay: boolean = true,
): void {
  if (!affectsGameplay || !exposureEnabled) return;
  const drainPerSec = exposureDriftRate / 60;
  health.current = Math.max(0, health.current - drainPerSec * dt);
}

// ---------------------------------------------------------------------------
// Hearts — death check — Spec §12.3
// ---------------------------------------------------------------------------

/**
 * Returns true when hearts reach zero (player death trigger).
 * Spec §12.3: 0 hearts = death. Drop carried resources, respawn at last campfire.
 */
export function isPlayerDead(health: HealthComponent): boolean {
  return health.current <= 0;
}

// ---------------------------------------------------------------------------
// Stamina — Spec §12.1
// ---------------------------------------------------------------------------

/**
 * Compute the effective stamina regen multiplier based on hunger state.
 * Spec §12.1: regen rate modified by difficulty + hunger.
 * Spec §12.2: 0 hunger = no stamina regen (returns 0).
 * Spec §12.2: Well Fed (>80) = +10% regen bonus.
 * Exploration mode (affectsGameplay=false) bypasses hunger gating.
 */
export function computeStaminaRegenMult(
  hunger: number,
  baseRegenMult: number,
  affectsGameplay: boolean = true,
): number {
  if (!affectsGameplay) return baseRegenMult;
  if (hunger <= 0) return 0;
  if (isWellFed(hunger)) return baseRegenMult * WELL_FED_REGEN_BONUS;
  return baseRegenMult;
}

/**
 * Drain stamina for a player action, scaled by difficulty multiplier.
 * Returns the new stamina value and whether the action succeeded.
 *
 * Spec §12.1: drain on tool use/sprint, scaled by staminaDrainMult.
 * Exploration mode (affectsGameplay=false): action always succeeds, no drain.
 */
export function tickStaminaDrain(
  currentStamina: number,
  baseCost: number,
  staminaDrainMult: number,
  affectsGameplay: boolean = true,
): { stamina: number; success: boolean } {
  if (!affectsGameplay) return { stamina: currentStamina, success: true };
  const actualCost = baseCost * staminaDrainMult;
  if (currentStamina < actualCost) return { stamina: currentStamina, success: false };
  return { stamina: currentStamina - actualCost, success: true };
}
