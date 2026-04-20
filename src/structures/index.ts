/**
 * Structure System — barrel export.
 */

export {
  createBlockMesh,
  createStructureMesh,
  disposeStructureMaterialCache,
  disposeStructureMesh,
} from "./BlockMeshFactory";
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
