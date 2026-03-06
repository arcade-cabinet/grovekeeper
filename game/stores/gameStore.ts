import { create } from "zustand";
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
import {
  canAffordExpansion,
  getNextExpansionTier,
} from "@/game/systems/gridExpansion";
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
import {
  canAffordToolUpgrade,
  getToolUpgradeTier,
} from "@/game/systems/toolUpgrades";
import {
  initializeMerchantState,
  type MerchantState,
  purchaseOffer,
  updateMerchant,
} from "@/game/systems/travelingMerchant";
import { showToast } from "@/game/ui/Toast";

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

interface GameState {
  screen: GameScreen;
  difficulty: string;
  permadeath: boolean;
  selectedTool: string;
  selectedSpecies: string;
  coins: number;
  xp: number;
  level: number;
  unlockedTools: string[];
  unlockedSpecies: string[];
  treesPlanted: number;
  treesMatured: number;
  treesHarvested: number;
  treesWatered: number;

  // Time state (persisted)
  gameTimeMicroseconds: number;
  currentSeason: Season;
  currentDay: number;

  // Quest state
  activeQuests: ActiveQuest[];
  completedQuestIds: string[];
  completedGoalIds: string[];
  lastQuestRefresh: number;

  // Resources
  resources: Record<ResourceType, number>;
  seeds: Record<string, number>;

  // Lifetime resource tracking (for achievements)
  lifetimeResources: Record<ResourceType, number>;

  // Achievements
  achievements: string[];

  // Seasons experienced (for seasonal-veteran achievement)
  seasonsExperienced: string[];

  // Species ever planted (for one-of-each achievement)
  speciesPlanted: string[];

  // Stamina (persisted for session recovery)
  stamina: number;
  maxStamina: number;

  // Grove serialization (ECS -> localStorage)
  groveData: GroveData | null;

  // Grid expansion
  gridSize: number;

  // Prestige
  prestigeCount: number;
  activeBorderCosmetic: string | null;

  // Discovery (fog-of-war)
  discoveredZones: string[];

  // World/zone state
  currentZoneId: string;
  worldSeed: string;

  // Build mode
  buildMode: boolean;
  buildTemplateId: string | null;
  placedStructures: { templateId: string; worldX: number; worldZ: number }[];

  // Tool upgrades
  toolUpgrades: Record<string, number>;

  // Achievement expansion tracking
  toolUseCounts: Record<string, number>;
  wildTreesHarvested: number;
  wildTreesRegrown: number;
  visitedZoneTypes: string[];
  treesPlantedInSpring: number;
  treesHarvestedInAutumn: number;
  wildSpeciesHarvested: string[];

  // Quest chain state
  questChainState: QuestChainState;

  // Economy state
  marketState: MarketState;
  merchantState: MerchantState;
  marketEventState: MarketEventState;

  // Event scheduler state
  eventState: EventState;

  // Species codex progress
  speciesProgress: Record<string, SpeciesProgress>;
  pendingCodexUnlocks: string[];

  // Settings
  hasSeenRules: boolean;
  hapticsEnabled: boolean;
  soundEnabled: boolean;

  // Actions
  saveGrove: (
    trees: SerializedTree[],
    playerPos: { x: number; z: number },
  ) => void;
  setScreen: (screen: GameScreen) => void;
  setSelectedTool: (tool: string) => void;
  setSelectedSpecies: (species: string) => void;
  addCoins: (amount: number) => void;
  addXp: (amount: number) => void;
  unlockTool: (toolId: string) => void;
  unlockSpecies: (speciesId: string) => void;
  incrementTreesPlanted: () => void;
  incrementTreesMatured: () => void;
  incrementTreesHarvested: () => void;
  incrementTreesWatered: () => void;
  addResource: (type: ResourceType, amount: number) => void;
  spendResource: (type: ResourceType, amount: number) => boolean;
  addSeed: (speciesId: string, amount: number) => void;
  spendSeed: (speciesId: string, amount: number) => boolean;
  setStamina: (value: number) => void;
  spendStamina: (amount: number) => boolean;
  unlockAchievement: (id: string) => void;
  trackSpeciesPlanted: (speciesId: string) => void;
  trackSeason: (season: string) => void;
  expandGrid: () => boolean;
  performPrestige: () => boolean;
  setActiveBorderCosmetic: (id: string | null) => void;
  setBuildMode: (enabled: boolean, templateId?: string) => void;
  addPlacedStructure: (
    templateId: string,
    worldX: number,
    worldZ: number,
  ) => void;
  removePlacedStructure: (worldX: number, worldZ: number) => void;
  resetGame: () => void;

