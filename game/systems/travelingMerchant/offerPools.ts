/**
 * Traveling Merchant offer pool templates.
 * Extracted from the main module to keep travelingMerchant/index.ts under 300 lines.
 *
 * Pure data -- no side effects.
 */

import type { ResourceType } from "@/game/config/resources";

// -- Types ────────────────────────────────────────────────────────────────────

export interface MerchantReward {
  type: "resource" | "seed" | "xp" | "recipe";
  resource?: ResourceType;
  amount?: number;
  speciesId?: string;
  recipeId?: string;
}

export interface OfferTemplate {
  name: string;
  description: string;
  cost: Partial<Record<ResourceType, number>>;
  reward: MerchantReward;
  minVisit: number;
  baseQuantity: number;
}

// -- Offer Pools ──────────────────────────────────────────────────────────────

export const RESOURCE_OFFERS: OfferTemplate[] = [
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

export const SEED_OFFERS: OfferTemplate[] = [
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

export const XP_OFFERS: OfferTemplate[] = [
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

export const RECIPE_OFFERS: OfferTemplate[] = [
  {
    name: "Merchant's Recipe Scroll",
    description: "A recipe for a powerful resource conversion.",
    cost: { acorns: 30, fruit: 20 },
    reward: { type: "recipe", recipeId: "merchant-special" },
    minVisit: 3,
    baseQuantity: 1,
  },
];

export const ALL_OFFER_TEMPLATES: OfferTemplate[] = [
  ...RESOURCE_OFFERS,
  ...SEED_OFFERS,
  ...XP_OFFERS,
  ...RECIPE_OFFERS,
];
