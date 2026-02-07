/**
 * GameActions — Headless action layer for tool verbs.
 *
 * Extracts game actions from GameScene.tsx into pure functions that
 * operate on ECS world + Zustand store without React, BabylonJS, haptics,
 * or toast UI. Returns boolean success/failure for each action.
 *
 * Used by the GovernorAgent for automated playtesting and E2E tests.
 */

import type { ResourceType } from "../constants/resources";
import { getToolById } from "../constants/tools";
import { getSpeciesById } from "../constants/trees";
import { createTreeEntity } from "../ecs/archetypes";
import type { Entity, GridCellComponent } from "../ecs/world";
import {
  generateEntityId,
  gridCellsQuery,
  playerQuery,
  treesQuery,
  world,
} from "../ecs/world";
import { useGameStore } from "../stores/gameStore";
import { canPlace, getTemplate } from "../structures/StructureManager";
import { collectHarvest, initHarvestable } from "../systems/harvest";

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

/** Find the grid cell entity at a given grid coordinate. */
function findCell(gridX: number, gridZ: number): GridCellComponent | null {
  for (const cell of gridCellsQuery) {
    if (cell.gridCell?.gridX === gridX && cell.gridCell?.gridZ === gridZ) {
      return cell.gridCell;
    }
  }
  return null;
}

/** Find the grid cell at the player's current position. */
function _findCellAtPlayer(): GridCellComponent | null {
  const player = playerQuery.first;
  if (!player?.position) return null;
  return findCell(Math.round(player.position.x), Math.round(player.position.z));
}

/** Find a tree entity by its ID. */
function findTreeById(treeEntityId: string): Entity | null {
  for (const tree of treesQuery) {
    if (tree.id === treeEntityId && tree.tree) return tree;
  }
  return null;
}

// ──────────────────────────────────────────────
// Query Helpers
// ──────────────────────────────────────────────

/** Find all empty, plantable soil tiles. */
export function findPlantableTiles(): GridCellComponent[] {
  const tiles: GridCellComponent[] = [];
  for (const cell of gridCellsQuery) {
    if (
      cell.gridCell &&
      cell.gridCell.type === "soil" &&
      !cell.gridCell.occupied
    ) {
      tiles.push(cell.gridCell);
    }
  }
  return tiles;
}

/** Find all tree entities that have the watered flag set to false. */
export function findWaterableTrees(): Entity[] {
  const result: Entity[] = [];
  for (const tree of treesQuery) {
    if (tree.tree && !tree.tree.watered) {
      result.push(tree);
    }
  }
  return result;
}

/** Find all tree entities at stage 3+ with harvestable.ready === true. */
export function findHarvestableTrees(): Entity[] {
  const result: Entity[] = [];
  for (const tree of treesQuery) {
    if (tree.harvestable?.ready) {
      result.push(tree);
    }
  }
  return result;
}

/** Find all tree entities at stage 3+ (mature or old growth). */
export function findMatureTrees(): Entity[] {
  const result: Entity[] = [];
  for (const tree of treesQuery) {
    if (tree.tree && tree.tree.stage >= 3) {
      result.push(tree);
    }
  }
  return result;
}

/** Get the player's current tile coordinates. */
export function getPlayerTile(): { gridX: number; gridZ: number } | null {
  const player = playerQuery.first;
  if (!player?.position) return null;
  return {
    gridX: Math.round(player.position.x),
    gridZ: Math.round(player.position.z),
  };
}

// ──────────────────────────────────────────────
// Movement (headless teleport)
// ──────────────────────────────────────────────

/** Teleport the player directly to a grid position. No pathfinding animation. */
export function movePlayerTo(gridX: number, gridZ: number): void {
  const player = playerQuery.first;
  if (!player?.position) return;
  player.position.x = gridX;
  player.position.z = gridZ;
}

// ──────────────────────────────────────────────
// Tool Actions
// ──────────────────────────────────────────────

