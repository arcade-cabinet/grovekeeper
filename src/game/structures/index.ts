/**
 * Structure System — barrel export.
 */

export {
  getTemplate,
  getAvailableTemplates,
  canPlace,
  getEffectsAtPosition,
  getGrowthMultiplier,
  getHarvestMultiplier,
  getStaminaMultiplier,
} from "./StructureManager";

export {
  createBlockMesh,
  createStructureMesh,
  disposeStructureMesh,
  disposeStructureMaterialCache,
} from "./BlockMeshFactory";

export type { BlockDefinition, StructureTemplate } from "./types";
