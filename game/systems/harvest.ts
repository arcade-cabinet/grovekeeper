/**
 * Harvest system -- cooldown timers and yield calculation.
 *
 * Stores BASE yields only -- multipliers are computed at collect time
 * so season changes, new structures, and pruned state are always current.
 */

import { getSpeciesById } from "@/game/config/species";
import type { Entity } from "@/game/ecs/world";
import { world } from "@/game/ecs/world";

/**
 * Initialize the harvestable component on a tree entity.
 * Only applies to Mature (stage 3) and Old Growth (stage 4) trees.
 */
export function initHarvestable(entity: Entity): void {
  if (!entity.tree || entity.tree.stage < 3) return;

  const species = getSpeciesById(entity.tree.speciesId);
  if (!species) return;

  world.addComponent(entity, "harvestable", {
    resources: species.yield.map((y) => ({
      type: y.resource,
      amount: y.amount,
    })),
    cooldownElapsed: 0,
    cooldownTotal: species.harvestCycleSec,
    ready: false,
  });
}

/**
 * Advances harvest cooldown timers. Marks `ready = true` when cooldown completes.
 */
export function harvestCooldownTick(entity: Entity, deltaTime: number): void {
  if (!entity.harvestable || entity.harvestable.ready) return;

  entity.harvestable.cooldownElapsed = Math.min(
    entity.harvestable.cooldownElapsed + deltaTime,
    entity.harvestable.cooldownTotal,
  );

  if (entity.harvestable.cooldownElapsed >= entity.harvestable.cooldownTotal) {
    entity.harvestable.ready = true;
  }
}

/**
 * Compute the yield multiplier for a tree at harvest time.
 */
export function computeYieldMultiplier(entity: Entity, currentSeason?: string): number {
  if (!entity.tree) return 1.0;

  const stageMultiplier = entity.tree.stage >= 4 ? 1.5 : 1.0;
  const prunedMultiplier = entity.tree.pruned ? 1.5 : 1.0;

  // Ironbark: 3x timber at Old Growth
  const ironbarkMult = entity.tree.speciesId === "ironbark" && entity.tree.stage >= 4 ? 3.0 : 1.0;

  // Golden Apple: 3x fruit yield in Autumn
  const goldenAppleMult =
    entity.tree.speciesId === "golden-apple" && currentSeason === "autumn" ? 3.0 : 1.0;

  return stageMultiplier * prunedMultiplier * ironbarkMult * goldenAppleMult;
}

/**
 * Collect harvest from a tree.
 * Computes yields at collect time using current season bonuses.
 * Returns the resources if ready, resets cooldown.
 * Returns null if not ready.
 */
export function collectHarvest(
  entity: Entity,
  currentSeason?: string,
): { type: string; amount: number }[] | null {
  if (!entity.harvestable || !entity.harvestable.ready) return null;

  const multiplier = computeYieldMultiplier(entity, currentSeason);
  const resources = entity.harvestable.resources.map((r) => ({
    type: r.type,
    amount: Math.ceil(r.amount * multiplier),
  }));

  entity.harvestable.ready = false;
  entity.harvestable.cooldownElapsed = 0;

  // Clear pruned flag -- bonus is consumed on harvest
  if (entity.tree?.pruned) {
    entity.tree.pruned = false;
  }

  return resources;
}
