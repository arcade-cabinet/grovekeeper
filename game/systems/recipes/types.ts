import type { ResourceType } from "@/game/config/resources";

export interface ResourceOutput {
  kind: "resource";
  type: ResourceType;
  amount: number;
}

export interface SeedOutput {
  kind: "seed";
  speciesPool: string[];
  amount: number;
}

export interface EffectOutput {
  kind: "effect";
  effect:
    | "growth_boost"
    | "harvest_boost"
    | "stamina_restore"
    | "weather_protection"
    | "rain_call"
    | "xp_multiplier"
    | "all_resources_double"
    | "permanent_growth_boost";
  magnitude: number;
  durationSec: number;
}

export interface XpOutput {
  kind: "xp";
  amount: number;
}

export type RecipeOutput = ResourceOutput | SeedOutput | EffectOutput | XpOutput;

export type RecipeTier = 1 | 2 | 3 | 4;

export const TIER_LABELS: Record<RecipeTier, string> = {
  1: "Basic",
  2: "Intermediate",
  3: "Advanced",
  4: "Master",
};

export interface Recipe {
  id: string;
  name: string;
  description: string;
  tier: RecipeTier;
  requiredLevel: number;
  inputs: { type: ResourceType; amount: number }[];
  outputs: RecipeOutput[];
  craftTime?: number;
  requiredStructure?: string;
}
