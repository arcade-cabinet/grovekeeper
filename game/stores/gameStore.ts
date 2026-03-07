/**
 * gameStore -- Legend State observable with expo-sqlite/kv-store persistence.
 *
 * Faithful port of the BabylonJS archive's Zustand store, upgraded to use
 * Legend State v3 for signal-based reactivity and automatic SQLite persistence.
 *
 * Exports a Zustand-compatible `useGameStore` API so all consumer files
 * (hooks, actions, components) work without changes:
 *   - useGameStore((s) => s.level)       -- React hook selector
 *   - useGameStore.getState().addXp(100) -- imperative access
 *   - useGameStore.subscribe(listener)   -- change subscription
 */

import { observable, observe, batch } from "@legendapp/state";
import { useSelector } from "@legendapp/state/react";
import { chunkDiffs$ } from "@/game/world/chunkPersistence";

import { emptyResources, type ResourceType } from "@/game/config/resources";
import { getSpeciesById } from "@/game/config/species";
import { getToolById } from "@/game/config/tools";
import {
  advanceFestivalChallenge,
  type EventContext,
  getFestivalDef,
  initializeEventState,
  resolveEncounter as resolveEncounterPure,
  updateEvents,
} from "@/game/events/eventScheduler";
import type { EventState } from "@/game/events/types";
import {
  advanceObjectives,
  claimStepReward,
  computeAvailableChains,
  initializeChainState,
  startChain,
} from "@/game/quests/questChainEngine";
import type { QuestChainState } from "@/game/quests/types";
import { canAffordExpansion, getNextExpansionTier } from "@/game/systems/gridExpansion";
import { checkNewUnlocks } from "@/game/systems/levelUnlocks";
import {
  initializeMarketEventState,
  type MarketEventState,
  updateMarketEvents,
} from "@/game/systems/marketEvents";
import {
  calculatePrestigeBonus,
  canPrestige,
  getPrestigeResetState,
  getUnlockedPrestigeSpecies,
} from "@/game/systems/prestige";
import type { ActiveQuest } from "@/game/systems/quests";
import {
  computeDiscoveryTier,
  createEmptyProgress,
  type SpeciesProgress,
} from "@/game/systems/speciesDiscovery";
import {
  initializeMarketState,
  type MarketState,
  pruneHistory,
  recordTrade,
} from "@/game/systems/supplyDemand";
import type { Season } from "@/game/systems/time";
import { canAffordToolUpgrade, getToolUpgradeTier } from "@/game/systems/toolUpgrades";
import {
  discoverCampfire as discoverCampfirePure,
  type FastTravelPoint,
} from "@/game/systems/fastTravel";
import {
  initializeMerchantState,
  type MerchantState,
  purchaseOffer,
  updateMerchant,
} from "@/game/systems/travelingMerchant";
import {
  awardGiftXp as awardGiftXpPure,
  awardQuestCompletionXp as awardQuestCompletionXpPure,
  awardTradingXp as awardTradingXpPure,
  setRelationship as setRelationshipPure,
} from "@/game/systems/npcRelationship";
import { showToast } from "@/game/ui/Toast";

// ---------------------------------------------------------------------------
// Types (unchanged from BabylonJS archive)
// ---------------------------------------------------------------------------

export type GameScreen = "menu" | "playing" | "paused" | "seedSelect" | "rules";

export interface SerializedTree {
  speciesId: string;
  gridX: number;
  gridZ: number;
  stage: 0 | 1 | 2 | 3 | 4;
  progress: number;
  watered: boolean;
  totalGrowthTime: number;
  plantedAt: number;
  meshSeed: number;
}

export interface GroveData {
  trees: SerializedTree[];
  playerPosition: { x: number; z: number };
}

// ---------------------------------------------------------------------------
// XP formulas (unchanged from BabylonJS archive)
// ---------------------------------------------------------------------------

export function xpToNext(level: number): number {
  if (level < 1) return 100;
  return 100 + Math.max(0, (level - 2) * 50) + Math.floor((level - 1) / 5) * 200;
}

export function totalXpForLevel(targetLevel: number): number {
  let total = 0;
  for (let lv = 1; lv < targetLevel; lv++) {
    total += xpToNext(lv);
  }
  return total;
}

