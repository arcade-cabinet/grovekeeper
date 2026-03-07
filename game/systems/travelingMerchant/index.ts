/**
 * Traveling Merchant -- visits every 7-14 game-days with unique trade offers.
 *
 * Stock improves with each visit (scales with visit count).
 * The merchant stays for 2 game-days, then departs.
 * Merchants can also spawn at discovered villages with seeded inventory.
 *
 * Pure functions -- no side effects.
 */

import type { ResourceType } from "@/game/config/resources";
import { createRNG, hashString } from "@/game/utils/seedRNG";
import { ALL_OFFER_TEMPLATES } from "./offerPools";

export type { MerchantReward, OfferTemplate } from "./offerPools";
export {
  ALL_OFFER_TEMPLATES,
  RECIPE_OFFERS,
  RESOURCE_OFFERS,
  SEED_OFFERS,
  XP_OFFERS,
} from "./offerPools";

// -- Types ────────────────────────────────────────────────────────────────────

export interface MerchantOffer {
  id: string;
  name: string;
  description: string;
  cost: Partial<Record<ResourceType, number>>;
  reward: import("./offerPools").MerchantReward;
  quantity: number;
}

export interface MerchantState {
  visitCount: number;
  lastVisitDay: number;
  nextVisitDay: number;
  isPresent: boolean;
  currentOffers: MerchantOffer[];
  departDay: number;
  /** Village ID where the merchant is currently stationed, if any. */
  currentVillageId: string | null;
}

// -- Constants ────────────────────────────────────────────────────────────────

const MIN_VISIT_INTERVAL = 7;
const MAX_VISIT_INTERVAL = 14;
const STAY_DURATION = 2;

// -- Helpers ──────────────────────────────────────────────────────────────────

function computeNextVisitDay(currentDay: number, rng: () => number): number {
  const interval =
    MIN_VISIT_INTERVAL + Math.floor(rng() * (MAX_VISIT_INTERVAL - MIN_VISIT_INTERVAL + 1));
  return currentDay + interval;
}

// -- Public API ───────────────────────────────────────────────────────────────

/**
 * Create a fresh merchant state.
 */
export function initializeMerchantState(startDay: number = 0): MerchantState {
  const seed = hashString(`merchant-init-${startDay}`);
  const rng = createRNG(seed);
  const nextVisit = computeNextVisitDay(startDay, rng);

  return {
    visitCount: 0,
    lastVisitDay: -MAX_VISIT_INTERVAL,
    nextVisitDay: nextVisit,
    isPresent: false,
    currentOffers: [],
    departDay: 0,
    currentVillageId: null,
  };
}

/**
 * Check if the merchant is currently present and available for trade.
 */
export function isMerchantPresent(state: MerchantState): boolean {
  return state.isPresent;
}

/**
 * Generate merchant offers based on visit count.
 *
 * - Visits 0-1: only resource offers (3 offers)
 * - Visits 2-3: resource + seed offers (4 offers)
 * - Visits 4+:  resource + seed + xp/recipe offers (5 offers)
 *
 * Offer quantities scale slightly with visit count.
 */
export function generateMerchantOffers(visitCount: number, rngSeed: string): MerchantOffer[] {
  const seed = hashString(`${rngSeed}-offers-${visitCount}`);
  const rng = createRNG(seed);

  const eligible = ALL_OFFER_TEMPLATES.filter((t) => visitCount >= t.minVisit);
  if (eligible.length === 0) return [];

  let offerCount: number;
  if (visitCount < 2) {
    offerCount = 3;
  } else if (visitCount < 4) {
    offerCount = 4;
  } else {
    offerCount = 5;
  }
  offerCount = Math.min(offerCount, eligible.length);

  const shuffled = [...eligible];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  const selected = shuffled.slice(0, offerCount);
  const quantityBonus = Math.floor(visitCount / 3);

  return selected.map((template, index) => ({
    id: `offer-${visitCount}-${index}`,
    name: template.name,
    description: template.description,
    cost: { ...template.cost },
    reward: { ...template.reward },
    quantity: template.baseQuantity + quantityBonus,
  }));
}

/**
 * Update merchant state for the current day.
 *
 * - If the merchant is present and should depart, remove them.
 * - If the merchant is absent and it is time to visit, summon them.
 */
export function updateMerchant(
  state: MerchantState,
  currentDay: number,
  rngSeed: string,
): MerchantState {
  let newState = { ...state };

  if (newState.isPresent && currentDay >= newState.departDay) {
    const departureSeed = hashString(`${rngSeed}-depart-${currentDay}`);
    const rng = createRNG(departureSeed);
    newState = {
      ...newState,
      isPresent: false,
      currentOffers: [],
      currentVillageId: null,
      nextVisitDay: computeNextVisitDay(currentDay, rng),
    };
  }

  if (!newState.isPresent && currentDay >= newState.nextVisitDay) {
    const visitNumber = newState.visitCount + 1;
    const offers = generateMerchantOffers(visitNumber, `${rngSeed}-visit-${visitNumber}`);
    newState = {
      ...newState,
      visitCount: visitNumber,
      lastVisitDay: currentDay,
      isPresent: true,
      currentOffers: offers,
      departDay: currentDay + STAY_DURATION,
    };
  }

  return newState;
}

/**
 * Spawn the merchant at a discovered village with seeded inventory.
 *
 * The inventory is deterministically seeded from the village ID so the same
 * village always offers the same items on the same visit number.
 * Call this when the player enters a village chunk for the first time.
 *
 * Returns the same state if the merchant is already present.
 */
export function spawnMerchantAtVillage(
  state: MerchantState,
  villageId: string,
  currentDay: number,
  worldSeed: string,
): MerchantState {
  if (state.isPresent) return state;

  const rngSeed = `${worldSeed}-village-${villageId}`;
  const visitNumber = state.visitCount + 1;
  const offers = generateMerchantOffers(visitNumber, `${rngSeed}-visit-${visitNumber}`);

  return {
    ...state,
    visitCount: visitNumber,
    lastVisitDay: currentDay,
    isPresent: true,
    currentOffers: offers,
    departDay: currentDay + STAY_DURATION,
    currentVillageId: villageId,
  };
}

/**
 * Purchase an offer from the merchant.
 *
 * Returns the updated state and the purchased offer (or null if not found / out of stock).
 * Callers are responsible for checking and deducting resources.
 */
export function purchaseOffer(
  state: MerchantState,
  offerId: string,
): { state: MerchantState; offer: MerchantOffer | null } {
  if (!state.isPresent) {
    return { state, offer: null };
  }

  const offerIndex = state.currentOffers.findIndex((o) => o.id === offerId);
  if (offerIndex === -1) {
    return { state, offer: null };
  }

  const offer = state.currentOffers[offerIndex];
  if (offer.quantity <= 0) {
    return { state, offer: null };
  }

  const updatedOffers = state.currentOffers.map((o, i) =>
    i === offerIndex ? { ...o, quantity: o.quantity - 1 } : o,
  );
  const filteredOffers = updatedOffers.filter((o) => o.quantity > 0);

  return {
    state: {
      ...state,
      currentOffers: filteredOffers,
    },
    offer,
  };
}
