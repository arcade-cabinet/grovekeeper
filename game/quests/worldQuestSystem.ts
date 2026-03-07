/**
 * World Quest System -- seed-driven variant quest templates.
 *
 * 8 world quest templates unlock progressively as the player explores further
 * from the origin. Each template has 6 independent variant slots with 3 options
 * each, yielding 3^6 = 729 unique quest combinations per template per seed.
 *
 * Variant selection is deterministic: same templateId + same worldSeed always
 * produces the same 6-index selection array. Spec §30.
 */

import worldQuestData from "@/config/game/worldQuests.json" with { type: "json" };
import { scopedRNG } from "@/game/utils/seedWords";

// -- Constants --

export const TOTAL_WORLD_QUESTS = 8;
export const VARIANT_SLOTS_COUNT = 6;
export const VARIANT_OPTIONS_COUNT = 3;
/** 3^6 = 729 unique combinations per template. */
export const TOTAL_VARIANT_COMBINATIONS = VARIANT_OPTIONS_COUNT ** VARIANT_SLOTS_COUNT;

// -- Types --

export interface WorldQuestVariantOption {
  optionId: string;
  label: string;
  npcId?: string;
  dialogueId?: string;
  targetType?: string;
  targetAmount?: number;
  bonusXp?: number;
  bonusTimber?: number;
  bonusSap?: number;
  bonusFruit?: number;
  bonusAcorns?: number;
}

export interface WorldQuestVariantSlot {
  slotId: string;
  options: [WorldQuestVariantOption, WorldQuestVariantOption, WorldQuestVariantOption];
}

export interface WorldQuestStep {
  id: string;
  name: string;
  description: string;
  /** Slot ID that provides npcId + dialogueId for this step. */
  npcSlot?: string;
  /** Slot ID whose selected option provides targetType. */
  targetTypeSlot?: string;
  /** Slot ID whose selected option provides targetAmount. */
  targetAmountSlot?: string;
  /** Fixed targetType when no slot override is used. */
  targetType?: string;
  /** Fixed targetAmount when no slot override is used. */
  targetAmount?: number;
}

export interface WorldQuestTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlockDistanceChunks: number;
  /** Also requires this many spirits discovered (0 = no spirit requirement). */
  prerequisiteSpirits: number;
  involvedNpcIds: string[];
  variantSlots: WorldQuestVariantSlot[];
  steps: WorldQuestStep[];
  baseReward: { xp: number; timber?: number; sap?: number };
}

export interface ResolvedWorldQuestStep {
  id: string;
  name: string;
  description: string;
  npcId: string;
  dialogueId: string;
  targetType: string;
  targetAmount: number;
}

export interface ResolvedWorldQuestReward {
  xp: number;
  timber?: number;
  sap?: number;
  fruit?: number;
  acorns?: number;
}

export interface ResolvedWorldQuest {
  templateId: string;
  name: string;
  description: string;
  icon: string;
  unlockDistanceChunks: number;
  prerequisiteSpirits: number;
  /** Indices [0–2] for each of the 6 variant slots, in slot order. */
  variantSelections: number[];
  steps: ResolvedWorldQuestStep[];
  reward: ResolvedWorldQuestReward;
}

// -- Data loading --

const templateMap = new Map<string, WorldQuestTemplate>();
for (const t of worldQuestData as WorldQuestTemplate[]) {
  templateMap.set(t.id, t);
}

/** Get all 8 world quest templates. */
export const getAllWorldQuestTemplates = (): WorldQuestTemplate[] =>
  worldQuestData as WorldQuestTemplate[];

/** Get a single world quest template by ID, or undefined if not found. */
export const getWorldQuestTemplate = (templateId: string): WorldQuestTemplate | undefined =>
  templateMap.get(templateId);

// -- Variant selection --

/**
 * Resolve which variant option (0–2) to use for each slot.
 * Deterministic: same templateId + same worldSeed always returns the same array.
 * The scope key `"world-quest-<templateId>"` ensures independent RNG streams
 * across templates, so each template varies differently for the same seed.
 */
export const resolveVariantSelections = (templateId: string, worldSeed: string): number[] => {
  const rng = scopedRNG("world-quest", worldSeed, templateId);
  return Array.from({ length: VARIANT_SLOTS_COUNT }, () =>
    Math.floor(rng() * VARIANT_OPTIONS_COUNT),
  );
};