  // Time actions
  setGameTime: (microseconds: number) => void;
  setCurrentSeason: (season: Season) => void;
  setCurrentDay: (day: number) => void;

  // Quest actions
  setActiveQuests: (quests: ActiveQuest[]) => void;
  updateQuest: (questId: string, quest: ActiveQuest) => void;
  completeQuest: (questId: string) => void;
  setLastQuestRefresh: (time: number) => void;

  // Quest chain actions
  refreshAvailableChains: () => void;
  startQuestChain: (chainId: string) => void;
  advanceQuestObjective: (
    eventType: string,
    amount: number,
  ) => { chainId: string; stepId: string }[];
  claimQuestStepReward: (chainId: string) => void;

  // Discovery actions
  discoverZone: (zoneId: string) => boolean;

  // World/zone actions
  setCurrentZoneId: (zoneId: string) => void;
  setWorldSeed: (seed: string) => void;

  // Achievement expansion tracking actions
  incrementToolUse: (toolId: string) => void;
  incrementWildTreesHarvested: (speciesId?: string) => void;
  incrementWildTreesRegrown: () => void;
  trackVisitedZoneType: (zoneType: string) => void;
  incrementSeasonalPlanting: (season: string) => void;
  incrementSeasonalHarvest: (season: string) => void;

  // Tool upgrade actions
  upgradeToolTier: (toolId: string) => boolean;

  // Economy actions
  recordMarketTrade: (
    resource: ResourceType,
    direction: "buy" | "sell",
    amount: number,
  ) => void;
  updateEconomy: (currentDay: number) => void;
  purchaseMerchantOffer: (offerId: string) => boolean;

  // Event scheduler actions
  tickEvents: (context: EventContext) => void;
  advanceEventChallenge: (challengeType: string, amount?: number) => void;
  resolveEncounter: (definitionId: string) => void;

  // Species codex actions
  trackSpeciesPlanting: (speciesId: string) => void;
  trackSpeciesGrowth: (speciesId: string, newStage: number) => void;
  trackSpeciesHarvest: (speciesId: string, yieldAmount: number) => void;
  consumePendingCodexUnlock: () => string | null;

  // Settings actions
  setHasSeenRules: (seen: boolean) => void;
  setHapticsEnabled: (enabled: boolean) => void;
  setSoundEnabled: (enabled: boolean) => void;

  // Database hydration
  hydrateFromDb: (state: Partial<GameState>) => void;
}

/**
 * Spec XP formula:
 * xpToNext(level) = 100 + (level - 2) * 50 + floor((level - 1) / 5) * 200
 * Level 1 needs 100 XP (edge case: (1-2)*50 = -50, clamped by the 100 base)
 */
export function xpToNext(level: number): number {
  if (level < 1) return 100;
  return (
    100 + Math.max(0, (level - 2) * 50) + Math.floor((level - 1) / 5) * 200
  );
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

// Initial game time: Spring, Day 1, 8:00 AM
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
    (year - 1) * monthsPerYear * daysPerMonth +
    (month - 1) * daysPerMonth +
    (day - 1);
  const totalHours = totalDays * hoursPerDay + hours;
  const totalMinutes = totalHours * minutesPerHour;
  const totalSeconds = totalMinutes * secondsPerMinute;
  return totalSeconds * microsecondsPerSecond;
})();

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
};