export function levelFromXp(totalXp: number): number {
  let level = 1;
  let remaining = totalXp;
  while (remaining >= xpToNext(level)) {
    remaining -= xpToNext(level);
    level++;
  }
  return level;
}

// ---------------------------------------------------------------------------
// Initial game time: Spring, Day 1, 8:00 AM
// ---------------------------------------------------------------------------

const INITIAL_GAME_TIME = (() => {
  const hours = 8;
  const day = 1;
  const month = 3; // March (Spring)
  const year = 1;
  const microsecondsPerSecond = 1_000_000;
  const secondsPerMinute = 60;
  const minutesPerHour = 60;
  const hoursPerDay = 24;
  const daysPerMonth = 30;
  const monthsPerYear = 12;

  const totalDays =
    (year - 1) * monthsPerYear * daysPerMonth + (month - 1) * daysPerMonth + (day - 1);
  const totalHours = totalDays * hoursPerDay + hours;
  const totalMinutes = totalHours * minutesPerHour;
  const totalSeconds = totalMinutes * secondsPerMinute;
  return totalSeconds * microsecondsPerSecond;
})();

// ---------------------------------------------------------------------------
// Initial state (identical to BabylonJS archive)
// ---------------------------------------------------------------------------

const initialState = {
  screen: "menu" as GameScreen,
  difficulty: "normal",
  permadeath: false,
  selectedTool: "trowel",
  selectedSpecies: "white-oak",
  coins: 100,
  xp: 0,
  level: 1,
  unlockedTools: ["trowel", "watering-can"],
  unlockedSpecies: ["white-oak"],
  treesPlanted: 0,
  treesMatured: 0,
  treesHarvested: 0,
  treesWatered: 0,

  resources: emptyResources(),
  seeds: { "white-oak": 10 } as Record<string, number>,

  lifetimeResources: emptyResources(),

  achievements: [] as string[],

  seasonsExperienced: [] as string[],
  speciesPlanted: [] as string[],

  stamina: 100,
  maxStamina: 100,

  gridSize: 12,

  buildMode: false,
  buildTemplateId: null as string | null,
  placedStructures: [] as {
    templateId: string;
    worldX: number;
    worldZ: number;
  }[],

  prestigeCount: 0,
  activeBorderCosmetic: null as string | null,

  groveData: null as GroveData | null,

  gameTimeMicroseconds: INITIAL_GAME_TIME,
  currentSeason: "spring" as Season,
  currentDay: 1,

  activeQuests: [] as ActiveQuest[],
  completedQuestIds: [] as string[],
  completedGoalIds: [] as string[],
  lastQuestRefresh: 0,

  discoveredZones: ["starting-grove"] as string[],

  currentZoneId: "starting-grove",
  worldSeed: "",

  toolUpgrades: {} as Record<string, number>,

  toolUseCounts: {} as Record<string, number>,
  /** Remaining durability per tool ID. Absence = full durability (lazy init). Spec §11.3 */
  toolDurabilities: {} as Record<string, number>,
  wildTreesHarvested: 0,
  wildTreesRegrown: 0,
  visitedZoneTypes: [] as string[],
  treesPlantedInSpring: 0,
  treesHarvestedInAutumn: 0,
  wildSpeciesHarvested: [] as string[],

  questChainState: initializeChainState(),

  marketState: initializeMarketState(),
  merchantState: initializeMerchantState(),
  marketEventState: initializeMarketEventState(),

  eventState: initializeEventState(),

  speciesProgress: {} as Record<string, SpeciesProgress>,
  pendingCodexUnlocks: [] as string[],

  hasSeenRules: false,
  hapticsEnabled: true,
  soundEnabled: true,

  /** Discovered campfire fast travel points. Spec §17.6 */
  discoveredCampfires: [] as FastTravelPoint[],

  /** Trust/friendship levels per NPC. Spec §15. Persists across sessions. */
  npcRelationships: {} as Record<string, number>,
};

type GameStateData = typeof initialState;

// ---------------------------------------------------------------------------
// Observable state
// ---------------------------------------------------------------------------