/**
 * Resolve a world quest template with seed-selected variants.
 * Returns null if the templateId is unknown.
 */
export const resolveWorldQuest = (
  templateId: string,
  worldSeed: string,
): ResolvedWorldQuest | null => {
  const template = templateMap.get(templateId);
  if (!template) return null;

  const selections = resolveVariantSelections(templateId, worldSeed);

  // Build slotId -> selected option lookup
  const slotOptions = new Map<string, WorldQuestVariantOption>();
  template.variantSlots.forEach((slot, i) => {
    const idx = selections[i] ?? 0;
    slotOptions.set(slot.slotId, slot.options[idx]);
  });

  // Resolve reward: base + optional bonus from reward-bonus slot
  const rewardOption = slotOptions.get("reward-bonus");
  const reward: ResolvedWorldQuestReward = {
    xp: template.baseReward.xp + (rewardOption?.bonusXp ?? 0),
  };
  const baseTimber = template.baseReward.timber ?? 0;
  const bonusTimber = rewardOption?.bonusTimber ?? 0;
  if (baseTimber + bonusTimber > 0) reward.timber = baseTimber + bonusTimber;
  const baseSap = template.baseReward.sap ?? 0;
  const bonusSap = rewardOption?.bonusSap ?? 0;
  if (baseSap + bonusSap > 0) reward.sap = baseSap + bonusSap;
  if (rewardOption?.bonusFruit) reward.fruit = rewardOption.bonusFruit;
  if (rewardOption?.bonusAcorns) reward.acorns = rewardOption.bonusAcorns;

  // Resolve steps
  const fallbackNpcId = template.involvedNpcIds[0] ?? "elder-rowan";
  const steps: ResolvedWorldQuestStep[] = template.steps.map((step) => {
    const npcOption = step.npcSlot ? slotOptions.get(step.npcSlot) : undefined;
    const taskOption = step.targetTypeSlot ? slotOptions.get(step.targetTypeSlot) : undefined;

    const npcId = npcOption?.npcId ?? fallbackNpcId;
    const dialogueId = npcOption?.dialogueId ?? `${npcId}-greeting`;
    const targetType = taskOption?.targetType ?? step.targetType ?? "trees_planted";
    const targetAmount = taskOption?.targetAmount ?? step.targetAmount ?? 1;

    return {
      id: step.id,
      name: step.name,
      description: step.description,
      npcId,
      dialogueId,
      targetType,
      targetAmount,
    };
  });

  return {
    templateId,
    name: template.name,
    description: template.description,
    icon: template.icon,
    unlockDistanceChunks: template.unlockDistanceChunks,
    prerequisiteSpirits: template.prerequisiteSpirits,
    variantSelections: selections,
    steps,
    reward,
  };
};

// -- Unlock checks --

/**
 * Check if a world quest template is unlocked.
 * Requires maxChunkDistance >= unlockDistanceChunks AND
 * discoveredSpiritCount >= prerequisiteSpirits (if any).
 */
export const isWorldQuestUnlocked = (
  templateId: string,
  maxChunkDistance: number,
  discoveredSpiritCount: number = 0,
): boolean => {
  const template = templateMap.get(templateId);
  if (!template) return false;
  if (maxChunkDistance < template.unlockDistanceChunks) return false;
  if (template.prerequisiteSpirits > 0 && discoveredSpiritCount < template.prerequisiteSpirits) {
    return false;
  }
  return true;
};

/**
 * Get all resolved world quests that are currently unlocked for the player.
 * Results are ordered by unlockDistanceChunks ascending (same order as templates).
 */
export const getUnlockedWorldQuests = (
  worldSeed: string,
  maxChunkDistance: number,
  discoveredSpiritCount: number = 0,
): ResolvedWorldQuest[] => {
  const result: ResolvedWorldQuest[] = [];
  for (const t of worldQuestData as WorldQuestTemplate[]) {
    if (isWorldQuestUnlocked(t.id, maxChunkDistance, discoveredSpiritCount)) {
      const resolved = resolveWorldQuest(t.id, worldSeed);
      if (resolved) result.push(resolved);
    }
  }
  return result;
};
