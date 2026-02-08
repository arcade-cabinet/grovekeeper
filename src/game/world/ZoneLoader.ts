/**
 * ZoneLoader — Converts a ZoneDefinition into ECS entities.
 *
 * Creates grid cell entities for each tile in a zone, applying
 * the zone's ground material as the default tile type and
 * overlaying any sparse tile overrides.
 */

import {
  createGridCellEntity,
  createNpcEntity,
  createWildTreeEntity,
} from "../ecs/archetypes";
import type { Entity } from "../ecs/world";
import { gridCellsQuery, npcsQuery, world } from "../ecs/world";
import { getNpcTemplate } from "../npcs/NpcManager";
import { createRNG, hashString } from "../utils/seedRNG";
import type { GroundMaterial, WildTreeSpec, ZoneDefinition } from "./types";
import { pickWeighted } from "./WorldGenerator";

/** Map zone ground material to grid cell type. */
function materialToCellType(
  material: GroundMaterial,
): "soil" | "water" | "rock" | "path" {
  switch (material) {
    case "soil":
      return "soil";
    case "dirt":
      return "soil";
    case "grass":
      return "soil";
    case "stone":
      return "path";
  }
}

/**
 * Load a zone into the ECS world by creating grid cell entities.
 * Returns the created entities so they can be tracked for unloading.
 */
export function loadZoneEntities(zone: ZoneDefinition): Entity[] {
  const entities: Entity[] = [];

  // Build set of existing cell positions to avoid duplicates
  // (e.g. when restoring a saved game that already has starting-grove cells)
  const existing = new Set<string>();
  for (const cell of gridCellsQuery) {
    if (cell.gridCell) {
      existing.add(`${cell.gridCell.gridX},${cell.gridCell.gridZ}`);
    }
  }

  // Build tile override map for O(1) lookup
  const overrides = new Map<string, "water" | "rock" | "path" | "soil">();
  if (zone.tiles) {
    for (const t of zone.tiles) {
      overrides.set(`${t.x},${t.z}`, t.type);
    }
  }

  const defaultType = materialToCellType(zone.groundMaterial);

  // Track which cells are soil (available for wild tree placement)
  const soilCells: { worldX: number; worldZ: number }[] = [];

  for (let z = 0; z < zone.size.height; z++) {
    for (let x = 0; x < zone.size.width; x++) {
      const worldX = zone.origin.x + x;
      const worldZ = zone.origin.z + z;

      // Skip if cell already exists at this position (idempotent loading)
      if (existing.has(`${worldX},${worldZ}`)) continue;

      const cellType = overrides.get(`${x},${z}`) ?? defaultType;

      const entity = createGridCellEntity(worldX, worldZ, cellType);
      // Tag entity with zone membership
      (entity as Entity & { zoneId?: string }).zoneId = zone.id;
      world.add(entity);
      entities.push(entity);

      // Track unoccupied soil cells for wild tree spawning
      if (cellType === "soil") {
        soilCells.push({ worldX, worldZ });
      }
    }
  }

  // Spawn wild trees on a fraction of soil tiles
  if (
    zone.wildTrees &&
    zone.wildTrees.length > 0 &&
    zone.wildTreeDensity &&
    zone.wildTreeDensity > 0
  ) {
    const wildTreeEntities = spawnWildTrees(
      zone.id,
      soilCells,
      zone.wildTrees,
      zone.wildTreeDensity,
      entities,
    );
    entities.push(...wildTreeEntities);
  }

  // Spawn NPC entities
  if (zone.npcs) {
    // Build set of existing NPC positions to avoid duplicates on reload
    const existingNpcs = new Set<string>();
    for (const npc of npcsQuery) {
      if (npc.position) {
        existingNpcs.add(`${npc.position.x},${npc.position.z}`);
      }
    }

    for (const npcPlacement of zone.npcs) {
      const template = getNpcTemplate(npcPlacement.templateId);
      if (!template) continue;
      const worldX = zone.origin.x + npcPlacement.localX;
      const worldZ = zone.origin.z + npcPlacement.localZ;

      // Skip if NPC already exists at this position (idempotent loading)
      if (existingNpcs.has(`${worldX},${worldZ}`)) continue;
      // Player level is checked at interaction time, so create all NPCs
      const npcEntity = createNpcEntity(
        worldX,
        worldZ,
        template.id,
        template.function,
        99, // always create; level gating happens on interaction
        template.requiredLevel,
      );
      (npcEntity as Entity & { zoneId?: string }).zoneId = zone.id;
      world.add(npcEntity);
      entities.push(npcEntity);
    }
  }

  return entities;
}

/**
 * Spawn wild trees on available soil cells in a zone.
 * Uses seeded RNG for deterministic placement.
 */
function spawnWildTrees(
  zoneId: string,
  soilCells: { worldX: number; worldZ: number }[],
  wildTrees: WildTreeSpec[],
  density: number,
  gridEntities: Entity[],
): Entity[] {
  if (soilCells.length === 0) return [];

  const rng = createRNG(hashString(`wild-${zoneId}`));
  const treeCount = Math.round(soilCells.length * density);
  const entities: Entity[] = [];

  // Shuffle soil cells deterministically
  const shuffled = [...soilCells];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  const weighted = wildTrees.map((wt) => ({
    value: wt.speciesId,
    weight: wt.weight,
  }));

  for (let i = 0; i < treeCount && i < shuffled.length; i++) {
    const cell = shuffled[i];
    const speciesId = pickWeighted(rng, weighted);
    // Random starting stage between 2-4 (Sapling through Old Growth)
    const stage = (Math.floor(rng() * 3) + 2) as 0 | 1 | 2 | 3 | 4;

    const treeEntity = createWildTreeEntity(
      cell.worldX,
      cell.worldZ,
      speciesId,
      stage,
    );
    (treeEntity as Entity & { zoneId?: string }).zoneId = zoneId;
    world.add(treeEntity);
    entities.push(treeEntity);

    // Mark the grid cell as occupied
    const gridEntity = gridEntities.find(
      (e) =>
        e.gridCell?.gridX === cell.worldX && e.gridCell?.gridZ === cell.worldZ,
    );
    if (gridEntity?.gridCell) {
      gridEntity.gridCell.occupied = true;
      gridEntity.gridCell.treeEntityId = treeEntity.id;
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
