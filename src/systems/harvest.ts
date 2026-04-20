// src/game/systems/harvest.ts

import type { Entity } from "koota";
import { getActiveDifficulty } from "@/config/difficulty";
import { getSpeciesById } from "@/config/trees";
import { koota } from "@/koota";
import { getHarvestMultiplier } from "@/structures/StructureManager";
import { Harvestable, Position, Structure, Tree } from "@/traits";

/**
 * Initialize the harvestable component on a tree entity.
 * Only applies to Mature (stage 3) and Old Growth (stage 4) trees.
 *
 * Stores BASE yields only — multipliers are computed at collect time
 * so season changes, new structures, and pruned state are always current.
 */
export function initHarvestable(entity: Entity): void {
  if (!entity.has(Tree)) return;
  const tree = entity.get(Tree);
  if (tree.stage < 3) return;

  const species = getSpeciesById(tree.speciesId);
  if (!species) return;

  const harvestable = {
    resources: species.yield.map((y) => ({
      type: y.resource,
      amount: y.amount,
    })),
    cooldownElapsed: 0,
    cooldownTotal: species.harvestCycleSec,
    ready: false,
  };

  if (entity.has(Harvestable)) {
    entity.set(Harvestable, harvestable);
  } else {
    entity.add(Harvestable(harvestable));
  }
}

/**
 * Advances harvest cooldown timers for all harvestable trees.
 * Marks `ready = true` when cooldown completes.
 */
export function harvestSystem(deltaTime: number): void {
  for (const entity of koota.query(Tree, Harvestable)) {
    const h = entity.get(Harvestable);
    if (h.ready) continue;
    const cooldownElapsed = h.cooldownElapsed + deltaTime;
    const ready = cooldownElapsed >= h.cooldownTotal;
    entity.set(Harvestable, {
      ...h,
      cooldownElapsed,
      ready,
    });
  }
}

/**
 * Compute the yield multiplier for a tree at harvest time.
 * Takes current game state into account (season, structures, pruned, species).
 */
function computeYieldMultiplier(
  entity: Entity,
  currentSeason?: string,
): number {
  if (!entity.has(Tree)) return 1.0;
  const tree = entity.get(Tree);

  const stageMultiplier = tree.stage >= 4 ? 1.5 : 1.0;
  const prunedMultiplier = tree.pruned ? 1.5 : 1.0;

  const structuresIter = buildStructuresAdapter();
  const pos = entity.has(Position) ? entity.get(Position) : null;
  const structureMult = pos
    ? getHarvestMultiplier(pos.x, pos.z, structuresIter)
    : 1.0;

  // Ironbark: 3x timber at Old Growth
  const ironbarkMult =
    tree.speciesId === "ironbark" && tree.stage >= 4 ? 3.0 : 1.0;

  // Golden Apple: 3x fruit yield in Autumn
  const goldenAppleMult =
    tree.speciesId === "golden-apple" && currentSeason === "autumn"
      ? 3.0
      : 1.0;

  const difficultyYieldMult = getActiveDifficulty().resourceYieldMult;
  return (
    stageMultiplier *
    prunedMultiplier *
    structureMult *
    ironbarkMult *
    goldenAppleMult *
    difficultyYieldMult
  );
}

interface StructureShape {
  templateId: string;
  effectType?: "growth_boost" | "harvest_boost" | "stamina_regen" | "storage";
  effectRadius?: number;
  effectMagnitude?: number;
}

/**
 * Build an iterable adapter over Koota structures compatible with
 * StructureManager's miniplex-shaped entity interface.
 */
function buildStructuresAdapter(): Iterable<{
  structure?: StructureShape;
  position?: { x: number; z: number };
}> {
  const result: {
    structure?: StructureShape;
    position?: { x: number; z: number };
  }[] = [];
  for (const e of koota.query(Structure, Position)) {
    const s = e.get(Structure);
    const p = e.get(Position);
    result.push({
      structure: s,
      position: { x: p.x, z: p.z },
    });
  }
  return result;
}

/**
 * Collect harvest from a tree.
 * Computes yields at collect time using current season and structure bonuses.
 * Returns the resources if ready, resets cooldown.
 * Returns null if not ready.
 */
export function collectHarvest(
  entity: Entity,
  currentSeason?: string,
): { type: string; amount: number }[] | null {
  if (!entity.has(Harvestable)) return null;
  const h = entity.get(Harvestable);
  if (!h.ready) return null;

  const multiplier = computeYieldMultiplier(entity, currentSeason);
  const resources = h.resources.map((r) => ({
    type: r.type,
    amount: Math.ceil(r.amount * multiplier),
  }));

  entity.set(Harvestable, {
    ...h,
    ready: false,
    cooldownElapsed: 0,
  });

  // Clear pruned flag — bonus is consumed on harvest
  if (entity.has(Tree)) {
    const tree = entity.get(Tree);
    if (tree.pruned) {
      entity.set(Tree, { ...tree, pruned: false });
    }
  }

  return resources;
}