export const useGameStore = create<GameState>()((set, get) => ({
  ...initialState,

  saveGrove: (trees, playerPos) =>
    set({ groveData: { trees, playerPosition: playerPos } }),

  setScreen: (screen) => set({ screen }),
  setSelectedTool: (selectedTool) => set({ selectedTool }),
  setSelectedSpecies: (selectedSpecies) => set({ selectedSpecies }),

  addCoins: (amount) => set((state) => ({ coins: state.coins + amount })),

  addXp: (amount) =>
    set((state) => {
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

        return {
          xp: newXp,
          level: newLevel,
          unlockedTools: newUnlockedTools,
          unlockedSpecies: newUnlockedSpecies,
        };
      }

      return { xp: newXp, level: newLevel };
    }),

  unlockTool: (toolId) =>
    set((state) => ({
      unlockedTools: state.unlockedTools.includes(toolId)
        ? state.unlockedTools
        : [...state.unlockedTools, toolId],
    })),

  unlockSpecies: (speciesId) =>
    set((state) => ({
      unlockedSpecies: state.unlockedSpecies.includes(speciesId)
        ? state.unlockedSpecies
        : [...state.unlockedSpecies, speciesId],
    })),

  incrementTreesPlanted: () =>
    set((state) => ({ treesPlanted: state.treesPlanted + 1 })),

  incrementTreesMatured: () =>
    set((state) => ({ treesMatured: state.treesMatured + 1 })),

  incrementTreesHarvested: () =>
    set((state) => ({ treesHarvested: state.treesHarvested + 1 })),

  incrementTreesWatered: () =>
    set((state) => ({ treesWatered: state.treesWatered + 1 })),

  addResource: (type, amount) => {
    set((state) => ({
      resources: { ...state.resources, [type]: state.resources[type] + amount },
      lifetimeResources: {
        ...state.lifetimeResources,
        [type]: state.lifetimeResources[type] + amount,
      },
    }));
    queueMicrotask(() => {
      get().advanceQuestObjective(`${type}_collected`, amount);
    });
  },

  spendResource: (type, amount) => {
    const current = get().resources[type];
    if (current < amount) return false;
    set((state) => ({
      resources: { ...state.resources, [type]: state.resources[type] - amount },
    }));
    return true;
  },

  addSeed: (speciesId, amount) =>
    set((state) => ({
      seeds: {
        ...state.seeds,
        [speciesId]: (state.seeds[speciesId] ?? 0) + amount,
      },
    })),

  spendSeed: (speciesId, amount) => {
    const current = get().seeds[speciesId] ?? 0;
    if (current < amount) return false;
    set((state) => ({
      seeds: {
        ...state.seeds,
        [speciesId]: (state.seeds[speciesId] ?? 0) - amount,
      },
    }));
    return true;
  },

  setStamina: (value) => set({ stamina: value }),

  spendStamina: (amount) => {
    const current = get().stamina;
    if (current < amount) return false;
    set({ stamina: current - amount });
    return true;
  },

  unlockAchievement: (id) =>
    set((state) =>
      state.achievements.includes(id)
        ? state
        : { achievements: [...state.achievements, id] },
    ),

  trackSpeciesPlanted: (speciesId) =>
    set((state) =>
      state.speciesPlanted.includes(speciesId)
        ? state
        : { speciesPlanted: [...state.speciesPlanted, speciesId] },
    ),

  trackSeason: (season) =>
    set((state) =>
      state.seasonsExperienced.includes(season)
        ? state
        : { seasonsExperienced: [...state.seasonsExperienced, season] },
    ),

  expandGrid: () => {
    const state = get();
    const nextTier = getNextExpansionTier(state.gridSize);
    if (!nextTier) return false;
    if (!canAffordExpansion(nextTier, state.resources, state.level))
      return false;
    const newResources = { ...state.resources };
    for (const [resource, amount] of Object.entries(nextTier.cost)) {
      newResources[resource as keyof typeof newResources] =
        (newResources[resource as keyof typeof newResources] ?? 0) - amount;
    }
    set({ gridSize: nextTier.size, resources: newResources });
    queueMicrotask(() => {
      showToast(
        `Grove expanded to ${nextTier.size}x${nextTier.size}!`,
        "success",
      );
    });
    return true;
  },

  performPrestige: () => {
    const state = get();
    if (!canPrestige(state.level)) return false;
    const newCount = state.prestigeCount + 1;
    const resetState = getPrestigeResetState();
    const bonus = calculatePrestigeBonus(newCount);
    const prestigeSpecies = getUnlockedPrestigeSpecies(newCount);
    const newUnlockedSpecies = [
      "white-oak",
      ...prestigeSpecies.map((s) => s.id),
    ];
    set({
      ...resetState,
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

  setActiveBorderCosmetic: (id) => set({ activeBorderCosmetic: id }),

  setBuildMode: (enabled, templateId) =>
    set({
      buildMode: enabled,
      buildTemplateId: enabled ? (templateId ?? null) : null,
    }),

  addPlacedStructure: (templateId, worldX, worldZ) =>
    set((state) => ({
      placedStructures: [
        ...state.placedStructures,
        { templateId, worldX, worldZ },
      ],
    })),

  removePlacedStructure: (worldX, worldZ) =>
    set((state) => ({
      placedStructures: state.placedStructures.filter(
        (s) => s.worldX !== worldX || s.worldZ !== worldZ,
      ),
    })),

  resetGame: () => set(initialState),

  // Time actions
  setGameTime: (microseconds) => set({ gameTimeMicroseconds: microseconds }),
  setCurrentSeason: (season) => set({ currentSeason: season }),
  setCurrentDay: (day) => set({ currentDay: day }),

  // Quest actions
  setActiveQuests: (quests) => set({ activeQuests: quests }),
  updateQuest: (questId, quest) =>
    set((state) => ({
      activeQuests: state.activeQuests.map((q) =>
        q.id === questId ? quest : q,
      ),
    })),
  completeQuest: (questId) =>
    set((state) => ({
      activeQuests: state.activeQuests.filter((q) => q.id !== questId),
      completedQuestIds: [...state.completedQuestIds, questId],
    })),
  setLastQuestRefresh: (time) => set({ lastQuestRefresh: time }),

  // Quest chain actions
  refreshAvailableChains: () => {
    const state = get();
    const available = computeAvailableChains(
      state.questChainState,
      state.level,
    );
    set({
      questChainState: {
        ...state.questChainState,
        availableChainIds: available,
      },
    });
  },

  startQuestChain: (chainId) => {
    const state = get();
    const newChainState = startChain(
      state.questChainState,
      chainId,
      state.currentDay,
    );
    set({ questChainState: newChainState });
  },

  advanceQuestObjective: (eventType, amount) => {
    const state = get();
    const result = advanceObjectives(state.questChainState, eventType, amount);
    if (result.state !== state.questChainState) {
      set({ questChainState: result.state });
    }
    return result.completedSteps;
  },

  claimQuestStepReward: (chainId) => {
    const state = get();
    const result = claimStepReward(state.questChainState, chainId);
    if (!result.stepDef) return;

    set({ questChainState: result.state });

    const reward = result.stepDef.reward;
    const store = get();

    if (reward.xp) {
      store.addXp(reward.xp);
    }
    if (reward.resources) {
      for (const [resource, amount] of Object.entries(reward.resources)) {
        if (amount) store.addResource(resource as ResourceType, amount);
      }
    }
    if (reward.seeds) {
      for (const seed of reward.seeds) {
        store.addSeed(seed.speciesId, seed.amount);
      }
    }
    if (reward.unlockSpecies) {
      store.unlockSpecies(reward.unlockSpecies);
    }

    queueMicrotask(() => {
      showToast(`Quest step complete: ${result.stepDef?.name}`, "success");
    });
  },

  // Discovery actions
  discoverZone: (zoneId) => {
    const state = get();
    if (state.discoveredZones.includes(zoneId)) return false;
    set({ discoveredZones: [...state.discoveredZones, zoneId] });
    queueMicrotask(() => {
      showToast(`Discovered new area!`, "success");
    });
    get().addXp(50);
    return true;
  },

  // World/zone actions
  setCurrentZoneId: (zoneId) => set({ currentZoneId: zoneId }),
  setWorldSeed: (seed) => set({ worldSeed: seed }),

  // Achievement expansion tracking actions
  incrementToolUse: (toolId) =>
    set((state) => ({
      toolUseCounts: {
        ...state.toolUseCounts,
        [toolId]: (state.toolUseCounts[toolId] ?? 0) + 1,
      },
    })),

  incrementWildTreesHarvested: (speciesId) =>
    set((state) => ({
      wildTreesHarvested: state.wildTreesHarvested + 1,
      wildSpeciesHarvested:
        speciesId && !state.wildSpeciesHarvested.includes(speciesId)
          ? [...state.wildSpeciesHarvested, speciesId]
          : state.wildSpeciesHarvested,
    })),

  incrementWildTreesRegrown: () =>
    set((state) => ({ wildTreesRegrown: state.wildTreesRegrown + 1 })),

  trackVisitedZoneType: (zoneType) =>
    set((state) =>
      state.visitedZoneTypes.includes(zoneType)
        ? state
        : { visitedZoneTypes: [...state.visitedZoneTypes, zoneType] },
    ),

  incrementSeasonalPlanting: (season) =>
    set((state) => ({
      treesPlantedInSpring:
        season === "spring"
          ? state.treesPlantedInSpring + 1
          : state.treesPlantedInSpring,
    })),

  incrementSeasonalHarvest: (season) =>
    set((state) => ({
      treesHarvestedInAutumn:
        season === "autumn"
          ? state.treesHarvestedInAutumn + 1
          : state.treesHarvestedInAutumn,
    })),

  // Tool upgrade actions
  upgradeToolTier: (toolId) => {
    const state = get();
    const currentTier = state.toolUpgrades[toolId] ?? 0;
    const nextTier = getToolUpgradeTier(currentTier);
    if (!nextTier) return false;
    if (!canAffordToolUpgrade(nextTier, state.resources)) return false;
    const newResources = { ...state.resources };
    for (const [resource, amount] of Object.entries(nextTier.cost)) {
      newResources[resource as keyof typeof newResources] =
        (newResources[resource as keyof typeof newResources] ?? 0) - amount;
    }
    set({
      resources: newResources,
      toolUpgrades: {
        ...state.toolUpgrades,
        [toolId]: currentTier + 1,
      },
    });
    queueMicrotask(() => {
      showToast(`Tool upgraded to tier ${currentTier + 1}!`, "success");
    });
    return true;
  },

  // Economy actions
  recordMarketTrade: (resource, direction, amount) => {
    const state = get();
    const newMarketState = recordTrade(
      state.marketState,
      resource,
      direction,
      amount,
      state.currentDay,
    );
    set({ marketState: newMarketState });
  },

  updateEconomy: (currentDay) => {
    const state = get();
    const rngSeed = state.worldSeed || "default";

    const prunedMarket = pruneHistory(state.marketState, currentDay);

    const newMerchantState = updateMerchant(
      state.merchantState,
      currentDay,
      rngSeed,
    );

    const eventResult = updateMarketEvents(
      state.marketEventState,
      currentDay,
      rngSeed,
    );

    const updates: Partial<GameState> = {};

    if (prunedMarket !== state.marketState) {
      updates.marketState = prunedMarket;
    }
    if (newMerchantState !== state.merchantState) {
      updates.merchantState = newMerchantState;
      if (newMerchantState.isPresent && !state.merchantState.isPresent) {
        queueMicrotask(() => {
          showToast("A traveling merchant has arrived!", "success");
        });
      }
    }
    if (eventResult.state !== state.marketEventState) {
      updates.marketEventState = eventResult.state;
      if (eventResult.newEventTriggered && eventResult.state.activeEvent) {
        queueMicrotask(() => {
          showToast("Market event started!", "success");
        });
      }
    }

    if (Object.keys(updates).length > 0) {
      set(updates);
    }
  },

  purchaseMerchantOffer: (offerId) => {
    const state = get();
    if (!state.merchantState.isPresent) return false;

    const offer = state.merchantState.currentOffers.find(
      (o) => o.id === offerId,
    );
    if (!offer || offer.quantity <= 0) return false;

    for (const [resource, amount] of Object.entries(offer.cost)) {
      if (
        (state.resources[resource as ResourceType] ?? 0) < (amount as number)
      ) {
        return false;
      }
    }

    const newResources = { ...state.resources };
    for (const [resource, amount] of Object.entries(offer.cost)) {
      newResources[resource as ResourceType] -= amount as number;
    }

    const result = purchaseOffer(state.merchantState, offerId);
    if (!result.offer) return false;

    set({ resources: newResources, merchantState: result.state });

    const reward = result.offer.reward;
    const store = get();
    if (reward.type === "resource" && reward.resource && reward.amount) {
      store.addResource(reward.resource as ResourceType, reward.amount);
    } else if (reward.type === "seed" && reward.speciesId && reward.amount) {
      store.addSeed(reward.speciesId, reward.amount);
    } else if (reward.type === "xp" && reward.amount) {
      store.addXp(reward.amount);
    }

    queueMicrotask(() => {
      showToast(`Purchased: ${result.offer?.name}`, "success");
    });

    return true;
  },

  // Event scheduler actions
  tickEvents: (context) => {
    const state = get();
    const result = updateEvents(state.eventState, context);
    if (result.state !== state.eventState) {
      set({ eventState: result.state });
    }
    if (result.festivalStarted) {
      queueMicrotask(() => {
        showToast(`${result.festivalStarted?.name} has begun!`, "achievement");
      });
    }
    if (result.festivalEnded) {
      const def = getFestivalDef(result.festivalEnded);
      const completed = state.eventState.activeFestival?.completed;
      queueMicrotask(() => {
        if (completed && def) {
          showToast(`${def.name} complete!`, "success");
          const store = get();
          const reward = def.completionReward;
          if (reward.xp) store.addXp(reward.xp);
          if (reward.resources) {
            for (const [resource, amount] of Object.entries(reward.resources)) {
              if (amount) store.addResource(resource as ResourceType, amount);
            }
          }
          if (reward.seeds) {
            for (const seed of reward.seeds) {
              store.addSeed(seed.speciesId, seed.amount);
            }
          }
        } else if (def) {
          showToast(`${def.name} has ended.`, "info");
        }
      });
    }
    if (result.encounterTriggered) {
      queueMicrotask(() => {
        showToast(`${result.encounterTriggered?.name}!`, "info");
      });
    }
  },

  advanceEventChallenge: (challengeType, amount = 1) => {
    const state = get();
    if (!state.eventState.activeFestival) return;
    const newEventState = advanceFestivalChallenge(
      state.eventState,
      challengeType,
      amount,
    );
    if (newEventState !== state.eventState) {
      set({ eventState: newEventState });
    }
  },

  resolveEncounter: (definitionId) => {
    const state = get();
    const newEventState = resolveEncounterPure(state.eventState, definitionId);
    if (newEventState !== state.eventState) {
      set({ eventState: newEventState });
    }
  },

  // Species codex actions
  trackSpeciesPlanting: (speciesId) =>
    set((state) => {
      const existing =
        state.speciesProgress[speciesId] ?? createEmptyProgress();
      const updated: SpeciesProgress = {
        ...existing,
        timesPlanted: existing.timesPlanted + 1,
      };
      updated.discoveryTier = computeDiscoveryTier(updated);

      const tierChanged = updated.discoveryTier > existing.discoveryTier;
      const newPending = tierChanged
        ? [...state.pendingCodexUnlocks, speciesId]
        : state.pendingCodexUnlocks;

      if (tierChanged) {
        const sp = getSpeciesById(speciesId);
        queueMicrotask(() => {
          showToast(
            `Codex: ${sp?.name ?? speciesId} -- Discovered!`,
            "achievement",
          );
        });
      }

      return {
        speciesProgress: { ...state.speciesProgress, [speciesId]: updated },
        pendingCodexUnlocks: newPending,
      };
    }),

  trackSpeciesGrowth: (speciesId, newStage) =>
    set((state) => {
      const existing =
        state.speciesProgress[speciesId] ?? createEmptyProgress();
      if (newStage <= existing.maxStageReached) return state;

      const updated: SpeciesProgress = {
        ...existing,
        maxStageReached: newStage,
      };
      updated.discoveryTier = computeDiscoveryTier(updated);

      const tierChanged = updated.discoveryTier > existing.discoveryTier;
      const newPending = tierChanged
        ? [...state.pendingCodexUnlocks, speciesId]
        : state.pendingCodexUnlocks;

      if (tierChanged) {
        const sp = getSpeciesById(speciesId);
        const tierNames = [
          "",
          "Discovered",
          "Studied",
          "Mastered",
          "Legendary",
        ];
        queueMicrotask(() => {
          showToast(
            `Codex: ${sp?.name ?? speciesId} -- ${tierNames[updated.discoveryTier]}!`,
            "achievement",
          );
        });
      }

      return {
        speciesProgress: { ...state.speciesProgress, [speciesId]: updated },
        pendingCodexUnlocks: newPending,
      };
    }),

  trackSpeciesHarvest: (speciesId, yieldAmount) =>
    set((state) => {
      const existing =
        state.speciesProgress[speciesId] ?? createEmptyProgress();
      const updated: SpeciesProgress = {
        ...existing,
        timesHarvested: existing.timesHarvested + 1,
        totalYield: existing.totalYield + yieldAmount,
      };
      updated.discoveryTier = computeDiscoveryTier(updated);

      const tierChanged = updated.discoveryTier > existing.discoveryTier;
      const newPending = tierChanged
        ? [...state.pendingCodexUnlocks, speciesId]
        : state.pendingCodexUnlocks;

      if (tierChanged) {
        const sp = getSpeciesById(speciesId);
        queueMicrotask(() => {
          showToast(
            `Codex: ${sp?.name ?? speciesId} -- Legendary!`,
            "achievement",
          );
        });
      }

      return {
        speciesProgress: { ...state.speciesProgress, [speciesId]: updated },
        pendingCodexUnlocks: newPending,
      };
    }),

  consumePendingCodexUnlock: () => {
    const state = get();
    if (state.pendingCodexUnlocks.length === 0) return null;
    const [first, ...rest] = state.pendingCodexUnlocks;
    set({ pendingCodexUnlocks: rest });
    return first;
  },

  // Settings actions
  setHasSeenRules: (seen) => set({ hasSeenRules: seen }),
  setHapticsEnabled: (enabled) => set({ hapticsEnabled: enabled }),
  setSoundEnabled: (enabled) => set({ soundEnabled: enabled }),

  // Database hydration -- bulk-set state from SQLite
  hydrateFromDb: (dbState) => set(dbState),
}));
