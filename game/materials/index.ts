/**
 * PBR Materials barrel export (Spec §47.6)
 */

export type { BuildingTextureKey } from "./buildingMaterials.ts";
export {
  BUILDING_TEXTURE_KEYS,
  getBuildingMaterialKey,
} from "./buildingMaterials.ts";
export type { PBRMaterialOptions } from "./PBRMaterialCache.ts";
export {
  disposePBRMaterials,
  getPBRMaterial,
  getRegisteredKeys,
  resetPBRMaterialCache,
} from "./PBRMaterialCache.ts";
export type { TerrainTextureKey } from "./terrainMaterials.ts";
export {
  getBiomeMaterialKey,
  getSeasonOverlay,
  TERRAIN_TEXTURE_KEYS,
} from "./terrainMaterials.ts";
export type { BarkTextureKey, FoliageTextureKey } from "./treeMaterials.ts";
export {
  BARK_TEXTURE_KEYS,
  FOLIAGE_TEXTURE_KEYS,
  getBarkMaterialKey,
  getFoliageMaterialKey,
} from "./treeMaterials.ts";