/**
 * Plant a tree at the given grid position.
 * Validates: tile exists, is soil, not occupied, player has seeds (and seed cost resources).
 * Returns true on success.
 */
export function plantTree(
  speciesId: string,
  gridX: number,
  gridZ: number,
): boolean {
  const store = useGameStore.getState();
  const species = getSpeciesById(speciesId);

  // Validate seed count
  const currentSeeds = store.seeds[speciesId] ?? 0;
  if (currentSeeds < 1) return false;

  // Validate seed cost resources
  if (species?.seedCost) {
    for (const [resource, amount] of Object.entries(species.seedCost)) {
      if ((store.resources[resource as ResourceType] ?? 0) < amount)
        return false;
    }
  }

  // Find and validate the target cell
  const gc = findCell(gridX, gridZ);
  if (!gc) return false;
  if (gc.type !== "soil" && gc.type !== "path") return false;
  if (gc.occupied) return false;

  // Spend seeds and resources
  store.spendSeed(speciesId, 1);
  if (species?.seedCost) {
    for (const [resource, amount] of Object.entries(species.seedCost)) {
      store.spendResource(resource as ResourceType, amount);
    }
  }

  // Create tree entity
  const tree = createTreeEntity(gridX, gridZ, speciesId);
  world.add(tree);
  gc.occupied = true;
  gc.treeEntityId = tree.id;

  // Update store stats
  store.incrementTreesPlanted();
  store.trackSpeciesPlanted(speciesId);
  const plantXp = 10 + (species ? (species.difficulty - 1) * 5 : 0);
  store.addXp(plantXp);

  return true;
}

/**
 * Water a tree by its entity ID.
 * Returns true on success.
 */
export function waterTree(treeEntityId: string): boolean {
  const tree = findTreeById(treeEntityId);
  if (!tree?.tree) return false;
  if (tree.tree.watered) return false;

  tree.tree.watered = true;
  const store = useGameStore.getState();
  store.addXp(5);
  store.incrementTreesWatered();
  return true;
}

/**
 * Harvest a mature+ tree (chop with axe). Removes the tree entity.
 * Returns the resources gained, or null if the tree couldn't be harvested.
 */
export function harvestTree(
  treeEntityId: string,
): { type: string; amount: number }[] | null {
  const tree = findTreeById(treeEntityId);
  if (!tree?.tree || tree.tree.stage < 3) return null;

  const store = useGameStore.getState();

  // Collect harvest resources (late-binding multipliers)
  const harvestResources = collectHarvest(tree, store.currentSeason);
  if (harvestResources) {
    for (const r of harvestResources) {
      store.addResource(r.type as ResourceType, r.amount);
    }
  } else {
    // Fallback to species base yield
    const species = getSpeciesById(tree.tree.speciesId);
    if (species) {
      const gains = species.yield.map((y) => ({
        type: y.resource,
        amount: y.amount,
      }));
      for (const g of gains)
        store.addResource(g.type as ResourceType, g.amount);
      // Use species yield as return value
      const result = gains;
      store.addXp(50);
      store.incrementTreesHarvested();

      // Find the grid cell to clear occupancy
      if (tree.position) {
        const gc = findCell(
          Math.round(tree.position.x),
          Math.round(tree.position.z),
        );
        if (gc) {
          gc.occupied = false;
          gc.treeEntityId = null;
        }
      }
      world.remove(tree);
      return result;
    }
  }

  store.addXp(50);
  store.incrementTreesHarvested();

  // Clear grid cell occupancy
  if (tree.position) {
    const gc = findCell(
      Math.round(tree.position.x),
      Math.round(tree.position.z),
    );
    if (gc) {
      gc.occupied = false;
      gc.treeEntityId = null;
    }
  }

  world.remove(tree);
  return harvestResources;
}

/**
 * Prune a mature+ tree for 1.5x yield bonus on next harvest.
 * Returns true on success.
 */
