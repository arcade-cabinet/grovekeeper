/**
 * Structure placement system.
 *
 * Handles placement validation, grid snapping, build cost verification,
 * and radius-based buff activation for placed structures.
 */

import structuresConfig from "@/config/game/structures.json" with { type: "json" };
import type { ResourceType } from "@/game/config/resources";
import type { FarmStructureCategory, StructureEffectType } from "@/game/ecs/components/structures";

// ---------------------------------------------------------------------------
// Structure definition (loaded from config)
// ---------------------------------------------------------------------------

export interface StructureDefinition {
  id: string;
  name: string;
  category: FarmStructureCategory;
  modelPath: string;
  effectType?: StructureEffectType;
  effectRadius?: number;
  effectMagnitude?: number;
  maxDurability: number;
  level: number;
  buildCost: { resource: string; amount: number }[];
}

const STRUCTURES: StructureDefinition[] =
  structuresConfig.structures as StructureDefinition[];

// ---------------------------------------------------------------------------
// Config accessors
// ---------------------------------------------------------------------------

export function getStructureById(id: string): StructureDefinition | undefined {
  return STRUCTURES.find((s) => s.id === id);
}

export function getStructures(): StructureDefinition[] {
  return [...STRUCTURES];
}

export function getStructuresByCategory(
  category: FarmStructureCategory,
): StructureDefinition[] {
  return STRUCTURES.filter((s) => s.category === category);
}

export function getStructuresForLevel(level: number): StructureDefinition[] {
  return STRUCTURES.filter((s) => s.level <= level);
}

// ---------------------------------------------------------------------------
// Placement validation
// ---------------------------------------------------------------------------

/** Grid snap size for structures (coarse grid, not per-tile). */
const STRUCTURE_GRID_SIZE = 2;

/** Minimum spacing between structures in world units. */
const MIN_STRUCTURE_SPACING = 3;

export interface PlacementPosition {
  x: number;
  z: number;
}

export interface PlacedStructureRecord {
  templateId: string;
  worldX: number;
  worldZ: number;
}

/** Snap a world position to the structure grid. */
export function snapToGrid(x: number, z: number): PlacementPosition {
  return {
    x: Math.floor(x / STRUCTURE_GRID_SIZE) * STRUCTURE_GRID_SIZE,
    z: Math.floor(z / STRUCTURE_GRID_SIZE) * STRUCTURE_GRID_SIZE,
  };
}

/** Check if a position is too close to existing structures. */
export function hasSpacingConflict(
  position: PlacementPosition,
  existing: PlacedStructureRecord[],
): boolean {
  for (const placed of existing) {
    const dx = position.x - placed.worldX;
    const dz = position.z - placed.worldZ;
    const dist = Math.sqrt(dx * dx + dz * dz);
    if (dist < MIN_STRUCTURE_SPACING) {
      return true;
    }
  }
  return false;
}

/** Validate whether a structure can be placed at the given position. */
export function canPlace(
  structureId: string,
  position: PlacementPosition,
  playerLevel: number,
  resources: Record<string, number>,
  existing: PlacedStructureRecord[],
): { valid: boolean; reason?: string } {
  const def = getStructureById(structureId);
  if (!def) {
    return { valid: false, reason: "Unknown structure" };
  }

  if (playerLevel < def.level) {
    return { valid: false, reason: `Requires level ${def.level}` };
  }

  for (const cost of def.buildCost) {
    if ((resources[cost.resource] ?? 0) < cost.amount) {
      return { valid: false, reason: `Not enough ${cost.resource}` };
    }
  }

  if (hasSpacingConflict(position, existing)) {
    return { valid: false, reason: "Too close to another structure" };
  }

  return { valid: true };
}

/** Deduct build costs from resources. Returns new resource map. */
export function deductBuildCost(
  def: StructureDefinition,
  resources: Record<string, number>,
): Record<string, number> {
  const result = { ...resources };
  for (const cost of def.buildCost) {
    result[cost.resource] = (result[cost.resource] ?? 0) - cost.amount;
  }
  return result;
}

// ---------------------------------------------------------------------------
// Effect system
// ---------------------------------------------------------------------------

/** Find all structures whose effect radius covers the given position. */
export function getActiveEffects(
  position: PlacementPosition,
  structures: PlacedStructureRecord[],
): { effectType: StructureEffectType; magnitude: number }[] {
  const effects: { effectType: StructureEffectType; magnitude: number }[] = [];

  for (const placed of structures) {
    const def = getStructureById(placed.templateId);
    if (!def?.effectType || !def.effectRadius || !def.effectMagnitude) continue;

    const dx = position.x - placed.worldX;
    const dz = position.z - placed.worldZ;
    const dist = Math.sqrt(dx * dx + dz * dz);

    if (dist <= def.effectRadius) {
      effects.push({
        effectType: def.effectType,
        magnitude: def.effectMagnitude,
      });
    }
  }

  return effects;
}

/** Sum all magnitudes of a specific effect type at a position. */
export function getTotalEffect(
  effectType: StructureEffectType,
  position: PlacementPosition,
  structures: PlacedStructureRecord[],
): number {
  const effects = getActiveEffects(position, structures);
  return effects
    .filter((e) => e.effectType === effectType)
    .reduce((sum, e) => sum + e.magnitude, 0);
}