export const gameState$ = observable(structuredClone(initialState));

// ---------------------------------------------------------------------------
// Automatic persistence via expo-sqlite/kv-store
// ---------------------------------------------------------------------------

// Fields that should NOT be persisted (ephemeral runtime state)
const EPHEMERAL_KEYS = new Set(["screen", "groveData", "buildMode", "buildTemplateId"]);

let persistenceInitialized = false;

/**
 * Initialize automatic persistence. Called once from the app entry point.
 * Separated from module init to avoid crashing in test environments
 * where expo-sqlite native modules aren't available.
 */
export async function initPersistence(): Promise<void> {
  if (persistenceInitialized) return;
  persistenceInitialized = true;

  const { syncObservable } = await import("@legendapp/state/sync");
  const { observablePersistSqlite } = await import(
    "@legendapp/state/persist-plugins/expo-sqlite"
  );
  const { Storage } = await import("expo-sqlite/kv-store");

  syncObservable(gameState$, {
    persist: {
      name: "gameStore",
      plugin: observablePersistSqlite(Storage),
      transform: {
        save: (value: GameStateData) => {
          const cleaned = { ...value };
          for (const key of EPHEMERAL_KEYS) {
            delete (cleaned as Record<string, unknown>)[key];
          }
          return cleaned as GameStateData;
        },
      },
    },
  });

  syncObservable(chunkDiffs$, {
    persist: {
      name: "chunkDiffs",
      plugin: observablePersistSqlite(Storage),
    },
  });
}

// ---------------------------------------------------------------------------
// Helper: read state without tracking (for actions + game loop)
// ---------------------------------------------------------------------------

function getState(): GameStateData {
  return gameState$.peek();
}

// ---------------------------------------------------------------------------
// Actions (faithful port of BabylonJS archive Zustand actions)
// ---------------------------------------------------------------------------

