/**
 * Structure management -- placement validation and template lookup.
 * Stub for AI layer dependencies. Full implementation to be ported separately.
 */

import type { GridCellComponent } from "@/game/ecs/world";

export interface StructureTemplate {
  id: string;
  name: string;
  cost: Record<string, number>;
  footprint: { width: number; depth: number };
  effect?: {
    type: "growth_boost" | "harvest_boost" | "stamina_regen" | "storage";
    radius: number;
    magnitude: number;
  };
}

/**
 * Get a structure template by its ID.
 */
export function getTemplate(_templateId: string): StructureTemplate | null {
  // Stub -- full implementation loads from structures data
  return null;
}

/**
 * Check if a structure can be placed at the given position.
 */
export function canPlace(
  _templateId: string,
  _worldX: number,
  _worldZ: number,
  _gridCells: Iterable<{ gridCell?: GridCellComponent }>,
): boolean {
  // Stub -- full implementation checks footprint against grid
  return false;
}
