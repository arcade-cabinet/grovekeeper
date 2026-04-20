/**
 * Difficulty system types and accessors.
 *
 * The 5 difficulty tiers are defined in difficulty.json and accessed
 * via getActiveDifficulty() which reads the current difficulty from
 * the Koota world (Difficulty trait).
 */

import { koota } from "@/koota";
import { Difficulty } from "@/traits";
import difficultyData from "./difficulty.json";

export interface DifficultyTier {
  id: string;
  name: string;
  tagline: string;
  description: string;
  color: string;
  icon: string;
  permadeathForced: "on" | "off" | "optional";

  // Numeric multipliers (Normal = 1.0 baseline)
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

  // Feature flags (which systems are active at this tier)
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

  // Starting resources
  startingResources: Record<string, number>;
  startingSeeds: Record<string, number>;

  // Weather damage tuning
  windstormDamageChance: number;
  rainGrowthBonus: number;
  droughtGrowthPenalty: number;
}

/**
 * All difficulty tiers, typed.
 */
export const DIFFICULTY_TIERS: DifficultyTier[] =
  difficultyData as DifficultyTier[];

/**
 * Lookup a difficulty tier by id.
 */
export function getDifficultyById(id: string): DifficultyTier | undefined {
  return DIFFICULTY_TIERS.find((t) => t.id === id);
}

/**
 * The default fallback tier (Normal).
 */
const NORMAL_TIER =
  DIFFICULTY_TIERS.find((t) => t.id === "normal") ?? DIFFICULTY_TIERS[0];

/**
 * Get the active difficulty tier from the Koota world.
 * Falls back to "normal" if the stored difficulty is unrecognized or
 * the trait isn't yet on the world (e.g. during early boot).
 */
export function getActiveDifficulty(): DifficultyTier {
  const diff = koota.has(Difficulty) ? koota.get(Difficulty) : undefined;
  return (diff ? getDifficultyById(diff.id) : undefined) ?? NORMAL_TIER;
}
