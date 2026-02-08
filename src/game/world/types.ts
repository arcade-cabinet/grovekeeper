/**
 * World Data Layer — Zone and world definition types.
 *
 * All zone and world data is defined declaratively in JSON files.
 * These types describe the schema for data-driven level design.
 */

export type ZoneType = "grove" | "clearing" | "forest" | "path" | "settlement";
export type GroundMaterial = "grass" | "soil" | "stone" | "dirt";
export type TileOverride = "water" | "rock" | "path" | "soil";
export type ConnectionDirection = "north" | "south" | "east" | "west";

export interface TileOverrideDef {
  x: number;
  z: number;
  type: TileOverride;
}

export interface StructurePlacement {
  templateId: string;
  localX: number;
  localZ: number;
  rotation: 0 | 90 | 180 | 270;
}

export interface PropPlacement {
  propId: string;
  localX: number;
  localZ: number;
  scale?: number;
}

export interface NpcPlacement {
  templateId: string;
  localX: number;
  localZ: number;
  facing?: ConnectionDirection;
}

export interface ZoneConnection {
  direction: ConnectionDirection;
  targetZoneId: string;
  /** Local tile coordinate where the player enters this zone from the connection. */
  localEntry: { x: number; z: number };
}

export interface WildTreeSpec {
  speciesId: string;
  weight: number;
}

export interface ZoneDefinition {
  id: string;
  name: string;
  type: ZoneType;
  /** World-space top-left corner of this zone. */
  origin: { x: number; z: number };
  size: { width: number; height: number };
  groundMaterial: GroundMaterial;
  /** Sparse tile overrides (only non-default tiles need to be listed). */
  tiles?: TileOverrideDef[];
  structures?: StructurePlacement[];
  props?: PropPlacement[];
  plantable: boolean;
  connections: ZoneConnection[];
  /** NPC placements in this zone. */
  npcs?: NpcPlacement[];
  /** Species pool for wild tree spawning in this zone. */
  wildTrees?: WildTreeSpec[];
  /** Fraction of soil tiles that should get wild trees (0-1). */
  wildTreeDensity?: number;
}

export interface WorldDefinition {
  id: string;
  name: string;
  version: number;
  zones: ZoneDefinition[];
  playerSpawn: { zoneId: string; localX: number; localZ: number };
}
