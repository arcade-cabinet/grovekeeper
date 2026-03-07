/**
 * Survival system — hearts, hunger, and stamina drain.
 *
 * Pure functions operating on plain value types.
 * No ECS world, no R3F, no Rapier dependencies.
 * Callers apply returned values to player/health state.
 *
 * Spec §12 Stamina & Survival, §2.2 Survival Systems, §37.1 Exploration Mode.
 */

import type { HealthComponent } from "@/game/ecs/components/combat";

// ---------------------------------------------------------------------------
// Constants — Spec §12
// ---------------------------------------------------------------------------

/** Base hunger drain rate in units/minute. Spec §12.2 */
const BASE_HUNGER_DRAIN_PER_MIN = 1.0;

/** Heart drain rate when hunger is zero (starvation). Spec §12.2 */
const STARVATION_HEART_DRAIN_PER_MIN = 0.25;

/** Hunger threshold for "Well Fed" bonus. Spec §12.2 */
const WELL_FED_THRESHOLD = 80;

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
// Stamina — Spec §12.1
// ---------------------------------------------------------------------------

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
