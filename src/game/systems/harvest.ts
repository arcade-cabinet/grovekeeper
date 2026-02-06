// src/game/systems/harvest.ts
import { getSpeciesById } from "../constants/trees";
import type { Entity } from "../ecs/world";
import { harvestableQuery, structuresQuery, world } from "../ecs/world";
import { getHarvestMultiplier } from "../structures/StructureManager";

/**
 * Initialize the harvestable component on a tree entity.
 * Only applies to Mature (stage 3) and Old Growth (stage 4) trees.
 * Old Growth gets 1.5x yield.
 */
export function initHarvestable(entity: Entity): void {
  if (!entity.tree || entity.tree.stage < 3) return;

  const species = getSpeciesById(entity.tree.speciesId);
  if (!species) return;

  const stageMultiplier = entity.tree.stage >= 4 ? 1.5 : 1.0;
  const structureMult = entity.position
    ? getHarvestMultiplier(entity.position.x, entity.position.z, structuresQuery)
    : 1.0;
  const yieldMultiplier = stageMultiplier * structureMult;

  world.addComponent(entity, "harvestable", {
    resources: species.yield.map((y) => ({
      type: y.resource,
      amount: Math.ceil(y.amount * yieldMultiplier),
    })),
    cooldownElapsed: 0,
    cooldownTotal: species.harvestCycleSec,
    ready: false,
  });
}

/**
 * Advances harvest cooldown timers for all harvestable trees.
 * Marks `ready = true` when cooldown completes.
 */
export function harvestSystem(deltaTime: number): void {
  for (const entity of harvestableQuery) {
    if (!entity.harvestable || entity.harvestable.ready) continue;

    entity.harvestable.cooldownElapsed += deltaTime;

    if (entity.harvestable.cooldownElapsed >= entity.harvestable.cooldownTotal) {
      entity.harvestable.ready = true;
    }
  }
}

/**
 * Collect harvest from a tree.
 * Returns the resources if ready, resets cooldown.
 * Returns null if not ready.
 */
export function collectHarvest(
  entity: Entity,
): { type: string; amount: number }[] | null {
  if (!entity.harvestable || !entity.harvestable.ready) return null;

  const resources = [...entity.harvestable.resources];
  entity.harvestable.ready = false;
  entity.harvestable.cooldownElapsed = 0;

  return resources;
}
