/**
 * GameActions — Headless action layer for tool verbs.
 *
 * Pure functions that operate on the Koota world via the action bundle
 * (no React, no BabylonJS, no haptics, no toast UI). Returns
 * boolean success/failure for each action.
 *
 * Used by the GovernorAgent for automated playtesting and E2E tests.
 */

import type { Entity } from "koota";
import { actions as gameActions } from "@/actions";
import { getActiveDifficulty } from "@/config/difficulty";
import type { ResourceType } from "@/config/resources";
import { getToolById } from "@/config/tools";
import { getSpeciesById } from "@/config/trees";
import { koota } from "@/koota";
import { spawnTree } from "@/startup";
import { getTemplate } from "@/structures/StructureManager";
import {
  CurrentSeason,
  GridCell,
  Harvestable,
  IsPlayer,
  Position,
  Resources,
  Seeds,
  Structure,
  Tree,
} from "@/traits";

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

/** Find the grid cell entity at a given grid coordinate. */
function findCellEntity(gridX: number, gridZ: number): Entity | undefined {
  for (const entity of koota.query(GridCell)) {
    const gc = entity.get(GridCell);
    if (gc && gc.gridX === gridX && gc.gridZ === gridZ) return entity;
  }
  return undefined;
}

/**
 * Initialize the Harvestable trait on a mature tree.
 * Only applies to Mature (stage 3) and Old Growth (stage 4) trees.
 */
function initHarvestable(entity: Entity): void {
  const tree = entity.get(Tree);
  if (!tree || tree.stage < 3) return;
  const species = getSpeciesById(tree.speciesId);
  if (!species) return;
  const payload = {
    resources: species.yield.map((y) => ({
      type: y.resource,
      amount: y.amount,
    })),
    cooldownElapsed: 0,
    cooldownTotal: species.harvestCycleSec,
    ready: false,
  };
  if (entity.has(Harvestable)) {
    entity.set(Harvestable, payload);
  } else {
    entity.add(Harvestable(payload));
  }
}

/**
 * Collect harvest resources from a tree entity, applying late-binding
 * multipliers (season, structures, pruned, species, difficulty).
 * Returns the resources if ready, resets cooldown. Returns null if not ready.
 */
function collectHarvest(
  entity: Entity,
  currentSeason?: string,
): { type: string; amount: number }[] | null {
  const harvestable = entity.get(Harvestable);
  const tree = entity.get(Tree);
  if (!harvestable || !harvestable.ready || !tree) return null;

  const stageMultiplier = tree.stage >= 4 ? 1.5 : 1.0;
  const prunedMultiplier = tree.pruned ? 1.5 : 1.0;

  // Structure harvest multiplier: sum harvest_boost magnitudes in range.
  const pos = entity.get(Position);
  let structureMult = 1.0;
  if (pos) {
    let bonus = 0;
    for (const sEnt of koota.query(Structure, Position)) {
      const s = sEnt.get(Structure);
      const sp = sEnt.get(Position);
      if (!s || !sp) continue;
      if (s.effectType !== "harvest_boost") continue;
      if (!s.effectRadius || !s.effectMagnitude) continue;
      const dx = pos.x - sp.x;
      const dz = pos.z - sp.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist <= s.effectRadius) bonus += s.effectMagnitude;
    }
    structureMult = 1 + bonus;
  }

  // Species-specific bonuses
  const ironbarkMult =
    tree.speciesId === "ironbark" && tree.stage >= 4 ? 3.0 : 1.0;
  const goldenAppleMult =
    tree.speciesId === "golden-apple" && currentSeason === "autumn" ? 3.0 : 1.0;
  const difficultyYieldMult = getActiveDifficulty().resourceYieldMult;

  const multiplier =
    stageMultiplier *
    prunedMultiplier *
    structureMult *
    ironbarkMult *
    goldenAppleMult *
    difficultyYieldMult;

  const resources = harvestable.resources.map((r) => ({
    type: r.type,
    amount: Math.ceil(r.amount * multiplier),
  }));

  entity.set(Harvestable, {
    ...harvestable,
    ready: false,
    cooldownElapsed: 0,
  });
  if (tree.pruned) {
    entity.set(Tree, { ...tree, pruned: false });
  }

  return resources;
}

