/**
 * Event system types stub.
 */

export interface FestivalChallenge {
  type: string;
  current: number;
  target: number;
}

export interface ActiveFestival {
  definitionId: string;
  name: string;
  startDay: number;
  endDay: number;
  challenges: FestivalChallenge[];
  completed: boolean;
}

export interface ActiveEncounter {
  definitionId: string;
  name: string;
  resolved: boolean;
}

export interface EventState {
  activeFestival: ActiveFestival | null;
  activeEncounter: ActiveEncounter | null;
  lastFestivalDay: number;
  lastEncounterDay: number;
  completedFestivals: string[];
}
