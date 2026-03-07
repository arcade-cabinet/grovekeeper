/**
 * Difficulty config loader.
 *
 * Backed by config/game/difficulty.json.
 * affectsGameplay: false = Exploration mode (no survival drains).
 * affectsGameplay: true  = Survival mode (all systems active).
 *
 * See GAME_SPEC.md §37.
 */

import difficultyData from "@/config/game/difficulty.json" with { type: "json" };

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DifficultyConfig {
  id: string;
  name: string;
  tagline: string;
  description: string;
  color: string;
  icon: string;
  /** false = Exploration mode: survival systems disabled */
  affectsGameplay: boolean;
  permadeathForced: "off" | "optional" | "on";
  growthSpeedMult: number;
  resourceYieldMult: number;
  seedCostMult: number;
  structureCostMult: number;
  harvestCycleMult: number;
  staminaDrainMult: number;
  staminaRegenMult: number;
  weatherFrequencyMult: number;
  weatherDurationMult: number;
  seasonLengthDays: number;
  exposureEnabled: boolean;
  exposureDriftRate: number;
  unconsciousnessHoursLost: number;
  buildingDegradationRate: number;
  disasterFrequency: number;
  splitInventory: boolean;
  cropDiseaseEnabled: boolean;
  playerConditionsEnabled: boolean;
  deathDropsInventory: boolean;
  deathLosesSeason: boolean;
  startingResources: Record<string, number>;
  startingSeeds: Record<string, number>;
  windstormDamageChance: number;
  rainGrowthBonus: number;
  droughtGrowthPenalty: number;
}

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

export const DIFFICULTIES: DifficultyConfig[] = difficultyData as DifficultyConfig[];

// ---------------------------------------------------------------------------
// Accessors
// ---------------------------------------------------------------------------

export function getDifficultyById(id: string): DifficultyConfig | undefined {
  return DIFFICULTIES.find((d) => d.id === id);
}

/**
 * Returns true when the given difficulty ID is Exploration mode
 * (affectsGameplay === false). Defaults to true (survival) for unknown IDs.
 */
export function isExplorationMode(difficultyId: string): boolean {
  const config = getDifficultyById(difficultyId);
  return config ? !config.affectsGameplay : false;
}
