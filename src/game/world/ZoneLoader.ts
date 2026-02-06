/**
 * ZoneLoader — Converts a ZoneDefinition into ECS entities.
 *
 * Creates grid cell entities for each tile in a zone, applying
 * the zone's ground material as the default tile type and
 * overlaying any sparse tile overrides.
 */

import { createGridCellEntity } from "../ecs/archetypes";
import { world } from "../ecs/world";
import type { Entity } from "../ecs/world";
import type { ZoneDefinition, GroundMaterial } from "./types";

/** Map zone ground material to grid cell type. */
function materialToCellType(material: GroundMaterial): "soil" | "water" | "rock" | "path" {
  switch (material) {
    case "soil": return "soil";
    case "dirt": return "soil";
    case "grass": return "soil";
    case "stone": return "path";
  }
}

/**
 * Load a zone into the ECS world by creating grid cell entities.
 * Returns the created entities so they can be tracked for unloading.
 */
export function loadZoneEntities(zone: ZoneDefinition): Entity[] {
  const entities: Entity[] = [];

  // Build tile override map for O(1) lookup
  const overrides = new Map<string, "water" | "rock" | "path" | "soil">();
  if (zone.tiles) {
    for (const t of zone.tiles) {
      overrides.set(`${t.x},${t.z}`, t.type);
    }
  }

  const defaultType = materialToCellType(zone.groundMaterial);

  for (let z = 0; z < zone.size.height; z++) {
    for (let x = 0; x < zone.size.width; x++) {
      const worldX = zone.origin.x + x;
      const worldZ = zone.origin.z + z;
      const cellType = overrides.get(`${x},${z}`) ?? defaultType;

      const entity = createGridCellEntity(worldX, worldZ, cellType);
      // Tag entity with zone membership
      (entity as Entity & { zoneId?: string }).zoneId = zone.id;
      world.add(entity);
      entities.push(entity);
    }
  }

  return entities;
}

/**
 * Unload zone entities from the ECS world.
 */
export function unloadZoneEntities(entities: Entity[]): void {
  for (const entity of entities) {
    world.remove(entity);
  }
}