// ──────────────────────────────────────────────
// Query Helpers
// ──────────────────────────────────────────────

/** Find all empty, plantable soil tile entities. */
export function findPlantableTiles(): Entity[] {
  const tiles: Entity[] = [];
  for (const entity of koota.query(GridCell)) {
    const gc = entity.get(GridCell);
    if (gc && gc.type === "soil" && !gc.occupied) tiles.push(entity);
  }
  return tiles;
}

/** Find all tree entities that have not been watered yet. */
export function findWaterableTrees(): Entity[] {
  const result: Entity[] = [];
  for (const entity of koota.query(Tree)) {
    const tree = entity.get(Tree);
    if (tree && !tree.watered) result.push(entity);
  }
  return result;
}

/** Find all tree entities with Harvestable.ready === true. */
export function findHarvestableTrees(): Entity[] {
  const result: Entity[] = [];
  for (const entity of koota.query(Tree, Harvestable)) {
    const h = entity.get(Harvestable);
    if (h?.ready) result.push(entity);
  }
  return result;
}

/** Find all tree entities at stage 3+ (mature or old growth). */
export function findMatureTrees(): Entity[] {
  const result: Entity[] = [];
  for (const entity of koota.query(Tree)) {
    const tree = entity.get(Tree);
    if (tree && tree.stage >= 3) result.push(entity);
  }
  return result;
}

/** Get the player's current tile coordinates. */
export function getPlayerTile(): { gridX: number; gridZ: number } | null {
  const player = koota.queryFirst(IsPlayer, Position);
  if (!player) return null;
  const pos = player.get(Position);
  if (!pos) return null;
  return { gridX: Math.round(pos.x), gridZ: Math.round(pos.z) };
}

// ──────────────────────────────────────────────
// Movement (headless teleport)
// ──────────────────────────────────────────────

/** Teleport the player directly to a grid position. No pathfinding animation. */
export function movePlayerTo(gridX: number, gridZ: number): void {
  const player = koota.queryFirst(IsPlayer, Position);
  if (!player) return;
  player.set(Position, (prev) => ({ ...prev, x: gridX, z: gridZ }));
}

// ──────────────────────────────────────────────
// Tool Actions
// ──────────────────────────────────────────────

/**
 * Plant a tree at the given grid position.
 * Validates: tile exists, is soil/path, not occupied, player has seeds
 * (and seed cost resources).
 * Returns true on success.
 */
export function plantTree(
  speciesId: string,
  gridX: number,
  gridZ: number,
): boolean {
  const a = gameActions();
  const species = getSpeciesById(speciesId);

  // Validate seed count
  const seeds = koota.get(Seeds) ?? {};
  if ((seeds[speciesId] ?? 0) < 1) return false;

  // Validate seed cost resources
  const resources = koota.get(Resources);
  if (species?.seedCost && resources) {
    for (const [resource, amount] of Object.entries(species.seedCost)) {
      if ((resources[resource as ResourceType] ?? 0) < amount) return false;
    }
  }

  // Find and validate the target cell
  const cellEntity = findCellEntity(gridX, gridZ);
  if (!cellEntity) return false;
  const gc = cellEntity.get(GridCell);
  if (!gc) return false;
  if (gc.type !== "soil" && gc.type !== "path") return false;
  if (gc.occupied) return false;

  // Spend seeds and resources
  a.spendSeed(speciesId, 1);
  if (species?.seedCost) {
    for (const [resource, amount] of Object.entries(species.seedCost)) {
      a.spendResource(resource as ResourceType, amount);
    }
  }

  // Create tree entity
  const tree = spawnTree(gridX, gridZ, speciesId);
  cellEntity.set(GridCell, {
    ...gc,
    occupied: true,
    treeEntityId: String(tree),
  });

  // Update tracking stats
  a.incrementTreesPlanted();
  a.trackSpeciesPlanted(speciesId);
  const plantXp = 10 + (species ? (species.difficulty - 1) * 5 : 0);
  a.addXp(plantXp);

  return true;
}