const actions = {
  saveGrove(trees: SerializedTree[], playerPos: { x: number; z: number }) {
    gameState$.groveData.set({ trees, playerPosition: playerPos });
  },

  setScreen(screen: GameScreen) {
    gameState$.screen.set(screen);
  },

  setDifficulty(difficultyId: string) {
    gameState$.difficulty.set(difficultyId);
  },

  setSelectedTool(selectedTool: string) {
    gameState$.selectedTool.set(selectedTool);
  },

  setSelectedSpecies(selectedSpecies: string) {
    gameState$.selectedSpecies.set(selectedSpecies);
  },

  addCoins(amount: number) {
    gameState$.coins.set((prev) => prev + amount);
  },

  addXp(amount: number) {
    const state = getState();
    const newXp = state.xp + amount;
    const newLevel = levelFromXp(newXp);

    if (newLevel > state.level) {
      const unlocks = checkNewUnlocks(state.level, newLevel);
      const newUnlockedTools = [...state.unlockedTools];
      const newUnlockedSpecies = [...state.unlockedSpecies];

      for (const toolId of unlocks.tools) {
        if (!newUnlockedTools.includes(toolId)) {
          newUnlockedTools.push(toolId);
        }
      }
      for (const speciesId of unlocks.species) {
        if (!newUnlockedSpecies.includes(speciesId)) {
          newUnlockedSpecies.push(speciesId);
        }
      }

      batch(() => {
        gameState$.xp.set(newXp);
        gameState$.level.set(newLevel);
        gameState$.unlockedTools.set(newUnlockedTools);
        gameState$.unlockedSpecies.set(newUnlockedSpecies);
      });

      queueMicrotask(() => {
        showToast(`Level ${newLevel}!`, "success");
        for (const speciesId of unlocks.species) {
          const sp = getSpeciesById(speciesId);
          showToast(`Unlocked: ${sp?.name ?? speciesId}`, "achievement");
        }
        for (const toolId of unlocks.tools) {
          const tool = getToolById(toolId);
          showToast(`Unlocked: ${tool?.name ?? toolId}`, "achievement");
        }
      });
    } else {
      batch(() => {
        gameState$.xp.set(newXp);
        gameState$.level.set(newLevel);
      });
    }
  },

  unlockTool(toolId: string) {
    const current = getState().unlockedTools;
    if (!current.includes(toolId)) {
      gameState$.unlockedTools.set([...current, toolId]);
    }
  },

  unlockSpecies(speciesId: string) {
    const current = getState().unlockedSpecies;
    if (!current.includes(speciesId)) {
      gameState$.unlockedSpecies.set([...current, speciesId]);
    }
  },

  incrementTreesPlanted() {
    gameState$.treesPlanted.set((prev) => prev + 1);
  },

  incrementTreesMatured() {
    gameState$.treesMatured.set((prev) => prev + 1);
  },

  incrementTreesHarvested() {
    gameState$.treesHarvested.set((prev) => prev + 1);
  },

  incrementTreesWatered() {
    gameState$.treesWatered.set((prev) => prev + 1);
  },

  addResource(type: ResourceType, amount: number) {
    const state = getState();
    gameState$.resources.set({
      ...state.resources,
      [type]: state.resources[type] + amount,
    });
    gameState$.lifetimeResources.set({
      ...state.lifetimeResources,
      [type]: state.lifetimeResources[type] + amount,
    });
    queueMicrotask(() => {
      actions.advanceQuestObjective(`${type}_collected`, amount);
    });
  },

  spendResource(type: ResourceType, amount: number): boolean {
    const current = getState().resources[type];
    if (current < amount) return false;
    const state = getState();
    gameState$.resources.set({
      ...state.resources,
      [type]: state.resources[type] - amount,
    });
    return true;
  },

  addSeed(speciesId: string, amount: number) {
    const state = getState();
    gameState$.seeds.set({
      ...state.seeds,
      [speciesId]: (state.seeds[speciesId] ?? 0) + amount,
    });
  },

  spendSeed(speciesId: string, amount: number): boolean {
    const current = getState().seeds[speciesId] ?? 0;
    if (current < amount) return false;
    const state = getState();
    gameState$.seeds.set({
      ...state.seeds,
      [speciesId]: (state.seeds[speciesId] ?? 0) - amount,
    });
    return true;
  },

  setStamina(value: number) {
    gameState$.stamina.set(value);
  },

  spendStamina(amount: number): boolean {
    const current = getState().stamina;
    if (current < amount) return false;
    gameState$.stamina.set(current - amount);
    return true;
  },

  /**
   * Drain durability from a tool. Returns false if tool is already broken (≤ 0).
   * Absence of an entry means full durability — first drain lazy-inits from maxDurability.
   * Spec §11.3
   */
  drainToolDurability(toolId: string, maxDurability: number, amount = 1): boolean {
    const state = getState();
    const current = state.toolDurabilities[toolId] ?? maxDurability;
    if (current <= 0) return false;
    gameState$.toolDurabilities.set({
      ...state.toolDurabilities,
      [toolId]: Math.max(0, current - amount),
    });
    return true;
  },

  setToolDurability(toolId: string, value: number) {
    const state = getState();
    gameState$.toolDurabilities.set({ ...state.toolDurabilities, [toolId]: value });
  },

  unlockAchievement(id: string) {
    const current = getState().achievements;
    if (!current.includes(id)) {
      gameState$.achievements.set([...current, id]);
    }
  },

  trackSpeciesPlanted(speciesId: string) {
    const current = getState().speciesPlanted;
    if (!current.includes(speciesId)) {
      gameState$.speciesPlanted.set([...current, speciesId]);
    }
  },

  trackSeason(season: string) {
    const current = getState().seasonsExperienced;
    if (!current.includes(season)) {
      gameState$.seasonsExperienced.set([...current, season]);
    }
  },

  expandGrid(): boolean {
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
  },

  performPrestige(): boolean {
    const state = getState();
    if (!canPrestige(state.level)) return false;
    const newCount = state.prestigeCount + 1;
    const resetState = getPrestigeResetState();
    const bonus = calculatePrestigeBonus(newCount);
    const prestigeSpecies = getUnlockedPrestigeSpecies(newCount);
    const newUnlockedSpecies = ["white-oak", ...prestigeSpecies.map((s) => s.id)];

    gameState$.set({
      ...getState(),
      ...(resetState as Partial<GameStateData>),
      screen: state.screen, // preserve screen (ephemeral)
      prestigeCount: newCount,
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
      questChainState: state.questChainState,
      placedStructures: [],
      buildMode: false,
      buildTemplateId: null,
      marketState: initializeMarketState(),
      merchantState: initializeMerchantState(),
      marketEventState: initializeMarketEventState(),
      eventState: initializeEventState(),
      hasSeenRules: state.hasSeenRules,
      hapticsEnabled: state.hapticsEnabled,
      soundEnabled: state.soundEnabled,
      groveData: null,
    });

    queueMicrotask(() => {
      showToast(`Prestige ${newCount}! Bonuses applied.`, "achievement");
      for (const sp of prestigeSpecies) {
        if (sp.requiredPrestiges === newCount) {
          showToast(`Unlocked: ${sp.name}`, "achievement");
        }
      }
    });
    return true;
  },

  setActiveBorderCosmetic(id: string | null) {
    gameState$.activeBorderCosmetic.set(id);
  },

  setBuildMode(enabled: boolean, templateId?: string) {
    batch(() => {
      gameState$.buildMode.set(enabled);
      gameState$.buildTemplateId.set(enabled ? (templateId ?? null) : null);
    });
  },

  addPlacedStructure(templateId: string, worldX: number, worldZ: number) {
    const current = getState().placedStructures;
    gameState$.placedStructures.set([...current, { templateId, worldX, worldZ }]);
  },

  removePlacedStructure(worldX: number, worldZ: number) {
    const current = getState().placedStructures;
    gameState$.placedStructures.set(
      current.filter((s) => s.worldX !== worldX || s.worldZ !== worldZ),
    );
  },

  resetGame(worldSeed?: string) {
    const newState = structuredClone(initialState);
    if (worldSeed) {
      newState.worldSeed = worldSeed;
    }
    gameState$.set(newState);
  },

  // Time actions
  setGameTime(microseconds: number) {
    gameState$.gameTimeMicroseconds.set(microseconds);
  },

  setCurrentSeason(season: Season) {
    gameState$.currentSeason.set(season);
  },

  setCurrentDay(day: number) {
    gameState$.currentDay.set(day);
  },

  // Quest actions
  setActiveQuests(quests: ActiveQuest[]) {
    gameState$.activeQuests.set(quests);
  },

  updateQuest(questId: string, quest: ActiveQuest) {
    const current = getState().activeQuests;
    gameState$.activeQuests.set(current.map((q) => (q.id === questId ? quest : q)));
  },

  completeQuest(questId: string) {
    const state = getState();
    batch(() => {
      gameState$.activeQuests.set(state.activeQuests.filter((q) => q.id !== questId));
      gameState$.completedQuestIds.set([...state.completedQuestIds, questId]);
    });
  },

  setLastQuestRefresh(time: number) {
    gameState$.lastQuestRefresh.set(time);
  },

  // Quest chain actions
  refreshAvailableChains() {
    const state = getState();
    const available = computeAvailableChains(state.questChainState, state.level);
    gameState$.questChainState.set({
      ...state.questChainState,
      availableChainIds: available,
    });
  },

  startQuestChain(chainId: string) {
    const state = getState();
    const newChainState = startChain(state.questChainState, chainId, state.currentDay);
    gameState$.questChainState.set(newChainState);
  },

  advanceQuestObjective(
    eventType: string,
    amount: number,
  ): { chainId: string; stepId: string }[] {
    const state = getState();
    const result = advanceObjectives(state.questChainState, eventType, amount);
    if (result.state !== state.questChainState) {
      gameState$.questChainState.set(result.state);
    }
    return result.completedSteps;
  },

  claimQuestStepReward(chainId: string) {
    const state = getState();
    const result = claimStepReward(state.questChainState, chainId);
    if (!result.stepDef) return;

    gameState$.questChainState.set(result.state);

    const reward = result.stepDef.reward;

    if (reward.xp) {
      actions.addXp(reward.xp);
    }
    if (reward.resources) {
      for (const [resource, amount] of Object.entries(reward.resources)) {
        if (amount) actions.addResource(resource as ResourceType, amount);
      }
    }
    if (reward.seeds) {
      for (const seed of reward.seeds) {
        actions.addSeed(seed.speciesId, seed.amount);
      }
    }
    if (reward.unlockSpecies) {
      actions.unlockSpecies(reward.unlockSpecies);
    }

    queueMicrotask(() => {
      showToast(`Quest step complete: ${result.stepDef?.name}`, "success");
    });
  },

  // Discovery actions
  discoverZone(zoneId: string): boolean {
    const state = getState();
    if (state.discoveredZones.includes(zoneId)) return false;
    gameState$.discoveredZones.set([...state.discoveredZones, zoneId]);
    queueMicrotask(() => {
      showToast(`Discovered new area!`, "success");
    });
    actions.addXp(50);
    return true;
  },

  // World/zone actions
  setCurrentZoneId(zoneId: string) {
    gameState$.currentZoneId.set(zoneId);
  },

  setWorldSeed(seed: string) {
    gameState$.worldSeed.set(seed);
  },

  // Achievement expansion tracking actions
  incrementToolUse(toolId: string) {
    const state = getState();
    gameState$.toolUseCounts.set({
      ...state.toolUseCounts,
      [toolId]: (state.toolUseCounts[toolId] ?? 0) + 1,
    });
  },

  incrementWildTreesHarvested(speciesId?: string) {
    const state = getState();
    gameState$.wildTreesHarvested.set(state.wildTreesHarvested + 1);
    if (speciesId && !state.wildSpeciesHarvested.includes(speciesId)) {
      gameState$.wildSpeciesHarvested.set([...state.wildSpeciesHarvested, speciesId]);
    }
  },

  incrementWildTreesRegrown() {
    gameState$.wildTreesRegrown.set((prev) => prev + 1);
  },

  trackVisitedZoneType(zoneType: string) {
    const current = getState().visitedZoneTypes;
    if (!current.includes(zoneType)) {
      gameState$.visitedZoneTypes.set([...current, zoneType]);
    }
  },

  incrementSeasonalPlanting(season: string) {
    if (season === "spring") {
      gameState$.treesPlantedInSpring.set((prev) => prev + 1);
    }
  },

  incrementSeasonalHarvest(season: string) {
    if (season === "autumn") {
      gameState$.treesHarvestedInAutumn.set((prev) => prev + 1);
    }
  },

  // Tool upgrade actions
  upgradeToolTier(toolId: string): boolean {
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
      gameState$.toolUpgrades.set({
        ...state.toolUpgrades,
        [toolId]: currentTier + 1,
      });
    });
    queueMicrotask(() => {
      showToast(`Tool upgraded to tier ${currentTier + 1}!`, "success");
    });
    return true;
  },

  // Economy actions
  recordMarketTrade(resource: ResourceType, direction: "buy" | "sell", amount: number) {
    const state = getState();
    const newMarketState = recordTrade(
      state.marketState,
      resource,
      direction,
      amount,
      state.currentDay,
    );
    gameState$.marketState.set(newMarketState);
  },

  updateEconomy(currentDay: number) {
    const state = getState();
    const rngSeed = state.worldSeed || "default";

    const prunedMarket = pruneHistory(state.marketState, currentDay);
    const newMerchantState = updateMerchant(state.merchantState, currentDay, rngSeed);
    const eventResult = updateMarketEvents(state.marketEventState, currentDay, rngSeed);

    batch(() => {
      if (prunedMarket !== state.marketState) {
        gameState$.marketState.set(prunedMarket);
      }
      if (newMerchantState !== state.merchantState) {
        gameState$.merchantState.set(newMerchantState);
        if (newMerchantState.isPresent && !state.merchantState.isPresent) {
          queueMicrotask(() => {
            showToast("A traveling merchant has arrived!", "success");
          });
        }
      }
      if (eventResult.state !== state.marketEventState) {
        gameState$.marketEventState.set(eventResult.state);
        if (eventResult.newEventTriggered && eventResult.state.activeEvent) {
          queueMicrotask(() => {
            showToast("Market event started!", "success");
          });
        }
      }
    });
  },

  purchaseMerchantOffer(offerId: string): boolean {
    const state = getState();
    if (!state.merchantState.isPresent) return false;

    const offer = state.merchantState.currentOffers.find((o) => o.id === offerId);
    if (!offer || offer.quantity <= 0) return false;

    for (const [resource, amount] of Object.entries(offer.cost)) {
      if ((state.resources[resource as ResourceType] ?? 0) < (amount as number)) {
        return false;
      }
    }

    const newResources = { ...state.resources };
    for (const [resource, amount] of Object.entries(offer.cost)) {
      newResources[resource as ResourceType] -= amount as number;
    }

    const result = purchaseOffer(state.merchantState, offerId);
    if (!result.offer) return false;

    batch(() => {
      gameState$.resources.set(newResources);
      gameState$.merchantState.set(result.state);
    });

    const reward = result.offer.reward;
    if (reward.type === "resource" && reward.resource && reward.amount) {
      const resourceType = reward.resource as ResourceType;
      if (resourceType in state.resources) {
        actions.addResource(resourceType, reward.amount);
      }
    } else if (reward.type === "seed" && reward.speciesId && reward.amount) {
      actions.addSeed(reward.speciesId, reward.amount);
    } else if (reward.type === "xp" && reward.amount) {
      actions.addXp(reward.amount);
    }

    queueMicrotask(() => {
      showToast(`Purchased: ${result.offer?.name}`, "success");
    });

    return true;
  },

  // Event scheduler actions
  tickEvents(context: EventContext) {
    const state = getState();
    const result = updateEvents(state.eventState, context);
    if (result.state !== state.eventState) {
      gameState$.eventState.set(result.state);
    }
    if (result.festivalStarted) {
      queueMicrotask(() => {
        const festDef = result.festivalStarted;
        if (festDef) {
          showToast(`${festDef.name} has begun!`, "achievement");
        }
      });
    }
    if (result.festivalEnded) {
      const def = getFestivalDef(result.festivalEnded);
      const completed = state.eventState.activeFestival?.completed;
      queueMicrotask(() => {
        if (completed && def) {
          showToast(`${def.name} complete!`, "success");
          const reward = def.completionReward;
          if (reward.xp) actions.addXp(reward.xp);
          if (reward.resources) {
            for (const [resource, amount] of Object.entries(reward.resources)) {
              if (amount) actions.addResource(resource as ResourceType, amount);
            }
          }
          if (reward.seeds) {
            for (const seed of reward.seeds) {
              actions.addSeed(seed.speciesId, seed.amount);
            }
          }
        } else if (def) {
          showToast(`${def.name} has ended.`, "info");
        }
      });
    }
    if (result.encounterTriggered) {
      queueMicrotask(() => {
        const encDef = result.encounterTriggered;
        if (encDef) {
          showToast(`${encDef.name}!`, "info");
        }
      });
    }
  },

  advanceEventChallenge(challengeType: string, amount = 1) {
    const state = getState();
    if (!state.eventState.activeFestival) return;
    const newEventState = advanceFestivalChallenge(state.eventState, challengeType, amount);
    if (newEventState !== state.eventState) {
      gameState$.eventState.set(newEventState);
    }
  },

  resolveEncounter(definitionId: string) {
    const state = getState();
    const newEventState = resolveEncounterPure(state.eventState, definitionId);
    if (newEventState !== state.eventState) {
      gameState$.eventState.set(newEventState);
    }
  },

  // Species codex actions
  trackSpeciesPlanting(speciesId: string) {
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
  },

  trackSpeciesGrowth(speciesId: string, newStage: number) {
    const state = getState();
    const existing = state.speciesProgress[speciesId] ?? createEmptyProgress();
    if (newStage <= existing.maxStageReached) return;

    const updated: SpeciesProgress = {
      ...existing,
      maxStageReached: newStage,
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
      const tierNames = ["", "Discovered", "Studied", "Mastered", "Legendary"];
      queueMicrotask(() => {
        showToast(
          `Codex: ${sp?.name ?? speciesId} -- ${tierNames[updated.discoveryTier]}!`,
          "achievement",
        );
      });
    }
  },

  trackSpeciesHarvest(speciesId: string, yieldAmount: number) {
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
  },

  consumePendingCodexUnlock(): string | null {
    const state = getState();
    if (state.pendingCodexUnlocks.length === 0) return null;
    const [first, ...rest] = state.pendingCodexUnlocks;
    gameState$.pendingCodexUnlocks.set(rest);
    return first;
  },

  // Fast travel actions (Spec §17.6)
  discoverCampfirePoint(point: FastTravelPoint): boolean {
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
  },

  removeCampfirePoint(id: string): boolean {
    const state = getState();
    const filtered = state.discoveredCampfires.filter((p) => p.id !== id);
    if (filtered.length === state.discoveredCampfires.length) return false;
    gameState$.discoveredCampfires.set(filtered);
    return true;
  },

  // Settings actions
  setHasSeenRules(seen: boolean) {
    gameState$.hasSeenRules.set(seen);
  },

  setHapticsEnabled(enabled: boolean) {
    gameState$.hapticsEnabled.set(enabled);
  },

  setSoundEnabled(enabled: boolean) {
    gameState$.soundEnabled.set(enabled);
  },

  // NPC Relationship actions (Spec §15)
  awardNpcTradingXp(npcId: string): void {
    const state = getState();
    gameState$.npcRelationships.set(awardTradingXpPure(state.npcRelationships, npcId));
  },

  awardNpcQuestCompletionXp(npcId: string): void {
    const state = getState();
    gameState$.npcRelationships.set(
      awardQuestCompletionXpPure(state.npcRelationships, npcId),
    );
  },

  awardNpcGiftXp(npcId: string, giftMultiplier: number = 1.0): void {
    const state = getState();
    gameState$.npcRelationships.set(
      awardGiftXpPure(state.npcRelationships, npcId, giftMultiplier),
    );
  },

  setNpcRelationship(npcId: string, value: number): void {
    const state = getState();
    gameState$.npcRelationships.set(
      setRelationshipPure(state.npcRelationships, npcId, value),
    );
  },

  // Database hydration -- bulk-set state from SQLite
  hydrateFromDb(dbState: Partial<GameStateData>) {
    gameState$.set({ ...getState(), ...dbState });
  },
};

