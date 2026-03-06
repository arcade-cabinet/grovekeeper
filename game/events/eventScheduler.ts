/**
 * Event scheduler stub.
 * Manages festivals and random encounters.
 */

import type { ActiveEncounter, ActiveFestival, EventState } from "./types";

export interface EventContext {
  currentDay: number;
  currentSeason: string;
  playerLevel: number;
  rngSeed: string;
}

export interface FestivalDef {
  id: string;
  name: string;
  completionReward: {
    xp?: number;
    resources?: Record<string, number>;
    seeds?: { speciesId: string; amount: number }[];
  };
}

export function initializeEventState(): EventState {
  return {
    activeFestival: null,
    activeEncounter: null,
    lastFestivalDay: 0,
    lastEncounterDay: 0,
    completedFestivals: [],
  };
}

export function updateEvents(
  state: EventState,
  _context: EventContext,
): {
  state: EventState;
  festivalStarted: ActiveFestival | null;
  festivalEnded: string | null;
  encounterTriggered: ActiveEncounter | null;
} {
  return {
    state,
    festivalStarted: null,
    festivalEnded: null,
    encounterTriggered: null,
  };
}

export function advanceFestivalChallenge(
  state: EventState,
  _challengeType: string,
  _amount: number,
): EventState {
  return state;
}

export function resolveEncounter(
  state: EventState,
  _definitionId: string,
): EventState {
  return state;
}

export function getFestivalDef(_id: string): FestivalDef | null {
  return null;
}
