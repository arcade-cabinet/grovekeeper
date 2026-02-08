export type { ZoneArchetype } from "./archetypes";
export { getArchetype, ZONE_ARCHETYPES } from "./archetypes";
export { createPropMesh, disposePropMeshes } from "./PropFactory";
export type {
  ConnectionDirection,
  GroundMaterial,
  PropPlacement,
  StructurePlacement,
  TileOverride,
  TileOverrideDef,
  WorldDefinition,
  ZoneConnection,
  ZoneDefinition,
  ZoneType,
} from "./types";
export { generateWorld } from "./WorldGenerator";
export { WorldManager } from "./WorldManager";
export { loadZoneEntities, unloadZoneEntities } from "./ZoneLoader";
