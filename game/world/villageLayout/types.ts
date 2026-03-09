/**
 * villageLayout/types.ts
 *
 * Public type definitions for the village street-grid layout system.
 * Spec §43.1: Street-Grid Layout Algorithm.
 */

import type { BlueprintId, BuildingMaterialType } from "@/game/ecs/components/structures";

export type { BlueprintId, BuildingMaterialType };

export interface StreetSegment {
  startX: number;
  startZ: number;
  endX: number;
  endZ: number;
  width: number;
}

export interface BuildingLot {
  x: number;
  z: number;
  w: number;
  d: number;
  facing: 0 | 90 | 180 | 270;
}

export interface BlueprintPlacement {
  position: { x: number; y: number; z: number };
  blueprintId: BlueprintId;
  footprintW: number;
  footprintD: number;
  stories: number;
  materialType: BuildingMaterialType;
  facing: 0 | 90 | 180 | 270;
  variation: number;
  rotationY: number;
}

export interface FurniturePlacement {
  position: { x: number; y: number; z: number };
  type: "lamp_post" | "well" | "crate" | "barrel";
}

export interface VillageLayout {
  streets: StreetSegment[];
  lots: BuildingLot[];
  buildings: BlueprintPlacement[];
  furniture: FurniturePlacement[];
  center: { x: number; z: number };
}