export function pruneTree(treeEntityId: string): boolean {
  const tree = findTreeById(treeEntityId);
  if (!tree?.tree || tree.tree.stage < 3) return false;

  // Speed up harvest cooldown by 30%
  if (tree.harvestable) {
    tree.harvestable.cooldownElapsed += tree.harvestable.cooldownTotal * 0.3;
  }
  tree.tree.pruned = true;
  // Re-init harvestable to recalculate yields with pruned bonus
  if (tree.harvestable) {
    initHarvestable(tree);
  }

  const store = useGameStore.getState();
  store.addXp(5);
  return true;
}

/**
 * Fertilize a tree (2x growth for the current stage cycle).
 * Costs 5 acorns.
 * Returns true on success.
 */
export function fertilizeTree(treeEntityId: string): boolean {
  const tree = findTreeById(treeEntityId);
  if (!tree?.tree) return false;
  if (tree.tree.fertilized) return false;

  const store = useGameStore.getState();
  if (!store.spendResource("acorns" as ResourceType, 5)) return false;

  tree.tree.fertilized = true;
  store.addXp(5);
  return true;
}

/**
 * Clear a rock tile, converting it to soil.
 * Returns true on success.
 */
export function clearRock(gridX: number, gridZ: number): boolean {
  const gc = findCell(gridX, gridZ);
  if (!gc || gc.type !== "rock") return false;

  gc.type = "soil";
  gc.occupied = false;
  const store = useGameStore.getState();
  store.addXp(12);
  return true;
}

/**
 * Remove a seedling (stage 0-1) tree from a tile.
 * Returns true on success.
 */
export function removeSeedling(treeEntityId: string): boolean {
  const tree = findTreeById(treeEntityId);
  if (!tree?.tree || tree.tree.stage > 1) return false;

  if (tree.position) {
    const gc = findCell(
      Math.round(tree.position.x),
      Math.round(tree.position.z),
    );
    if (gc) {
      gc.occupied = false;
      gc.treeEntityId = null;
    }
  }

  world.remove(tree);
  const store = useGameStore.getState();
  store.addXp(5);
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

  const store = useGameStore.getState();

  // Validate placement against grid
  if (!canPlace(template.id, worldX, worldZ, gridCellsQuery)) return false;

  // Validate all resource costs
  for (const [resource, amount] of Object.entries(template.cost)) {
    if ((store.resources[resource as ResourceType] ?? 0) < amount) return false;
  }

  // Spend resources
  for (const [resource, amount] of Object.entries(template.cost)) {
    store.spendResource(resource as ResourceType, amount);
  }

  // Create structure ECS entity
  const structureEntity: Entity = {
    id: generateEntityId(),
    position: { x: worldX, y: 0, z: worldZ },
    structure: {
      templateId: template.id,
      effectType: template.effect?.type,
      effectRadius: template.effect?.radius,
      effectMagnitude: template.effect?.magnitude,
    },
  };
  world.add(structureEntity);

  // Mark grid cells as occupied
  for (let dx = 0; dx < template.footprint.width; dx++) {
    for (let dz = 0; dz < template.footprint.depth; dz++) {
      const gc = findCell(worldX + dx, worldZ + dz);
      if (gc) gc.occupied = true;
    }
  }

  // Persist in store
  store.addPlacedStructure(template.id, worldX, worldZ);
  return true;
}

/**
 * Spend stamina for a tool action (checks tool cost and spends stamina).
 * Returns true if stamina was available and spent.
 */
export function spendToolStamina(toolId: string): boolean {
  const tool = getToolById(toolId);
  if (!tool || tool.staminaCost === 0) return true;

  const store = useGameStore.getState();
  return store.spendStamina(tool.staminaCost);
}

/**
 * Select a tool in the store.
 */
export function selectTool(toolId: string): void {
  useGameStore.getState().setSelectedTool(toolId);
}

/**
 * Select a species in the store.
 */
export function selectSpecies(speciesId: string): void {
  useGameStore.getState().setSelectedSpecies(speciesId);
}
