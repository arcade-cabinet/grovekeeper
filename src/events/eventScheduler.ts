/**
 * Event Scheduler -- pure functions for managing seasonal festivals and encounters.
 *
 * Called once per game day. Checks if festivals should start/end,
 * rolls for random encounters, and manages active event lifecycle.
 *
 * All functions are pure: no side effects, no store/ECS imports.
 * Deterministic randomness via seeded RNG from seedRNG.ts.
 */

import type { Season } from "@/systems/time";
import { createRNG, hashString } from "@/shared/utils/seedRNG";
import type {
  EncounterDef,
  EventState,
  FestivalChallenge,
  FestivalDef,
} from "./types";
import festivalsData from "./data/festivals.json";
import encountersData from "./data/encounters.json";

// ============================================
// Constants
// ============================================

/** Days after a festival ends before the next can start */
const FESTIVAL_COOLDOWN_DAYS = 15;

/** Minimum days between encounters */
const ENCOUNTER_COOLDOWN_DAYS = 7;

// ============================================
// Data access
// ============================================

const festivals: FestivalDef[] = festivalsData as FestivalDef[];
const encounters: EncounterDef[] = encountersData as EncounterDef[];

export function getFestivalDef(id: string): FestivalDef | undefined {
  return festivals.find((f) => f.id === id);
}

export function getEncounterDef(id: string): EncounterDef | undefined {
  return encounters.find((e) => e.id === id);
}

// ============================================
// Context for update calls
// ============================================

export interface EventContext {
  currentDay: number;
  season: Season;
  playerLevel: number;
  rngSeed: number;
}

export interface EventUpdateResult {
  state: EventState;
  festivalStarted: FestivalDef | null;
  festivalEnded: string | null;
  encounterTriggered: EncounterDef | null;
}

// ============================================
// State initialization
// ============================================

export function initializeEventState(): EventState {
  return {
    activeFestival: null,
    activeEncounter: null,
    completedFestivalIds: [],
    resolvedEncounterIds: [],
    lastFestivalDay: -FESTIVAL_COOLDOWN_DAYS,
    lastEncounterDay: -ENCOUNTER_COOLDOWN_DAYS,
  };
}

// ============================================
// Main update -- called once per game day
// ============================================

export function updateEvents(
  state: EventState,
  context: EventContext,
): EventUpdateResult {
  let nextState = { ...state };
  let festivalStarted: FestivalDef | null = null;
  let festivalEnded: string | null = null;
  let encounterTriggered: EncounterDef | null = null;

  // --- Festival lifecycle ---

  // Check if active festival has ended
  if (nextState.activeFestival) {
    const def = getFestivalDef(nextState.activeFestival.definitionId);
    if (def) {
      const endDay = nextState.activeFestival.startDay + def.durationDays;
      if (context.currentDay >= endDay) {
        festivalEnded = def.id;
        nextState = {
          ...nextState,
          activeFestival: null,
          lastFestivalDay: context.currentDay,
          completedFestivalIds: nextState.activeFestival.completed
            ? [...nextState.completedFestivalIds, def.id]
            : nextState.completedFestivalIds,
        };
      }
    }
  }

  // Check if a new festival should start
  if (!nextState.activeFestival) {
    const daysSinceLastFestival =
      context.currentDay - nextState.lastFestivalDay;
    if (daysSinceLastFestival >= FESTIVAL_COOLDOWN_DAYS) {
      const matchingFestival = festivals.find(
        (f) =>
          f.season === context.season && f.triggerDay === context.currentDay,
      );
      if (matchingFestival) {
        const challenges: FestivalChallenge[] =
          matchingFestival.challenges.map((c) => ({
            ...c,
            currentProgress: 0,
            completed: false,
          }));
        nextState = {
          ...nextState,
          activeFestival: {
            definitionId: matchingFestival.id,
            startDay: context.currentDay,
            challenges,
            completed: false,
          },
        };
        festivalStarted = matchingFestival;
      }
    }
  }

  // --- Encounter lifecycle ---

  // Clear resolved encounters
  if (nextState.activeEncounter?.resolved) {
    nextState = {
      ...nextState,
      activeEncounter: null,
    };
  }

  // Roll for new encounter if none active and cooldown has passed
  if (!nextState.activeEncounter) {
    const daysSinceLastEncounter =
      context.currentDay - nextState.lastEncounterDay;
    if (daysSinceLastEncounter >= ENCOUNTER_COOLDOWN_DAYS) {
      const triggered = rollForEncounter(context);
      if (triggered) {
        nextState = {
          ...nextState,
          activeEncounter: {
            definitionId: triggered.id,
            day: context.currentDay,
            resolved: false,
          },
          lastEncounterDay: context.currentDay,
        };
        encounterTriggered = triggered;
      }
    }
  }

  return {
    state: nextState,
    festivalStarted,
    festivalEnded,
    encounterTriggered,
  };
}

