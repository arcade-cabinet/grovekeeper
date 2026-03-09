/**
 * Structure, campfire, and crop ECS components.
 *
 * Structures cover farm buildings, campfires, wells, storage, etc.
 * Crops are plantable food items with 4-stage growth.
 */

export type BuildingMaterialType = "brick" | "plaster" | "timber";

/** Blueprint IDs for procedural town buildings (§43.2). */
export type BlueprintId =
  | "cottage"
  | "townhouse"
  | "barn"
  | "inn"
  | "forge"
  | "kitchen"
  | "apothecary"
  | "watchtower"
  | "storehouse"
  | "chapel";

/**
 * Procedural building — rendered from Box geometry instead of a GLB model.
 * Added alongside StructureComponent (which still drives game effects).
 * Spec §42 (Procedural Architecture), §43 (Town Generation).
 */
export interface ProceduralBuildingComponent {
  /** Building width in world units (footprintTiles × tileSize). */
  footprintW: number;
  /** Building depth in world units. */
  footprintD: number;
  /** Number of floors (stories). */
  stories: number;
  /** Wall material — affects colour palette. */
  materialType: BuildingMaterialType;
  /** Blueprint type — determines interior furnishings and openings (§43.2). */
  blueprintId: BlueprintId;
  /** Door faces this direction in degrees (§43.4). */
  facing: 0 | 90 | 180 | 270;
  /** Seeded variation hash — drives chimney/balcony/awning presence (§43.5). */
  variation: number;
}

export interface BuildCostEntry {
  resource: string;
  amount: number;
}

export type StructureEffectType =
  | "growth_boost"
  | "harvest_boost"
  | "stamina_regen"
  | "storage"
  | "cooking"
  | "forging"
  | "fast_travel";

export type FarmStructureCategory =
  | "essential"
  | "production"
  | "storage"
  | "decoration"
  | "base-building";

/** Structure — farm buildings, campfires, wells, etc. */
export interface StructureComponent {
  templateId: string;
  category: FarmStructureCategory;
  modelPath: string;
  effectType?: StructureEffectType;
  effectRadius?: number;
  effectMagnitude?: number;
  durability?: number;
  maxDurability?: number;
  level: number;
  buildCost: BuildCostEntry[];
}

/** Campfire — special structure with fast travel + cooking. */
export interface CampfireComponent {
  lit: boolean;
  fastTravelId: string | null;
  cookingSlots: number;
}

export type CropStage = 0 | 1 | 2 | 3;

export type CropId = "apple" | "carrot" | "cucumber" | "pumpkin" | "tomato";

/** Crop growth component. */
export interface CropComponent {
  cropId: CropId;
  stage: CropStage;
  progress: number;
  watered: boolean;
  modelPath: string;
}
