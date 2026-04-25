/**
 * Structure System — barrel export.
 */

// BlockMeshFactory deleted in BabylonJS purge; voxel.renderer + tilesets replace it.
export {
  canPlace,
  getAvailableTemplates,
  getEffectsAtPosition,
  getGrowthMultiplier,
  getHarvestMultiplier,
  getStaminaMultiplier,
  getTemplate,
} from "./StructureManager";

export type { BlockDefinition, StructureTemplate } from "./types";
