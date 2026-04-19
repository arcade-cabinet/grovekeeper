/**
 * Market Events -- periodic random events affecting resource prices.
 *
 * Events last 3-7 days and apply temporary price modifiers.
 * One event can be active at a time, with a 10-day cooldown.
 *
 * Pure functions -- no side effects.
 */

import type { ResourceType } from "@/config/resources";
import { createRNG, hashString } from "../utils/seedRNG";

// ── Types ────────────────────────────────────────────────────────────────────

export interface MarketEventDef {
  id: string;
  name: string;
  icon: string;
  description: string;
  durationDays: number;
  effects: Partial<Record<ResourceType, number>>;
}

export interface MarketEventState {
  activeEvent: { definitionId: string; startDay: number } | null;
  eventHistory: { id: string; day: number }[];
  lastEventDay: number;
}

export interface MarketEventUpdateResult {
  state: MarketEventState;
  newEventTriggered: boolean;
  eventExpired: boolean;
}

// ── Constants ────────────────────────────────────────────────────────────────

const COOLDOWN_DAYS = 10;
const TRIGGER_CHANCE = 0.15;

// ── Event Definitions ────────────────────────────────────────────────────────

export const MARKET_EVENTS: MarketEventDef[] = [
  {
    id: "timber-boom",
    name: "Timber Boom",
    icon: "axe",
    description: "Construction surge! Timber prices doubled.",
    durationDays: 5,
    effects: { timber: 2.0 },
  },
  {
    id: "sap-shortage",
    name: "Sap Shortage",
    icon: "droplet",
    description: "Rare extraction season -- sap is precious!",
    durationDays: 4,
    effects: { sap: 2.5 },
  },
  {
    id: "fruit-festival",
    name: "Fruit Festival",
    icon: "apple",
    description: "Fruit glut! Buy cheap, sell high.",
    durationDays: 6,
    effects: { fruit: 1.5 },
  },
  {
    id: "acorn-rush",
    name: "Acorn Rush",
    icon: "nut",
    description: "Squirrel migration -- acorns in high demand!",
    durationDays: 3,
    effects: { acorns: 2.0 },
  },
  {
    id: "merchant-holiday",
    name: "Merchant Holiday",
    icon: "tag",
    description: "Clearance sale -- all prices reduced!",
    durationDays: 5,
    effects: { timber: 0.7, sap: 0.7, fruit: 0.7, acorns: 0.7 },
  },
  {
    id: "rare-influx",
    name: "Rare Influx",
    icon: "sparkles",
    description: "Visiting merchants drive up all prices!",
    durationDays: 4,
    effects: { timber: 1.5, sap: 1.5, fruit: 1.5, acorns: 1.5 },
  },
];

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Create a fresh market event state.
 */
export function initializeMarketEventState(): MarketEventState {
  return {
    activeEvent: null,
    eventHistory: [],
    lastEventDay: -COOLDOWN_DAYS, // allow immediate first event
  };
}

/**
 * Check if a market event is currently active.
 */
export function isMarketEventActive(
  state: MarketEventState,
  currentDay: number,
): boolean {
  if (!state.activeEvent) return false;

  const def = MARKET_EVENTS.find(
    (e) => e.id === state.activeEvent?.definitionId,
  );
  if (!def) return false;

  return currentDay < state.activeEvent.startDay + def.durationDays;
}

/**
 * Get price modifiers from the currently active event.
 * Returns an empty object if no event is active.
 */
export function getActiveMarketEventModifiers(
  state: MarketEventState,
  currentDay: number,
): Partial<Record<ResourceType, number>> {
  if (!isMarketEventActive(state, currentDay)) return {};

  const def = MARKET_EVENTS.find(
    (e) => e.id === state.activeEvent?.definitionId,
  );
  if (!def) return {};

  return { ...def.effects };
}

/**
 * Update market event state for the current day.
 *
 * - If an active event has expired, clear it.
 * - If no event is active and cooldown has elapsed, roll for a new event.
 * - RNG is seeded from `rngSeed + currentDay` for determinism.
 */
export function updateMarketEvents(
  state: MarketEventState,
  currentDay: number,
  rngSeed: string,
): MarketEventUpdateResult {
  let newState = { ...state };
  let eventExpired = false;
  let newEventTriggered = false;

  // Check if active event has expired
  if (newState.activeEvent) {
    const def = MARKET_EVENTS.find(
      (e) => e.id === newState.activeEvent?.definitionId,
    );
    if (def && currentDay >= newState.activeEvent.startDay + def.durationDays) {
      newState = {
        ...newState,
        activeEvent: null,
      };
      eventExpired = true;
    }
  }

  // Try to trigger a new event if cooldown has elapsed and no event active
  if (!newState.activeEvent) {
    const daysSinceLastEvent = currentDay - newState.lastEventDay;

    if (daysSinceLastEvent >= COOLDOWN_DAYS) {
      const seed = hashString(`${rngSeed}-market-${currentDay}`);
      const rng = createRNG(seed);
      const roll = rng();

      if (roll < TRIGGER_CHANCE) {
        // Pick a random event
        const eventIndex = Math.floor(rng() * MARKET_EVENTS.length);
        const event = MARKET_EVENTS[eventIndex];

        newState = {
          ...newState,
          activeEvent: { definitionId: event.id, startDay: currentDay },
          eventHistory: [
            ...newState.eventHistory,
            { id: event.id, day: currentDay },
          ],
          lastEventDay: currentDay,
        };
        newEventTriggered = true;
      }
    }
  }

  return {
    state: newState,
    newEventTriggered,
    eventExpired,
  };
}
