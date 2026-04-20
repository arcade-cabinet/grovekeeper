/**
 * Traveling Merchant -- visits every 7-14 game-days with unique trade offers.
 *
 * Stock improves with each visit (scales with visit count).
 * The merchant stays for 2 game-days, then departs.
 *
 * Pure functions -- no side effects.
 */

import type { ResourceType } from "@/config/resources";
import { createRNG, hashString } from "@/shared/utils/seedRNG";

// ── Types ────────────────────────────────────────────────────────────────────

export interface MerchantReward {
  type: "resource" | "seed" | "xp" | "recipe";
  resource?: ResourceType;
  amount?: number;
  speciesId?: string;
  recipeId?: string;
}

export interface MerchantOffer {
  id: string;
  name: string;
  description: string;
  cost: Partial<Record<ResourceType, number>>;
  reward: MerchantReward;
  quantity: number;
}

export interface MerchantState {
  visitCount: number;
  lastVisitDay: number;
  nextVisitDay: number;
  isPresent: boolean;
  currentOffers: MerchantOffer[];
  departDay: number;
}

// ── Constants ────────────────────────────────────────────────────────────────

const MIN_VISIT_INTERVAL = 7;
const MAX_VISIT_INTERVAL = 14;
const STAY_DURATION = 2;

// ── Offer Pools ──────────────────────────────────────────────────────────────

interface OfferTemplate {
  name: string;
  description: string;
  cost: Partial<Record<ResourceType, number>>;
  reward: MerchantReward;
  minVisit: number; // minimum visit count to unlock this template
  baseQuantity: number;
}

const RESOURCE_OFFERS: OfferTemplate[] = [
  {
    name: "Timber Bundle",
    description: "A generous stack of seasoned timber.",
    cost: { acorns: 15 },
    reward: { type: "resource", resource: "timber", amount: 20 },
    minVisit: 0,
    baseQuantity: 3,
  },
  {
    name: "Sap Barrels",
    description: "Fresh sap sealed in oak barrels.",
    cost: { timber: 15 },
    reward: { type: "resource", resource: "sap", amount: 12 },
    minVisit: 0,
    baseQuantity: 3,
  },
  {
    name: "Exotic Fruit Crate",
    description: "Rare fruits from distant groves.",
    cost: { sap: 10, timber: 5 },
    reward: { type: "resource", resource: "fruit", amount: 15 },
    minVisit: 1,
    baseQuantity: 2,
  },
  {
    name: "Acorn Sack",
    description: "Premium acorns from ancient oaks.",
    cost: { fruit: 12 },
    reward: { type: "resource", resource: "acorns", amount: 18 },
    minVisit: 0,
    baseQuantity: 3,
  },
];

const SEED_OFFERS: OfferTemplate[] = [
  {
    name: "Mystery Seed Pouch",
    description: "Seeds from a faraway forest. Who knows what grows?",
    cost: { acorns: 20, sap: 10 },
    reward: { type: "seed", speciesId: "silver-maple", amount: 1 },
    minVisit: 2,
    baseQuantity: 1,
  },
  {
    name: "Rare Willow Cutting",
    description: "A cutting from a legendary weeping willow.",
    cost: { timber: 25, sap: 15 },
    reward: { type: "seed", speciesId: "weeping-willow", amount: 1 },
    minVisit: 3,
    baseQuantity: 1,
  },
  {
    name: "Cypress Sapling",
    description: "A hardy cypress ready for planting.",
    cost: { fruit: 20, acorns: 20 },
    reward: { type: "seed", speciesId: "bald-cypress", amount: 1 },
    minVisit: 4,
    baseQuantity: 1,
  },
];

const XP_OFFERS: OfferTemplate[] = [
  {
    name: "Forester's Almanac",
    description: "A tome of grove wisdom. Grants experience.",
    cost: { timber: 10, sap: 5 },
    reward: { type: "xp", amount: 50 },
    minVisit: 1,
    baseQuantity: 1,
  },
  {
    name: "Elder's Blessing",
    description: "Ancient knowledge passed down through generations.",
    cost: { timber: 20, sap: 15, fruit: 10 },
    reward: { type: "xp", amount: 150 },
    minVisit: 5,
    baseQuantity: 1,
  },
];

const RECIPE_OFFERS: OfferTemplate[] = [
  {
    name: "Merchant's Recipe Scroll",
    description: "A recipe for a powerful resource conversion.",
    cost: { acorns: 30, fruit: 20 },
    reward: { type: "recipe", recipeId: "merchant-special" },
    minVisit: 3,
    baseQuantity: 1,
  },
];

const ALL_OFFER_TEMPLATES: OfferTemplate[] = [
  ...RESOURCE_OFFERS,
  ...SEED_OFFERS,
  ...XP_OFFERS,
  ...RECIPE_OFFERS,
];

// ── Helpers ──────────────────────────────────────────────────────────────────

function computeNextVisitDay(currentDay: number, rng: () => number): number {
  const interval =
    MIN_VISIT_INTERVAL +
    Math.floor(rng() * (MAX_VISIT_INTERVAL - MIN_VISIT_INTERVAL + 1));
  return currentDay + interval;
}

// ── Public API ───────────────────────────────────────────────────────────────

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
export function generateMerchantOffers(
  visitCount: number,
  rngSeed: string,
): MerchantOffer[] {
  const seed = hashString(`${rngSeed}-offers-${visitCount}`);
  const rng = createRNG(seed);

  // Filter templates by visit count eligibility
  const eligible = ALL_OFFER_TEMPLATES.filter((t) => visitCount >= t.minVisit);

  if (eligible.length === 0) return [];

  // Determine how many offers to generate
  let offerCount: number;
  if (visitCount < 2) {
    offerCount = 3;
  } else if (visitCount < 4) {
    offerCount = 4;
  } else {
    offerCount = 5;
  }

  offerCount = Math.min(offerCount, eligible.length);

  // Shuffle eligible templates using Fisher-Yates
  const shuffled = [...eligible];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  // Take the first N templates and convert to offers
  const selected = shuffled.slice(0, offerCount);

  // Quantity bonus: every 3 visits, +1 to base quantity
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

  // Merchant departs if stay duration has elapsed
  if (newState.isPresent && currentDay >= newState.departDay) {
    const departureSeed = hashString(`${rngSeed}-depart-${currentDay}`);
    const rng = createRNG(departureSeed);

    newState = {
      ...newState,
      isPresent: false,
      currentOffers: [],
      nextVisitDay: computeNextVisitDay(currentDay, rng),
    };
  }

  // Merchant arrives if it is time
  if (!newState.isPresent && currentDay >= newState.nextVisitDay) {
    const visitNumber = newState.visitCount + 1;
    const offers = generateMerchantOffers(
      visitNumber,
      `${rngSeed}-visit-${visitNumber}`,
    );

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

  // Decrement quantity
  const updatedOffers = state.currentOffers.map((o, i) =>
    i === offerIndex ? { ...o, quantity: o.quantity - 1 } : o,
  );

  // Remove offers that are fully depleted
  const filteredOffers = updatedOffers.filter((o) => o.quantity > 0);

  return {
    state: {
      ...state,
      currentOffers: filteredOffers,
    },
    offer,
  };
}