/**
 * Water a tree entity.
 * Returns true on success.
 */
export function waterTree(tree: Entity | undefined | null): boolean {
  if (!tree || !tree.isAlive() || !tree.has(Tree)) return false;
  const treeData = tree.get(Tree);
  if (!treeData || treeData.watered) return false;

  tree.set(Tree, { ...treeData, watered: true });
  const a = gameActions();
  a.addXp(5);
  a.incrementTreesWatered();
  return true;
}

/**
 * Harvest a mature+ tree. Removes the tree entity.
 * Returns the resources gained, or null if the tree couldn't be harvested.
 */
export function harvestTree(
  tree: Entity | undefined | null,
): { type: string; amount: number }[] | null {
  if (!tree || !tree.isAlive() || !tree.has(Tree)) return null;
  const treeData = tree.get(Tree);
  if (!treeData || treeData.stage < 3) return null;

  const a = gameActions();
  const season = koota.get(CurrentSeason)?.value;

  // Collect harvest resources (late-binding multipliers)
  let result: { type: string; amount: number }[] | null = null;
  const harvestResources = collectHarvest(tree, season);
  if (harvestResources) {
    for (const r of harvestResources) {
      a.addResource(r.type as ResourceType, r.amount);
    }
    result = harvestResources;
  } else {
    // Fallback to species base yield
    const species = getSpeciesById(treeData.speciesId);
    if (species) {
      const gains = species.yield.map((y) => ({
        type: y.resource,
        amount: y.amount,
      }));
      for (const g of gains) a.addResource(g.type as ResourceType, g.amount);
      result = gains;
    }
  }

  a.addXp(50);
  a.incrementTreesHarvested();

  // Clear grid cell occupancy
  const pos = tree.get(Position);
  if (pos) {
    const cellEntity = findCellEntity(Math.round(pos.x), Math.round(pos.z));
    if (cellEntity) {
      const gc = cellEntity.get(GridCell);
      if (gc)
        cellEntity.set(GridCell, {
          ...gc,
          occupied: false,
          treeEntityId: null,
        });
    }
  }

  tree.destroy();
  return result;
}

/**
 * Prune a mature+ tree for 1.5x yield bonus on next harvest.
 * Returns true on success.
 */
export function pruneTree(tree: Entity | undefined | null): boolean {
  if (!tree || !tree.isAlive() || !tree.has(Tree)) return false;
  const treeData = tree.get(Tree);
  if (!treeData || treeData.stage < 3) return false;

  // Speed up harvest cooldown by 30%
  if (tree.has(Harvestable)) {
    const h = tree.get(Harvestable);
    if (h) {
      tree.set(Harvestable, {
        ...h,
        cooldownElapsed: h.cooldownElapsed + h.cooldownTotal * 0.3,
      });
    }
  }
  tree.set(Tree, { ...treeData, pruned: true });
  // Re-init harvestable to recalculate yields with pruned bonus
  if (tree.has(Harvestable)) {
    initHarvestable(tree);
  }

  const a = gameActions();
  a.addXp(5);
  return true;
}

/**
 * Fertilize a tree (2x growth for the current stage cycle).
 * Costs 5 acorns.
 * Returns true on success.
 */
export function fertilizeTree(tree: Entity | undefined | null): boolean {
  if (!tree || !tree.isAlive() || !tree.has(Tree)) return false;
  const treeData = tree.get(Tree);
  if (!treeData || treeData.fertilized) return false;

  const a = gameActions();
  if (!a.spendResource("acorns" as ResourceType, 5)) return false;

  tree.set(Tree, { ...treeData, fertilized: true });
  a.addXp(5);
  return true;
}

/**
 * Clear a rock tile, converting it to soil.
 * Returns true on success.
 */
