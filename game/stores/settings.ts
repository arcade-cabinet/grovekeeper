/**
 * settings.ts -- Settings, NPC relations, tutorial, fast travel, species codex, and spirit actions.
 * Spec §15 (NPC), §17.6 (fast travel), §25.1 (tutorial), §26 (settings), §32.3 (spirits)
 */

import { batch } from "@legendapp/state";
import growthConfig from "@/config/game/growth.json" with { type: "json" };
import { getSpeciesById } from "@/game/config/species";
import { discoverCampfire as discoverCampfirePure, type FastTravelPoint } from "@/game/systems/fastTravel";
import {
  awardGiftXp as awardGiftXpPure,
  awardQuestCompletionXp as awardQuestCompletionXpPure,
  awardTradingXp as awardTradingXpPure,
  setRelationship as setRelationshipPure,
} from "@/game/systems/npcRelationship";
import { skipTutorial as skipTutorialPure, tickTutorial } from "@/game/systems/tutorial";
import {
  computeDiscoveryTier,
  createEmptyProgress,
  encounterWildSpecies,
  type SpeciesProgress,
} from "@/game/systems/speciesDiscovery";
import { startChain } from "@/game/quests/questChainEngine";
import { showToast } from "@/game/ui/Toast";
import { gameState$, getState, initialState } from "./core";
// Cross-domain imports -- safe: questState/playerState don't import from settings
import { advanceQuestObjective } from "./questState";
import { addXp } from "./playerState";

export function updateSettings(partial: Partial<typeof initialState.settings>): void {
  const current = gameState$.settings.peek();
  gameState$.settings.set({ ...current, ...partial });
}

export function setHasSeenRules(seen: boolean): void {
  gameState$.hasSeenRules.set(seen);
}

export function setHapticsEnabled(enabled: boolean): void {
  gameState$.hapticsEnabled.set(enabled);
}

export function setSoundEnabled(enabled: boolean): void {
  gameState$.soundEnabled.set(enabled);
}

// ---------------------------------------------------------------------------
// NPC Relationship actions -- Spec §15
// ---------------------------------------------------------------------------

export function awardNpcTradingXp(npcId: string): void {
  const state = getState();
  gameState$.npcRelationships.set(awardTradingXpPure(state.npcRelationships, npcId));
}

export function awardNpcQuestCompletionXp(npcId: string): void {
  const state = getState();
  gameState$.npcRelationships.set(awardQuestCompletionXpPure(state.npcRelationships, npcId));
}

export function awardNpcGiftXp(npcId: string, giftMultiplier = 1.0): void {
  const state = getState();
  gameState$.npcRelationships.set(awardGiftXpPure(state.npcRelationships, npcId, giftMultiplier));
}

export function setNpcRelationship(npcId: string, value: number): void {
  const state = getState();
  gameState$.npcRelationships.set(setRelationshipPure(state.npcRelationships, npcId, value));
}

// ---------------------------------------------------------------------------
// Spirit discovery -- Spec §32.3
// ---------------------------------------------------------------------------

export function discoverSpirit(spiritId: string): boolean {
  const state = getState();
  if (state.discoveredSpiritIds.includes(spiritId)) return false;

  gameState$.discoveredSpiritIds.set([...state.discoveredSpiritIds, spiritId]);

  const chainState = getState().questChainState;
  const isActive = "main-quest-spirits" in chainState.activeChains;
  const isCompleted = chainState.completedChainIds.includes("main-quest-spirits");
  if (!isActive && !isCompleted) {
    const newChainState = startChain(chainState, "main-quest-spirits", getState().currentDay);
    gameState$.questChainState.set(newChainState);
  }

  advanceQuestObjective("spirit_discovered", 1);
  return true;
}

// ---------------------------------------------------------------------------
// Tutorial actions -- Spec §25.1
// ---------------------------------------------------------------------------

export function advanceTutorial(signal: string): void {
  const state = getState();
  const newTutorialState = tickTutorial(state.tutorialState, signal);
  if (newTutorialState !== state.tutorialState) {
    gameState$.tutorialState.set(newTutorialState);
  }
}

export function completeTutorialSkip(): void {
  gameState$.tutorialState.set(skipTutorialPure(getState().tutorialState));
}

// ---------------------------------------------------------------------------
// Fast travel actions -- Spec §17.6
// ---------------------------------------------------------------------------

export function discoverCampfirePoint(point: FastTravelPoint): boolean {
  const state = getState();
  const result = discoverCampfirePure(state.discoveredCampfires, point);
  if (!result.isNew) return false;
  gameState$.discoveredCampfires.set(result.newPoints);
  if (result.isFull) {
    queueMicrotask(() => {
      showToast("Campfire network full (8/8). Remove one to add more.", "info");
    });
  } else {
    queueMicrotask(() => {
      showToast(`Campfire discovered: ${point.label}`, "success");
    });
  }
  return true;
}

