/**
 * progression.ts -- Grid expansion, prestige, and tool upgrade actions.
 * Spec §13 (grid), §16 (prestige), §11 (tool upgrades)
 */

import { batch } from "@legendapp/state";
import { initializeEventState } from "@/game/events/eventScheduler";
import { initializeChainState } from "@/game/quests/questChainEngine";
import { canAffordExpansion, getNextExpansionTier } from "@/game/systems/gridExpansion";
import { initializeMarketEventState } from "@/game/systems/marketEvents";
import {
  calculatePrestigeBonus,
  canPrestige,
  generateNewWorldSeed,
  getPrestigeResetState,
  getUnlockedPrestigeSpecies,
} from "@/game/systems/prestige";
import { initializeMarketState } from "@/game/systems/supplyDemand";
import { canAffordToolUpgrade, getToolUpgradeTier } from "@/game/systems/toolUpgrades";
import { initializeMerchantState } from "@/game/systems/travelingMerchant";
import { showToast } from "@/game/ui/Toast";
import { clearAllChunkDiffs } from "@/game/world/chunkPersistence";
import { gameState$, getState, type initialState } from "./core.ts";

export function expandGrid(): boolean {
  const state = getState();
  const nextTier = getNextExpansionTier(state.gridSize);
  if (!nextTier) return false;
  if (!canAffordExpansion(nextTier, state.resources, state.level)) return false;

  const newResources = { ...state.resources };
  for (const [resource, amount] of Object.entries(nextTier.cost)) {
    newResources[resource as keyof typeof newResources] =
      (newResources[resource as keyof typeof newResources] ?? 0) - amount;
  }
  batch(() => {
    gameState$.gridSize.set(nextTier.size);
    gameState$.resources.set(newResources);
  });
  queueMicrotask(() => {
    showToast(`Grove expanded to ${nextTier.size}x${nextTier.size}!`, "success");
  });
  return true;
}

export function performPrestige(): boolean {
  const state = getState();
  if (!canPrestige(state.level)) return false;

  const newCount = state.prestigeCount + 1;
  const resetState = getPrestigeResetState();
  const bonus = calculatePrestigeBonus(newCount);
  const prestigeSpecies = getUnlockedPrestigeSpecies(newCount);
  const newUnlockedSpecies = ["white-oak", ...prestigeSpecies.map((s) => s.id)];
  const newWorldSeed = generateNewWorldSeed();

  clearAllChunkDiffs();

  gameState$.set({
    ...getState(),
    ...(resetState as Partial<typeof initialState>),
    screen: state.screen,
    prestigeCount: newCount,
    worldSeed: newWorldSeed,
    maxStamina: 100 + bonus.staminaBonus,
    stamina: 100 + bonus.staminaBonus,
    gridSize: 12,
    coins: 0,
    unlockedTools: ["trowel", "watering-can"],
    unlockedSpecies: newUnlockedSpecies,
    achievements: state.achievements,
    seasonsExperienced: state.seasonsExperienced,
    speciesPlanted: [],
    lifetimeResources: state.lifetimeResources,
    speciesProgress: state.speciesProgress,
    pendingCodexUnlocks: [],
    questChainState: initializeChainState(),
    placedStructures: [],
    buildMode: false,
    buildTemplateId: null,
    toolUpgrades: {},
    toolDurabilities: {},
    marketState: initializeMarketState(),
    merchantState: initializeMerchantState(),
    marketEventState: initializeMarketEventState(),
    eventState: initializeEventState(),
    hasSeenRules: state.hasSeenRules,
    hapticsEnabled: state.hapticsEnabled,
    soundEnabled: state.soundEnabled,
    groveData: null,
    discoveredSpiritIds: state.discoveredSpiritIds,
    npcRelationships: state.npcRelationships,
  });

  queueMicrotask(() => {
    showToast(`Prestige ${newCount}! Bonuses applied.`, "achievement");
    for (const sp of prestigeSpecies) {
      if (sp.requiredPrestiges === newCount) showToast(`Unlocked: ${sp.name}`, "achievement");
    }
  });
  return true;
}

export function upgradeToolTier(toolId: string): boolean {
  const state = getState();
  const currentTier = state.toolUpgrades[toolId] ?? 0;
  const nextTier = getToolUpgradeTier(currentTier);
  if (!nextTier) return false;
  if (!canAffordToolUpgrade(nextTier, state.resources)) return false;

  const newResources = { ...state.resources };
  for (const [resource, amount] of Object.entries(nextTier.cost)) {
    newResources[resource as keyof typeof newResources] =
      (newResources[resource as keyof typeof newResources] ?? 0) - amount;
  }
  batch(() => {
    gameState$.resources.set(newResources);
    gameState$.toolUpgrades.set({ ...state.toolUpgrades, [toolId]: currentTier + 1 });
  });
  queueMicrotask(() => {
    showToast(`Tool upgraded to tier ${currentTier + 1}!`, "success");
  });
  return true;
}