// ---------------------------------------------------------------------------
// GameState type (state + actions, matches Zustand interface for consumers)
// ---------------------------------------------------------------------------

type GameState = GameStateData & typeof actions;

// ---------------------------------------------------------------------------
// Zustand-compatible API wrapper
// ---------------------------------------------------------------------------

/**
 * useGameStore -- drop-in replacement for Zustand's `useStore` hook.
 *
 * Consumers call: `useGameStore((s) => s.level)` or `useGameStore()` (full state)
 * Under the hood: Legend State's `useSelector` tracks which fields
 * the selector reads and only re-renders when those values change.
 */
function useGameStoreHook(): GameState;
function useGameStoreHook<T>(selector: (state: GameState) => T): T;
function useGameStoreHook<T>(selector?: (state: GameState) => T): T | GameState {
  return useSelector(() => {
    const snapshot = gameState$.get();
    const combined = { ...snapshot, ...actions } as GameState;
    return selector ? selector(combined) : combined;
  });
}

/**
 * getState() -- imperative access for non-React code (GameActions, hooks, tests).
 * Returns state + action methods.
 */
function getStateWithActions(): GameState {
  return { ...getState(), ...actions } as GameState;
}

/**
 * setState() -- partial state update (used by tests).
 * Merges partial state into the observable.
 */
function setState(partial: Partial<GameStateData>): void {
  gameState$.set({ ...getState(), ...partial });
}

/**
 * getInitialState() -- returns the initial state (used by tests for reset).
 */
function getInitialState(): GameStateData {
  return structuredClone(initialState);
}

/**
 * subscribe() -- change listener (used by useAutoSave).
 * Returns unsubscribe function.
 */
function subscribe(listener: () => void): () => void {
  return observe(gameState$, listener);
}

// Assemble the Zustand-compatible export
export const useGameStore = Object.assign(useGameStoreHook, {
  getState: getStateWithActions,
  setState,
  getInitialState,
  subscribe,
});
