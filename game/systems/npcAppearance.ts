/**
 * Seeded NPC appearance generator.
 *
 * Deterministically assembles an NPC's visual appearance from 3DPSX
 * ChibiCharacter base models and individual item attachments using
 * scopedRNG. The same seed + worldSeed + role always produces the
 * same appearance.
 */

import type { NpcComponent, NpcItemSlot } from "@/game/ecs/components/npc";

/** Appearance subset of NpcComponent returned by generateNpcAppearance. */
type NpcAppearance = Pick<NpcComponent, "baseModel" | "useEmission" | "items" | "colorPalette">;

import npcAssets from "@/config/game/npcAssets.json" with { type: "json" };
import { scopedRNG } from "@/game/utils/seedWords";

/** Base model IDs available for NPC generation (excludes "allinone" composite). */
const BASE_MODELS = npcAssets.base.filter((b) => b.id !== "allinone").map((b) => b.id);

/** Items grouped by slot for quick lookup. */
const ITEMS_BY_SLOT: Record<NpcItemSlot, string[]> = {
  head: [],
  torso: [],
  legs: [],
  feet: [],
  accessory: [],
};

for (const item of npcAssets.items) {
  const slot = item.slot as NpcItemSlot;
  if (ITEMS_BY_SLOT[slot]) {
    ITEMS_BY_SLOT[slot].push(item.id);
  }
}

/** Role-to-base-model affinity: roles prefer certain base models. */
const ROLE_BASE_AFFINITY: Record<string, string[]> = {
  trading: ["merchant", "basemesh", "student"],
  quests: ["archer", "knight", "student"],
  tips: ["basemesh", "student", "merchant"],
  seeds: ["basemesh", "student", "merchant"],
  crafting: ["knight", "basemesh", "merchant"],
  lore: ["student", "basemesh", "ninja"],
};

/** Role-to-item-set: which item categories are favored per role. */
const ROLE_ITEM_RULES: Record<string, Partial<Record<NpcItemSlot, string[]>>> = {
  trading: {
    torso: ["shirt", "chemise", "greenoutfit"],
    accessory: ["bag", "ceinture"],
  },
  quests: {
    torso: ["greenoutfit", "greenoutfitbelt", "greenoutfitneckless"],
    legs: ["pants", "armorthigh"],
  },
  tips: {
    head: ["hat", "hairone", "hairtail"],
    torso: ["shirt", "chemise"],
  },
  seeds: {
    head: ["hat", "hairone", "hairvariant"],
    torso: ["chemise", "greenoutfit"],
    accessory: ["bag"],
  },
  crafting: {
    torso: ["amorplastron", "amorarm", "shirt"],
    legs: ["pants", "armorlegs"],
    feet: ["bottes", "shoe"],
  },
  lore: {
    head: ["hat", "hairT", "hairvariant-001"],
    torso: ["chemise", "shirt"],
  },
};

/** Incompatible item sets -- wearing one excludes the other. */
const INCOMPATIBLE_SETS: string[][] = [
  ["ninjassuit", "greenoutfit", "amorplastron", "amorarm"],
  ["ninjassuitthigh", "armorlegs", "armorthigh", "armorceinturethighs"],
  ["ninjassuitshoe", "armorshoe", "bottes", "bottesgreen"],
  ["ninjassuitmask", "hat", "armorhelmet"],
];

/** Color palettes for NPC tinting -- warm, earthy, cozy tones. */
const COLOR_PALETTES = [
  "#8B4513",
  "#D2691E",
  "#CD853F",
  "#DEB887",
  "#F4A460",
  "#A0522D",
  "#6B8E23",
  "#556B2F",
  "#2E8B57",
  "#3CB371",
  "#4682B4",
  "#5F9EA0",
  "#708090",
  "#778899",
  "#B8860B",
  "#DAA520",
];

/** Pick a random element from an array using the given RNG. */
function pick<T>(arr: readonly T[], rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)];
}

/** Check if an item conflicts with already-selected items. */
function isCompatible(itemId: string, selectedItems: string[]): boolean {
  for (const set of INCOMPATIBLE_SETS) {
    if (!set.includes(itemId)) continue;
    for (const selected of selectedItems) {
      if (set.includes(selected) && selected !== itemId) return false;
    }
  }
  return true;
}

/**
 * Generate a deterministic NPC appearance from seed parameters.
 *
 * @param seed - Unique NPC identifier seed (e.g., NPC name or entity ID)
 * @param worldSeed - World seed for global consistency
 * @param role - NPC function role (trading, quests, tips, seeds, crafting, lore)
 * @returns A fully assembled NpcAppearance
 */
export function generateNpcAppearance(
  seed: string,
  worldSeed: string,
  role: string,
): NpcAppearance {
  const rng = scopedRNG("npc-appearance", worldSeed, seed, role);

  // Pick base model with role affinity
  const affinityModels = ROLE_BASE_AFFINITY[role] ?? BASE_MODELS;
  const useAffinity = rng() < 0.7;
  const baseModel = useAffinity ? pick(affinityModels, rng) : pick(BASE_MODELS, rng);

  // Decide emission (night glow) -- rare, ~15% chance
  const useEmission = rng() < 0.15;

  // Pick items per slot using role rules
  const items: Partial<Record<NpcItemSlot, string>> = {};
  const selectedItemIds: string[] = [];
  const roleRules = ROLE_ITEM_RULES[role] ?? {};
  const slots: NpcItemSlot[] = ["head", "torso", "legs", "feet", "accessory"];

  for (const slot of slots) {
    // Some slots are optional -- skip with probability
    const skipChance = slot === "accessory" ? 0.6 : 0.25;
    if (rng() < skipChance) continue;

    // Use role-preferred items if available, otherwise full slot pool
    const pool = roleRules[slot] ?? ITEMS_BY_SLOT[slot];
    if (pool.length === 0) continue;

    // Try up to 3 times to find a compatible item
    for (let attempt = 0; attempt < 3; attempt++) {
      const candidate = pick(pool, rng);
      if (isCompatible(candidate, selectedItemIds)) {
        items[slot] = candidate;
        selectedItemIds.push(candidate);
        break;
      }
    }
  }

  // Pick color palette
  const colorPalette = pick(COLOR_PALETTES, rng);

  return { baseModel, useEmission, items, colorPalette };
}
