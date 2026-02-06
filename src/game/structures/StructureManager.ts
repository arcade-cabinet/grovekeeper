/**
 * StructureManager — Handles structure placement, validation, and effect queries.
 *
 * Pure logic class: no BabylonJS or React dependencies. Loads structure templates
 * from JSON data and provides methods for placement validation and effect calculations.
 */

import type { StructureComponent } from "../ecs/world";
import type { StructureTemplate } from "./types";
import structureData from "./data/structures.json";

// ---------------------------------------------------------------------------
// Template registry (loaded once from JSON)
// ---------------------------------------------------------------------------

const templates: Map<string, StructureTemplate> = new Map();

for (const raw of structureData) {
  templates.set(raw.id, raw as StructureTemplate);
}

// ---------------------------------------------------------------------------
// Grid cell shape expected by canPlace
// ---------------------------------------------------------------------------

interface GridCellEntity {
  gridCell?: {
    gridX: number;
    gridZ: number;
    occupied: boolean;
    type: string;
  };
}

// ---------------------------------------------------------------------------
// Structure entity shape expected by effect queries
// ---------------------------------------------------------------------------

interface StructureEntity {
  structure?: StructureComponent;
  position?: { x: number; z: number };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Retrieve a structure template by ID.
 */
export function getTemplate(id: string): StructureTemplate | undefined {
  return templates.get(id);
}

/**
 * Return all templates whose `requiredLevel` is at or below the given player level.
 * Results are sorted ascending by `requiredLevel`.
 */
export function getAvailableTemplates(level: number): StructureTemplate[] {
  const result: StructureTemplate[] = [];
  for (const t of templates.values()) {
    if (t.requiredLevel <= level) {
      result.push(t);
    }
  }
  result.sort((a, b) => a.requiredLevel - b.requiredLevel);
  return result;
}

/**
 * Check whether a structure template can be placed at the given world position.
 *
 * Placement is valid when every grid cell covered by the structure footprint:
 *   1. Exists in the provided cell iterable
 *   2. Is not already occupied
 *   3. Is not a "water" or "rock" tile type
 *
 * @param templateId  — ID of the structure to place
 * @param worldX      — World X coordinate (grid-aligned integer)
 * @param worldZ      — World Z coordinate (grid-aligned integer)
 * @param gridCells   — Iterable of grid cell entities to check against
 */
export function canPlace(
  templateId: string,
  worldX: number,
  worldZ: number,
  gridCells: Iterable<GridCellEntity>,
): boolean {
  const template = templates.get(templateId);
  if (!template) return false;

  // Build a lookup map from grid cells: "x,z" -> cell data
  const cellMap = new Map<string, { occupied: boolean; type: string }>();
  for (const entity of gridCells) {
    if (entity.gridCell) {
      const key = `${entity.gridCell.gridX},${entity.gridCell.gridZ}`;
      cellMap.set(key, {
        occupied: entity.gridCell.occupied,
        type: entity.gridCell.type,
      });
    }
  }

  // Check every cell within the footprint
  for (let dx = 0; dx < template.footprint.width; dx++) {
    for (let dz = 0; dz < template.footprint.depth; dz++) {
      const gx = worldX + dx;
      const gz = worldZ + dz;
      const key = `${gx},${gz}`;
      const cell = cellMap.get(key);

      // Cell must exist
      if (!cell) return false;

      // Cell must not be occupied
      if (cell.occupied) return false;

      // Cell must be buildable (not water or rock)
      if (cell.type === "water" || cell.type === "rock") return false;
    }
  }

  return true;
}

/**
 * Collect all structure effects that reach a given world position.
 *
 * Uses Euclidean distance between the query point and each structure's position.
 * Returns an array of `{ type, magnitude }` for every structure whose effect
 * radius covers the point.
 */
export function getEffectsAtPosition(
  worldX: number,
  worldZ: number,
  structures: Iterable<StructureEntity>,
): { type: string; magnitude: number }[] {
  const effects: { type: string; magnitude: number }[] = [];

  for (const entity of structures) {
    if (!entity.structure || !entity.position) continue;

    const { effectType, effectRadius, effectMagnitude } = entity.structure;
    if (!effectType || effectRadius == null || effectMagnitude == null) continue;

    const dx = worldX - entity.position.x;
    const dz = worldZ - entity.position.z;
    const dist = Math.sqrt(dx * dx + dz * dz);

    if (dist <= effectRadius) {
      effects.push({ type: effectType, magnitude: effectMagnitude });
    }
  }

  return effects;
}

/**
 * Calculate the combined growth multiplier at a position.
 * Returns `1 + sum(growth_boost magnitudes)`.
 * With no nearby growth structures, returns 1.0 (no change).
 */
export function getGrowthMultiplier(
  worldX: number,
  worldZ: number,
  structures: Iterable<StructureEntity>,
): number {
  const effects = getEffectsAtPosition(worldX, worldZ, structures);
  let bonus = 0;
  for (const e of effects) {
    if (e.type === "growth_boost") {
      bonus += e.magnitude;
    }
  }
  return 1 + bonus;
}

/**
 * Calculate the combined harvest multiplier at a position.
 * Returns `1 + sum(harvest_boost magnitudes)`.
 * With no nearby harvest structures, returns 1.0 (no change).
 */
export function getHarvestMultiplier(
  worldX: number,
  worldZ: number,
  structures: Iterable<StructureEntity>,
): number {
  const effects = getEffectsAtPosition(worldX, worldZ, structures);
  let bonus = 0;
  for (const e of effects) {
    if (e.type === "harvest_boost") {
      bonus += e.magnitude;
    }
  }
  return 1 + bonus;
}

/**
 * Calculate the stamina cost multiplier at a position.
 * Returns `1 - sum(stamina_regen magnitudes)`, capped at a minimum of 0.5.
 * With no nearby stamina structures, returns 1.0 (full stamina cost).
 *
 * Example: two structures each with 0.2 magnitude => 1 - 0.4 = 0.6 multiplier.
 * Three structures each with 0.2 => 1 - 0.6 = 0.5 (capped).
 */
export function getStaminaMultiplier(
  worldX: number,
  worldZ: number,
  structures: Iterable<StructureEntity>,
): number {
  const effects = getEffectsAtPosition(worldX, worldZ, structures);
  let reduction = 0;
  for (const e of effects) {
    if (e.type === "stamina_regen") {
      reduction += e.magnitude;
    }
  }
  return Math.max(0.5, 1 - reduction);
}
