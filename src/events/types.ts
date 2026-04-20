/**
 * Seasonal Events and Festivals -- type definitions.
 *
 * Festivals are multi-day seasonal celebrations with challenges and rewards.
 * Encounters are brief one-off events (mysterious traveler, rare species sighting).
 */

import type { ResourceType } from "@/config/resources";
import type { Season } from "@/systems/time";

export type EventType = "festival" | "encounter";

export interface FestivalChallenge {
  id: string;
  description: string;
  targetType: "plant" | "harvest" | "water" | "grow_mature" | "grow_old_growth";
  targetAmount: number;
  currentProgress: number;
  completed: boolean;
}

export interface FestivalReward {
  xp?: number;
  resources?: Partial<Record<ResourceType, number>>;
  seeds?: { speciesId: string; amount: number }[];
  title?: string;
}

export interface FestivalDef {
  id: string;
  name: string;
  icon: string;
  season: Season;
  triggerDay: number;
  durationDays: number;
  description: string;
  growthBoost: number;
  harvestBoost: number;
  challenges: Omit<FestivalChallenge, "currentProgress" | "completed">[];
  completionReward: FestivalReward;
  accentColor: string;
}

export interface EncounterChoice {
  label: string;
  effect: EncounterEffect;
}

export interface EncounterEffect {
  type:
    | "give_resource"
    | "give_seed"
    | "give_xp"
    | "spawn_tree"
    | "buff_growth"
    | "nothing";
  resource?: ResourceType;
  amount?: number;
  speciesId?: string;
  duration?: number;
  multiplier?: number;
}

export interface EncounterDef {
  id: string;
  name: string;
  icon: string;
  description: string;
  season: Season | "any";
  minLevel: number;
  rarity: number;
  choices: EncounterChoice[];
}

export interface ActiveFestival {
  definitionId: string;
  startDay: number;
  challenges: FestivalChallenge[];
  completed: boolean;
}

export interface ActiveEncounter {
  definitionId: string;
  day: number;
  resolved: boolean;
}

export interface EventState {
  activeFestival: ActiveFestival | null;
  activeEncounter: ActiveEncounter | null;
  completedFestivalIds: string[];
  resolvedEncounterIds: string[];
  lastFestivalDay: number;
  lastEncounterDay: number;
}