export function removeCampfirePoint(id: string): boolean {
  const state = getState();
  const filtered = state.discoveredCampfires.filter((p) => p.id !== id);
  if (filtered.length === state.discoveredCampfires.length) return false;
  gameState$.discoveredCampfires.set(filtered);
  return true;
}

/** Record a chunk as visited for minimap fog-of-war. Idempotent. Spec §17.6 */
export function discoverChunk(cx: number, cz: number, baseColor: string): void {
  const key = `${cx},${cz}`;
  if (getState().discoveredChunks[key]) return;
  gameState$.discoveredChunks[key].set(baseColor);
}

// ---------------------------------------------------------------------------
// Species codex actions -- Spec §8, §25
// ---------------------------------------------------------------------------

export function trackSpeciesPlanting(speciesId: string): void {
  const state = getState();
  const existing = state.speciesProgress[speciesId] ?? createEmptyProgress();
  const updated: SpeciesProgress = {
    ...existing,
    timesPlanted: existing.timesPlanted + 1,
  };
  updated.discoveryTier = computeDiscoveryTier(updated);

  const tierChanged = updated.discoveryTier > existing.discoveryTier;
  batch(() => {
    gameState$.speciesProgress.set({ ...state.speciesProgress, [speciesId]: updated });
    if (tierChanged) {
      gameState$.pendingCodexUnlocks.set([...state.pendingCodexUnlocks, speciesId]);
    }
  });

  if (tierChanged) {
    const sp = getSpeciesById(speciesId);
    queueMicrotask(() => {
      showToast(`Codex: ${sp?.name ?? speciesId} -- Discovered!`, "achievement");
    });
  }
}

export function trackSpeciesGrowth(speciesId: string, newStage: number): void {
  const state = getState();
  const existing = state.speciesProgress[speciesId] ?? createEmptyProgress();
  if (newStage <= existing.maxStageReached) return;

  const updated: SpeciesProgress = { ...existing, maxStageReached: newStage };
  updated.discoveryTier = computeDiscoveryTier(updated);

  const tierChanged = updated.discoveryTier > existing.discoveryTier;
  batch(() => {
    gameState$.speciesProgress.set({ ...state.speciesProgress, [speciesId]: updated });
    if (tierChanged) {
      gameState$.pendingCodexUnlocks.set([...state.pendingCodexUnlocks, speciesId]);
    }
  });

  if (tierChanged) {
    const sp = getSpeciesById(speciesId);
    const tierNames = ["", "Discovered", "Studied", "Mastered", "Legendary"];
    queueMicrotask(() => {
      showToast(
        `Codex: ${sp?.name ?? speciesId} -- ${tierNames[updated.discoveryTier]}!`,
        "achievement",
      );
    });
  }
}

export function trackSpeciesHarvest(speciesId: string, yieldAmount: number): void {
  const state = getState();
  const existing = state.speciesProgress[speciesId] ?? createEmptyProgress();
  const updated: SpeciesProgress = {
    ...existing,
    timesHarvested: existing.timesHarvested + 1,
    totalYield: existing.totalYield + yieldAmount,
  };
  updated.discoveryTier = computeDiscoveryTier(updated);

  const tierChanged = updated.discoveryTier > existing.discoveryTier;
  batch(() => {
    gameState$.speciesProgress.set({ ...state.speciesProgress, [speciesId]: updated });
    if (tierChanged) {
      gameState$.pendingCodexUnlocks.set([...state.pendingCodexUnlocks, speciesId]);
    }
  });

  if (tierChanged) {
    const sp = getSpeciesById(speciesId);
    queueMicrotask(() => {
      showToast(`Codex: ${sp?.name ?? speciesId} -- Legendary!`, "achievement");
    });
  }
}

export function consumePendingCodexUnlock(): string | null {
  const state = getState();
  if (state.pendingCodexUnlocks.length === 0) return null;
  const [first, ...rest] = state.pendingCodexUnlocks;
  gameState$.pendingCodexUnlocks.set(rest);
  return first;
}

/**
 * Record a first wild sighting of a species. Grants XP and queues codex unlock.
 * Idempotent. Returns true if new discovery. Spec §8, §25.
 */
export function discoverWildSpecies(speciesId: string): boolean {
  const state = getState();
  const existing = state.speciesProgress[speciesId] ?? createEmptyProgress();
  const { isNew, updated } = encounterWildSpecies(existing);
  if (!isNew) return false;

  batch(() => {
    gameState$.speciesProgress.set({ ...state.speciesProgress, [speciesId]: updated });
    if (updated.discoveryTier > existing.discoveryTier) {
      gameState$.pendingCodexUnlocks.set([...state.pendingCodexUnlocks, speciesId]);
    }
  });

  addXp(growthConfig.discoveryXpReward);

  const sp = getSpeciesById(speciesId);
  queueMicrotask(() => {
    showToast(`Discovered: ${sp?.name ?? speciesId}!`, "achievement");
  });

  return true;
}
