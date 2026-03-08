/**
 * buildingGeometry — compatibility shim.
 *
 * The implementation has been decomposed into:
 *   game/systems/buildingGeometry/core.ts       — §42 structural boxes
 *   game/systems/buildingGeometry/interiors.ts  — §43.3 furnishings
 *   game/systems/buildingGeometry/openings.ts   — §43.4 doors/windows
 *   game/systems/buildingGeometry/index.ts      — barrel re-export
 *
 * This file exists so that TypeScript module resolution (which prefers *.ts
 * over a same-name directory) routes existing imports correctly.
 * All symbols are re-exported from the subpackage index.
 */

export type { BoxMatType, BoxSpec } from "./buildingGeometry/index.ts";
export {
  buildColliderArrays,
  floorSurfaceY,
  generateBlueprintInterior,
  generateBlueprintOpenings,
  generateBuildingBoxes,
} from "./buildingGeometry/index.ts";
