/**
 * Main Quest System -- Grovekeeper Path and Worldroot's Dream.
 *
 * The main quest tracks discovery of 8 Grovekeeper Spirits in hedge labyrinths.
 * Finding all 8 unlocks "The Worldroot's Dream" final quest. Spec §32.3.
 *
 * Pure query helpers over questChainEngine. No store dependencies.
 * The game store's `discoverSpirit(spiritId)` action drives the event side.
 */

import {
  computeAvailableChains,
  getCurrentStepProgress,
  isChainCompleted,
} from "./questChainEngine.ts";
import type { QuestChainState } from "./types.ts";

export const MAIN_QUEST_CHAIN_ID = "main-quest-spirits";
export const WORLDROOTS_DREAM_CHAIN_ID = "worldroots-dream";
export const TOTAL_SPIRITS = 8;

/**
 * Returns how many spirits have been discovered (0–8).
 * Reads the first objective of the active step; returns TOTAL_SPIRITS if
 * the chain is already completed.
 */
export const getSpiritDiscoveryCount = (chainState: QuestChainState): number => {
  if (isChainCompleted(MAIN_QUEST_CHAIN_ID, chainState)) return TOTAL_SPIRITS;

  const stepProgress = getCurrentStepProgress(MAIN_QUEST_CHAIN_ID, chainState);
  if (!stepProgress) return 0;

  return stepProgress.objectives[0]?.currentProgress ?? 0;
};

/**
 * Returns true if all 8 spirits have been discovered (main quest complete).
 */
export const isMainQuestComplete = (chainState: QuestChainState): boolean =>
  isChainCompleted(MAIN_QUEST_CHAIN_ID, chainState);

/**
 * Returns true if The Worldroot's Dream is available to start.
 * Only true after all 8 spirits are found and main quest reward is claimed.
 */
export const isWorldrootsDreamAvailable = (
  chainState: QuestChainState,
  playerLevel: number,
): boolean => computeAvailableChains(chainState, playerLevel).includes(WORLDROOTS_DREAM_CHAIN_ID);
