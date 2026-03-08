/**
 * Tile actions: clear rock, remove seedling, place structure.
 */
import type { ResourceType } from "@/game/config/resources";
import type { Entity } from "@/game/ecs/world";
import { useGameStore } from "@/game/stores";
import { canPlace, getTemplate } from "@/game/structures/StructureManager";
import { findCell, findTreeById, generateEntityId, gridCellsQuery, world } from "./queries";

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
    const gc = findCell(Math.round(tree.position.x), Math.round(tree.position.z));
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
export function placeStructure(templateId: string, worldX: number, worldZ: number): boolean {
  const template = getTemplate(templateId);
  if (!template) return false;

  const store = useGameStore.getState();

  if (!canPlace(template.id, worldX, worldZ, gridCellsQuery)) return false;

  for (const [resource, amount] of Object.entries(template.cost)) {
    if ((store.resources[resource as ResourceType] ?? 0) < amount) return false;
  }

  for (const [resource, amount] of Object.entries(template.cost)) {
    store.spendResource(resource as ResourceType, amount);
  }

  const structureEntity: Entity = {
    id: generateEntityId(),
    position: { x: worldX, y: 0, z: worldZ },
    structure: {
      templateId: template.id,
      category: "essential",
      modelPath: "",
      effectType: template.effect?.type,
      effectRadius: template.effect?.radius,
      effectMagnitude: template.effect?.magnitude,
      level: 1,
      buildCost: [],
    },
  };
  world.add(structureEntity);

  for (let dx = 0; dx < template.footprint.width; dx++) {
    for (let dz = 0; dz < template.footprint.depth; dz++) {
      const gc = findCell(worldX + dx, worldZ + dz);
      if (gc) gc.occupied = true;
    }
  }

  store.addPlacedStructure(template.id, worldX, worldZ);
  return true;
}