// ============================================
// Festival challenge progression
// ============================================

export function advanceFestivalChallenge(
  state: EventState,
  challengeType: string,
  amount: number = 1,
): EventState {
  if (!state.activeFestival) return state;

  const updatedChallenges = state.activeFestival.challenges.map((c) => {
    if (c.targetType !== challengeType || c.completed) return c;
    const newProgress = Math.min(c.currentProgress + amount, c.targetAmount);
    return {
      ...c,
      currentProgress: newProgress,
      completed: newProgress >= c.targetAmount,
    };
  });

  const allCompleted = updatedChallenges.every((c) => c.completed);

  return {
    ...state,
    activeFestival: {
      ...state.activeFestival,
      challenges: updatedChallenges,
      completed: allCompleted,
    },
  };
}

// ============================================
// Encounter resolution
// ============================================

export function resolveEncounter(
  state: EventState,
  definitionId: string,
): EventState {
  if (!state.activeEncounter) return state;
  if (state.activeEncounter.definitionId !== definitionId) return state;

  return {
    ...state,
    activeEncounter: {
      ...state.activeEncounter,
      resolved: true,
    },
    resolvedEncounterIds: [
      ...state.resolvedEncounterIds,
      definitionId,
    ],
  };
}

// ============================================
// Boost getters
// ============================================

export function getActiveFestivalGrowthBoost(state: EventState): number {
  if (!state.activeFestival) return 1.0;
  const def = getFestivalDef(state.activeFestival.definitionId);
  return def ? def.growthBoost : 1.0;
}

export function getActiveFestivalHarvestBoost(state: EventState): number {
  if (!state.activeFestival) return 1.0;
  const def = getFestivalDef(state.activeFestival.definitionId);
  return def ? def.harvestBoost : 1.0;
}

// ============================================
// State queries
// ============================================

export function isFestivalActive(state: EventState): boolean {
  return state.activeFestival !== null;
}

export function isEncounterPending(state: EventState): boolean {
  return state.activeEncounter !== null && !state.activeEncounter.resolved;
}

// ============================================
// Internal helpers
// ============================================

/**
 * Roll for a random encounter using seeded RNG.
 * Filters eligible encounters by season and level, then rolls
 * each candidate's rarity probability.
 */
function rollForEncounter(context: EventContext): EncounterDef | null {
  const eligible = encounters.filter((e) => {
    if (e.minLevel > context.playerLevel) return false;
    if (e.season !== "any" && e.season !== context.season) return false;
    return true;
  });

  if (eligible.length === 0) return null;

  const seed = hashString(`encounter-${context.rngSeed}-${context.currentDay}`);
  const rng = createRNG(seed);

  // Shuffle eligible encounters for fairness, then try each
  const shuffled = shuffleWithRng(eligible, rng);
  for (const encounter of shuffled) {
    const roll = rng();
    if (roll < encounter.rarity) {
      return encounter;
    }
  }

  return null;
}

/**
 * Fisher-Yates shuffle using the seeded RNG.
 */
function shuffleWithRng<T>(arr: T[], rng: () => number): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
