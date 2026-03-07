/**
 * Crop growth system.
 *
 * Manages 4-stage crop growth, watering effects, harvest yields,
 * and re-planting after harvest.
 */

import cropsConfig from "@/config/game/crops.json" with { type: "json" };
import type { CropId, CropStage } from "@/game/ecs/components/structures";

// ---------------------------------------------------------------------------
// Crop definition (loaded from config)
// ---------------------------------------------------------------------------

export interface CropDefinition {
  id: CropId;
  name: string;
  modelPath: string;
  growthTimeSec: number[];
  baseYield: number;
  seasonAffinity: string;
  seasonBonus: number;
  waterMultiplier: number;
  replantable: boolean;
  saturation: number;
  unlockLevel: number;
}

const CROPS: CropDefinition[] = cropsConfig.crops as CropDefinition[];

// ---------------------------------------------------------------------------
// Config accessors
// ---------------------------------------------------------------------------

export function getCropById(id: string): CropDefinition | undefined {
  return CROPS.find((c) => c.id === id);
}

export function getCrops(): CropDefinition[] {
  return [...CROPS];
}

export function getCropsForLevel(level: number): CropDefinition[] {
  return CROPS.filter((c) => c.unlockLevel <= level);
}

// ---------------------------------------------------------------------------
// Growth logic
// ---------------------------------------------------------------------------

export interface CropState {
  cropId: CropId;
  stage: CropStage;
  progress: number;
  watered: boolean;
}

/** Stage names for display. */
export const CROP_STAGE_NAMES: Record<CropStage, string> = {
  0: "Seed",
  1: "Sprout",
  2: "Growing",
  3: "Harvestable",
};

/**
 * Advance crop growth by delta time.
 * Returns the updated crop state (immutable).
 */
export function advanceCropGrowth(
  crop: CropState,
  deltaSec: number,
  currentSeason: string,
  structureGrowthBoost: number,
  fertilizerBoost: number,
): CropState {
  if (crop.stage >= 3) {
    return crop;
  }

  const def = getCropById(crop.cropId);
  if (!def) return crop;

  const stageTime = def.growthTimeSec[crop.stage];
  if (!stageTime || stageTime <= 0) return crop;

  let speedMultiplier = 1.0;
  if (crop.watered) {
    speedMultiplier *= def.waterMultiplier;
  }
  if (currentSeason === def.seasonAffinity) {
    speedMultiplier *= def.seasonBonus;
  }
  speedMultiplier += structureGrowthBoost;
  speedMultiplier += fertilizerBoost;

  const progressDelta = (deltaSec / stageTime) * speedMultiplier;
  let newProgress = crop.progress + progressDelta;
  let newStage = crop.stage;

  while (newProgress >= 1 && newStage < 3) {
    newProgress -= 1;
    newStage = (newStage + 1) as CropStage;
  }

  if (newStage >= 3) {
    newProgress = 1;
    newStage = 3;
  }

  return {
    ...crop,
    stage: newStage,
    progress: newProgress,
  };
}

// ---------------------------------------------------------------------------
// Harvest
// ---------------------------------------------------------------------------

export interface HarvestResult {
  cropId: CropId;
  amount: number;
}

/**
 * Calculate harvest yield for a crop.
 * Returns null if the crop is not harvestable.
 */
export function calculateHarvestYield(
  crop: CropState,
  toolTierBonus: number,
  fertilizerBonus: number,
): HarvestResult | null {
  if (crop.stage < 3) return null;

  const def = getCropById(crop.cropId);
  if (!def) return null;

  const amount = Math.max(
    1,
    Math.floor(def.baseYield * (1 + toolTierBonus + fertilizerBonus)),
  );

  return { cropId: crop.cropId, amount };
}

/** Reset a crop to seed stage after harvest (if replantable). */
export function replantCrop(crop: CropState): CropState | null {
  const def = getCropById(crop.cropId);
  if (!def?.replantable) return null;

  return {
    cropId: crop.cropId,
    stage: 0,
    progress: 0,
    watered: false,
  };
}
