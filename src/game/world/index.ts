export { WorldManager } from "./WorldManager";
export { loadZoneEntities, unloadZoneEntities } from "./ZoneLoader";
export { createPropMesh, disposePropMeshes } from "./PropFactory";
export { generateWorld } from "./WorldGenerator";
export { ZONE_ARCHETYPES, getArchetype } from "./archetypes";
export type {
  WorldDefinition,
  ZoneDefinition,
  ZoneType,
  GroundMaterial,
  TileOverride,
  ConnectionDirection,
  TileOverrideDef,
  StructurePlacement,
  PropPlacement,
  ZoneConnection,
} from "./types";
export type { ZoneArchetype } from "./archetypes";
