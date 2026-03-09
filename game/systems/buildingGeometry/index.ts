/**
 * buildingGeometry — barrel re-export.
 * Spec §42 (Procedural Architecture) + §43.3/§43.4 (Interiors + Openings).
 *
 * Subpackage layout:
 *   core.ts                — §42: BoxSpec, floorSurfaceY, generateBuildingBoxes, buildColliderArrays
 *   interiors/index.ts     — §43.3: generateBlueprintInterior
 *   interiors/residential  — cottage, townhouse, inn, barn, chapel
 *   interiors/specialized  — forge, kitchen, apothecary, watchtower, storehouse
 *   openings.ts            — §43.4: generateBlueprintOpenings
 */

export type { BoxMatType, BoxSpec } from "./core.ts";
export {
  buildColliderArrays,
  floorSurfaceY,
  generateBuildingBoxes,
} from "./core.ts";
export { generateBlueprintInterior } from "./interiors/index.ts";
export { generateBlueprintOpenings } from "./openings.ts";
