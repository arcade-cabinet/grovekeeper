/**
 * Structure, campfire, and crop ECS components.
 *
 * Structures cover farm buildings, campfires, wells, storage, etc.
 * Crops are plantable food items with 4-stage growth.
 */

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
