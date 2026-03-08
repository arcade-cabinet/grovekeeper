/**
 * Tree tool actions: plant, water, harvest, prune, fertilize.
 */
import type { ResourceType } from "@/game/config/resources";
import { getSpeciesById } from "@/game/config/species";
import { createTreeEntity } from "@/game/ecs/archetypes";
import { useGameStore } from "@/game/stores";
import { collectHarvest, initHarvestable } from "@/game/systems/harvest";
import { findCell, findTreeById, world } from "./queries";

/**
 * Plant a tree at the given grid position.
 * Validates: tile exists, is soil, not occupied, player has seeds (and seed cost resources).
 * Returns true on success.
 */
export function plantTree(speciesId: string, gridX: number, gridZ: number): boolean {
  const store = useGameStore.getState();
  const species = getSpeciesById(speciesId);

  const currentSeeds = store.seeds[speciesId] ?? 0;
  if (currentSeeds < 1) return false;

  if (species?.seedCost) {
    for (const [resource, amount] of Object.entries(species.seedCost)) {
      if ((store.resources[resource as ResourceType] ?? 0) < amount) return false;
    }
  }

  const gc = findCell(gridX, gridZ);
  if (!gc) return false;
  if (gc.type !== "soil" && gc.type !== "path") return false;
  if (gc.occupied) return false;

  store.spendSeed(speciesId, 1);
  if (species?.seedCost) {
    for (const [resource, amount] of Object.entries(species.seedCost)) {
      store.spendResource(resource as ResourceType, amount);
    }
  }

  const tree = createTreeEntity(gridX, gridZ, speciesId);
  world.add(tree);
  gc.occupied = true;
  gc.treeEntityId = tree.id;

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
export function harvestTree(treeEntityId: string): { type: string; amount: number }[] | null {
  const tree = findTreeById(treeEntityId);
  if (!tree?.tree || tree.tree.stage < 3) return null;

  const store = useGameStore.getState();
  const harvestResources = collectHarvest(tree, store.currentSeason);

  if (harvestResources) {
    for (const r of harvestResources) {
      store.addResource(r.type as ResourceType, r.amount);
    }
  } else {
    const species = getSpeciesById(tree.tree.speciesId);
    if (species) {
      const gains = species.yield.map((y) => ({
        type: y.resource,
        amount: y.amount,
      }));
      for (const g of gains) store.addResource(g.type as ResourceType, g.amount);
      store.addXp(50);
      store.incrementTreesHarvested();

      if (tree.position) {
        const gc = findCell(Math.round(tree.position.x), Math.round(tree.position.z));
        if (gc) {
          gc.occupied = false;
          gc.treeEntityId = null;
        }
      }
      world.remove(tree);
      return gains;
    }
  }

  store.addXp(50);
  store.incrementTreesHarvested();

  if (tree.tree?.wild) {
    store.incrementWildTreesHarvested(tree.tree.speciesId);
  }

  if (tree.tree) {
    const totalYield = (harvestResources ?? []).reduce((s, r) => s + r.amount, 0);
    store.trackSpeciesHarvest(tree.tree.speciesId, totalYield);
  }

  if (tree.position) {
    const gc = findCell(Math.round(tree.position.x), Math.round(tree.position.z));
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

  if (tree.harvestable) {
    tree.harvestable.cooldownElapsed += tree.harvestable.cooldownTotal * 0.3;
  }
  tree.tree.pruned = true;
  if (tree.harvestable) {
    initHarvestable(tree);
  }

  const store = useGameStore.getState();
  store.addXp(5);
  return true;
}

/**
 * Fertilize a tree (2x growth for the current stage cycle).
 * Costs 5 acorns. Returns true on success.
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