export function clearRock(gridX: number, gridZ: number): boolean {
  const cellEntity = findCellEntity(gridX, gridZ);
  if (!cellEntity) return false;
  const gc = cellEntity.get(GridCell);
  if (!gc || gc.type !== "rock") return false;

  cellEntity.set(GridCell, { ...gc, type: "soil", occupied: false });
  const a = gameActions();
  a.addXp(12);
  return true;
}

/**
 * Remove a seedling (stage 0-1) tree from a tile.
 * Returns true on success.
 */
export function removeSeedling(tree: Entity | undefined | null): boolean {
  if (!tree || !tree.isAlive() || !tree.has(Tree)) return false;
  const treeData = tree.get(Tree);
  if (!treeData || treeData.stage > 1) return false;

  const pos = tree.get(Position);
  if (pos) {
    const cellEntity = findCellEntity(Math.round(pos.x), Math.round(pos.z));
    if (cellEntity) {
      const gc = cellEntity.get(GridCell);
      if (gc)
        cellEntity.set(GridCell, {
          ...gc,
          occupied: false,
          treeEntityId: null,
        });
    }
  }

  tree.destroy();
  const a = gameActions();
  a.addXp(5);
  return true;
}

/**
 * Place a structure at the given world position.
 * Validates: template exists, resources available, placement valid.
 * Returns true on success.
 */
export function placeStructure(
  templateId: string,
  worldX: number,
  worldZ: number,
): boolean {
  const template = getTemplate(templateId);
  if (!template) return false;

  const a = gameActions();
  const resources = koota.get(Resources) ?? {
    timber: 0,
    sap: 0,
    fruit: 0,
    acorns: 0,
  };

  // Validate placement against grid — inline canPlace using koota cells.
  for (let dx = 0; dx < template.footprint.width; dx++) {
    for (let dz = 0; dz < template.footprint.depth; dz++) {
      const cellEntity = findCellEntity(worldX + dx, worldZ + dz);
      if (!cellEntity) return false;
      const gc = cellEntity.get(GridCell);
      if (!gc) return false;
      if (gc.occupied) return false;
      if (gc.type === "water" || gc.type === "rock") return false;
    }
  }

  // Validate all resource costs
  for (const [resource, amount] of Object.entries(template.cost)) {
    if ((resources[resource as ResourceType] ?? 0) < amount) return false;
  }

  // Spend resources
  for (const [resource, amount] of Object.entries(template.cost)) {
    a.spendResource(resource as ResourceType, amount);
  }

  // Create structure ECS entity
  koota.spawn(
    Position({ x: worldX, y: 0, z: worldZ }),
    Structure({
      templateId: template.id,
      effectType: template.effect?.type,
      effectRadius: template.effect?.radius ?? 0,
      effectMagnitude: template.effect?.magnitude ?? 0,
    }),
  );

  // Mark grid cells as occupied
  for (let dx = 0; dx < template.footprint.width; dx++) {
    for (let dz = 0; dz < template.footprint.depth; dz++) {
      const cellEntity = findCellEntity(worldX + dx, worldZ + dz);
      if (cellEntity) {
        const gc = cellEntity.get(GridCell);
        if (gc) cellEntity.set(GridCell, { ...gc, occupied: true });
      }
    }
  }

  // Persist in store
  a.addPlacedStructure(template.id, worldX, worldZ);
  return true;
}

/**
 * Spend stamina for a tool action (checks tool cost and spends stamina).
 * Returns true if stamina was available and spent.
 */
export function spendToolStamina(toolId: string): boolean {
  const tool = getToolById(toolId);
  if (!tool || tool.staminaCost === 0) return true;
  return gameActions().spendStamina(tool.staminaCost);
}

/** Select a tool in the store. */
export function selectTool(toolId: string): void {
  gameActions().setSelectedTool(toolId);
}

/** Select a species in the store. */
export function selectSpecies(speciesId: string): void {
  gameActions().setSelectedSpecies(speciesId);
}
