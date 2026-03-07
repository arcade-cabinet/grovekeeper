/**
 * Crop growth system.
 *
 * Manages 4-stage crop growth, watering effects, harvest yields,
 * and re-planting after harvest.
 */

import cropsConfig from "@/config/game/crops.json" with { type: "json" };
import type {
  CropComponent,
  CropId,
  CropStage,
} from "@/game/ecs/components/structures";

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

// ---------------------------------------------------------------------------
// ECS Tick (Spec §8)
// ---------------------------------------------------------------------------

/** Minimal ECS entity interface for crop growth tick. */
export interface CropTickEntity {
  id: string;
  crop: CropComponent;
  position: { x: number; y: number; z: number };
}

/**
 * Tick all crop ECS entities — advance growth driven by season, weather, and
 * watering state. Mutates crop components in-place (same pattern as tree growth).
 * Harvestable crops (stage === 3) are skipped — player must act to harvest.
 *
 * @param crops             Iterable of ECS entities (from cropsQuery)
 * @param season            Current season from DayNightComponent.season
 * @param weatherMultiplier Growth multiplier from WeatherComponent (rain, sun, etc.)
 * @param dt                Delta time in real seconds
 */
export function tickCropGrowth(
  crops: Iterable<CropTickEntity>,
  season: string,
  weatherMultiplier: number,
  dt: number,
): void {
  for (const entity of crops) {
    const { crop } = entity;
    if (crop.stage >= 3) continue;

    const prevStage = crop.stage;

    // advanceCropGrowth expects CropState — CropComponent is a structural superset
    const next = advanceCropGrowth(
      crop,
      dt * weatherMultiplier,
      season,
      0,
      0,
    );

    crop.stage = next.stage;
    crop.progress = next.progress;

    // Clear watered flag on stage advance (watering bonus consumed per stage)
    if (next.stage !== prevStage && crop.watered) {
      crop.watered = false;
    }
  }
}

/**
 * Harvest a crop entity at stage 3. Returns HarvestResult or null if not
 * harvestable. If the crop is replantable, resets it back to stage 0 in-place.
 *
 * Caller is responsible for calling addResource() with the returned amount.
 */
export function harvestCropEntity(
  entity: CropTickEntity,
  toolTierBonus = 0,
): HarvestResult | null {
  const { crop } = entity;

  const result = calculateHarvestYield(crop, toolTierBonus, 0);
  if (!result) return null;

  const replanted = replantCrop(crop);
  if (replanted) {
    crop.stage = replanted.stage;
    crop.progress = replanted.progress;
    crop.watered = replanted.watered;
  }

  return result;
}
