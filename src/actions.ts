import { createActions } from "koota";
import { emptyResources, type ResourceType } from "@/config/resources";
import { setGroveData, type GroveData } from "@/db/snapshot";
import { getToolById } from "@/config/tools";
import { getSpeciesById } from "@/config/trees";
import {
  advanceFestivalChallenge,
  type EventContext,
  getFestivalDef,
  initializeEventState,
  resolveEncounter as resolveEncounterPure,
  updateEvents,
} from "@/events/eventScheduler";
import { koota } from "@/koota";
import {
  advanceObjectives,
  claimStepReward,
  computeAvailableChains,
  initializeChainState,
  startChain,
} from "@/quests/questChainEngine";
import {
  canAffordExpansion,
  getNextExpansionTier,
} from "@/systems/gridExpansion";
import { playSound } from "@/audio";
import { checkNewUnlocks } from "@/systems/levelUnlocks";
import { hapticHeavy } from "@/systems/platform";
import {
  initializeMarketEventState,
  updateMarketEvents,
} from "@/systems/marketEvents";
import {
  calculatePrestigeBonus,
  canPrestige,
  getPrestigeResetState,
  getUnlockedPrestigeSpecies,
} from "@/systems/prestige";
import type { ActiveQuest } from "@/systems/quests";
import {
  computeDiscoveryTier,
  createEmptyProgress,
  type SpeciesProgress,
} from "@/systems/speciesDiscovery";
import {
  initializeMarketState,
  pruneHistory,
  recordTrade,
} from "@/systems/supplyDemand";
import type { Season } from "@/systems/time";
import {
  canAffordToolUpgrade,
  getToolUpgradeTier,
} from "@/systems/toolUpgrades";
import {
  initializeMerchantState,
  purchaseOffer,
  updateMerchant,
} from "@/systems/travelingMerchant";
import {
  Achievements,
  Build,
  CurrentDay,
  CurrentSeason,
  Difficulty,
  EventStateTrait,
  FarmerState,
  GameScreen,
  Grid,
  IsPlayer,
  LifetimeResources,
  MarketEventStateTrait,
  MarketStateTrait,
  MerchantStateTrait,
  PlayerProgress,
  QuestChains,
  Quests,
  Resources,
  Seeds,
  Settings,
  SpeciesProgressTrait,
  Time,
  ToolUpgrades,
  Tracking,
  WorldMeta,
} from "@/traits";
import { showToast } from "@/ui/game/Toast";

// Re-export XP helpers from the legacy store for now; they will move to a
// dedicated util file once gameStore.ts is deleted.
export { levelFromXp, totalXpForLevel, xpToNext } from "@/shared/utils/xp";

import { levelFromXp } from "@/shared/utils/xp";

type GameScreenValue = "menu" | "playing" | "paused" | "seedSelect" | "rules";

/**
 * Shape of a hydration payload supplied by the SQLite adapter. All fields are
 * optional — any matching trait is `.set()` individually. Unknown fields are
 * ignored. Mirrors the fields persisted by the pre-Koota Zustand store.
 */
export interface HydratedGameState {
  screen?: GameScreenValue;
  difficulty?: string;
  permadeath?: boolean;

  // Player progression
  selectedTool?: string;
  selectedSpecies?: string;
  coins?: number;
  xp?: number;
  level?: number;
  unlockedTools?: string[];
  unlockedSpecies?: string[];
  activeBorderCosmetic?: string | null;
  prestigeCount?: number;
  currentTool?: string;

  // Tracking
  treesPlanted?: number;
  treesMatured?: number;
  treesHarvested?: number;
  treesWatered?: number;
  wildTreesHarvested?: number;
  wildTreesRegrown?: number;
  treesPlantedInSpring?: number;
  treesHarvestedInAutumn?: number;
  toolUseCounts?: Record<string, number>;
  visitedZoneTypes?: string[];
  wildSpeciesHarvested?: string[];
  speciesPlanted?: string[];
  seasonsExperienced?: string[];

  // Time
  gameTimeMicroseconds?: number;
  currentSeason?: Season;
  currentDay?: number;

  // Quests
  activeQuests?: ActiveQuest[];
  completedQuestIds?: string[];
  completedGoalIds?: string[];
  lastQuestRefresh?: number;
  questChainState?: ReturnType<typeof initializeChainState>;

  // Resources
  resources?: Record<ResourceType, number>;
  seeds?: Record<string, number>;
  lifetimeResources?: Record<ResourceType, number>;

  // Achievements
  achievements?: string[];

  // Stamina (lives on the player entity)
  stamina?: number;
  maxStamina?: number;

  // Grid
  gridSize?: number;

  // World/zone
  currentZoneId?: string;
  worldSeed?: string;
  discoveredZones?: string[];

  // Build mode
  buildMode?: boolean;
  buildTemplateId?: string | null;
  placedStructures?: { templateId: string; worldX: number; worldZ: number }[];

  // Tool upgrades
  toolUpgrades?: Record<string, number>;

  // Economy / events
  marketState?: ReturnType<typeof initializeMarketState>;
  merchantState?: ReturnType<typeof initializeMerchantState>;
  marketEventState?: ReturnType<typeof initializeMarketEventState>;
  eventState?: ReturnType<typeof initializeEventState>;

  // Species codex
  speciesProgress?: Record<string, SpeciesProgress>;
  pendingCodexUnlocks?: string[];

  // Settings
  hasSeenRules?: boolean;
  hapticsEnabled?: boolean;
  soundEnabled?: boolean;
}

/**
 * Koota port of the legacy Zustand gameStore. Every world-level action lives
 * here; call via `actions(world)` or `useActions(actions)` in React.
 *
 * Two special cases:
 *  • `stamina` / `maxStamina` live on the player ENTITY (FarmerState), so
 *    actions that touch them look up `IsPlayer, FarmerState` via queryFirst.
 *  • Grove serialization (`groveData` in the old store) is persistence state
 *    and has no trait — reintroduced later as a Koota snapshot exporter.
 */
export const gameActions = createActions((world) => {
  // Forward-declaration handle so actions can call sibling actions.
  // Koota's createActions returns a module object; we reference it lazily via
  // the local `bound` closure populated after the object is constructed.
  // This mirrors the Zustand `get().actionX()` pattern.
  let bound: ReturnType<typeof build>;
  const build = () =>
    ({
      // ── Screen / selection ───────────────────────────────────
      setScreen: (screen: GameScreenValue) => {
        world.set(GameScreen, { value: screen });
      },

      setSelectedTool: (tool: string) => {
        world.set(PlayerProgress, (prev) => ({ ...prev, selectedTool: tool }));
      },

      setSelectedSpecies: (speciesId: string) => {
        world.set(PlayerProgress, (prev) => ({
          ...prev,
          selectedSpecies: speciesId,
        }));
      },

      // ── Coins / XP / level ──────────────────────────────────
      addCoins: (amount: number) => {
        world.set(PlayerProgress, (prev) => ({
          ...prev,
          coins: prev.coins + amount,
        }));
      },

      addXp: (amount: number) => {
        const prev = world.get(PlayerProgress);
        if (!prev) return;
        const newXp = prev.xp + amount;
        const newLevel = levelFromXp(newXp);

        if (newLevel > prev.level) {
          const unlocks = checkNewUnlocks(prev.level, newLevel);
          const unlockedTools = [...prev.unlockedTools];
          const unlockedSpecies = [...prev.unlockedSpecies];
          for (const toolId of unlocks.tools) {
            if (!unlockedTools.includes(toolId)) unlockedTools.push(toolId);
          }
          for (const sid of unlocks.species) {
            if (!unlockedSpecies.includes(sid)) unlockedSpecies.push(sid);
          }

          world.set(PlayerProgress, {
            ...prev,
            xp: newXp,
            level: newLevel,
            unlockedTools,
            unlockedSpecies,
          });

          queueMicrotask(() => {
            showToast(`Level ${newLevel}!`, "success");
            playSound("levelUp");
            // Fire-and-forget: haptic is async but we don't want to block
            // the microtask chain on a native bridge roundtrip.
            void hapticHeavy();
            for (const sid of unlocks.species) {
              const sp = getSpeciesById(sid);
              showToast(`Unlocked: ${sp?.name ?? sid}`, "achievement");
            }
            for (const toolId of unlocks.tools) {
              const tool = getToolById(toolId);
              showToast(`Unlocked: ${tool?.name ?? toolId}`, "achievement");
            }
          });
          return;
        }

        world.set(PlayerProgress, { ...prev, xp: newXp, level: newLevel });
      },

      unlockTool: (toolId: string) => {
        world.set(PlayerProgress, (prev) =>
          prev.unlockedTools.includes(toolId)
            ? prev
            : { ...prev, unlockedTools: [...prev.unlockedTools, toolId] },
        );
      },

      unlockSpecies: (speciesId: string) => {
        world.set(PlayerProgress, (prev) =>
          prev.unlockedSpecies.includes(speciesId)
            ? prev
            : {
                ...prev,
                unlockedSpecies: [...prev.unlockedSpecies, speciesId],
              },
        );
      },

      // ── Tracking increments ──────────────────────────────────
      incrementTreesPlanted: () => {
        world.set(Tracking, (prev) => ({
          ...prev,
          treesPlanted: prev.treesPlanted + 1,
        }));
      },
      incrementTreesMatured: () => {
        world.set(Tracking, (prev) => ({
          ...prev,
          treesMatured: prev.treesMatured + 1,
        }));
      },
      incrementTreesHarvested: () => {
        world.set(Tracking, (prev) => ({
          ...prev,
          treesHarvested: prev.treesHarvested + 1,
        }));
      },
      incrementTreesWatered: () => {
        world.set(Tracking, (prev) => ({
          ...prev,
          treesWatered: prev.treesWatered + 1,
        }));
      },

      // ── Resources ────────────────────────────────────────────
      addResource: (type: ResourceType, amount: number) => {
        world.set(Resources, (prev) => ({
          ...prev,
          [type]: prev[type] + amount,
        }));
        world.set(LifetimeResources, (prev) => ({
          ...prev,
          [type]: prev[type] + amount,
        }));
        queueMicrotask(() => {
          bound.advanceQuestObjective(`${type}_collected`, amount);
        });
      },

      spendResource: (type: ResourceType, amount: number): boolean => {
        const prev = world.get(Resources);
        if (!prev || prev[type] < amount) return false;
        world.set(Resources, { ...prev, [type]: prev[type] - amount });
        return true;
      },

      addSeed: (speciesId: string, amount: number) => {
        world.set(Seeds, (prev) => ({
          ...prev,
          [speciesId]: (prev[speciesId] ?? 0) + amount,
        }));
      },

      spendSeed: (speciesId: string, amount: number): boolean => {
        const prev = world.get(Seeds);
        const current = prev?.[speciesId] ?? 0;
        if (current < amount) return false;
        world.set(Seeds, { ...(prev ?? {}), [speciesId]: current - amount });
        return true;
      },

      // ── Stamina (lives on player entity) ─────────────────────
      setStamina: (value: number) => {
        const player = world.queryFirst(IsPlayer, FarmerState);
        if (!player) return;
        player.set(FarmerState, (prev) => ({ ...prev, stamina: value }));
      },

      spendStamina: (amount: number): boolean => {
        const player = world.queryFirst(IsPlayer, FarmerState);
        if (!player) return false;
        const prev = player.get(FarmerState);
        if (!prev || prev.stamina < amount) return false;
        player.set(FarmerState, { ...prev, stamina: prev.stamina - amount });
        return true;
      },

      // ── Achievements & tracking lists ────────────────────────
      unlockAchievement: (id: string) => {
        world.set(Achievements, (prev) =>
          prev.items.includes(id)
            ? prev
            : { items: [...prev.items, id] },
        );
      },

      trackSpeciesPlanted: (speciesId: string) => {
        world.set(Tracking, (prev) =>
          prev.speciesPlanted.includes(speciesId)
            ? prev
            : {
                ...prev,
                speciesPlanted: [...prev.speciesPlanted, speciesId],
              },
        );
      },

      trackSeason: (season: string) => {
        world.set(Tracking, (prev) =>
          prev.seasonsExperienced.includes(season)
            ? prev
            : {
                ...prev,
                seasonsExperienced: [...prev.seasonsExperienced, season],
              },
        );
      },

      // ── Grid expansion ───────────────────────────────────────
      expandGrid: (): boolean => {
        const grid = world.get(Grid);
        const resources = world.get(Resources);
        const progress = world.get(PlayerProgress);
        if (!grid || !resources || !progress) return false;
        const nextTier = getNextExpansionTier(grid.gridSize);
        if (!nextTier) return false;
        if (!canAffordExpansion(nextTier, resources, progress.level))
          return false;
        const newResources = { ...resources };
        for (const [resource, amount] of Object.entries(nextTier.cost)) {
          const key = resource as ResourceType;
          newResources[key] = (newResources[key] ?? 0) - (amount as number);
        }
        world.set(Grid, { gridSize: nextTier.size });
        world.set(Resources, newResources);
        queueMicrotask(() => {
          showToast(
            `Grove expanded to ${nextTier.size}x${nextTier.size}!`,
            "success",
          );
        });
        return true;
      },

      // ── Prestige ─────────────────────────────────────────────
      performPrestige: (): boolean => {
        const progress = world.get(PlayerProgress);
        const achievements = world.get(Achievements);
        const tracking = world.get(Tracking);
        const lifetime = world.get(LifetimeResources);
        const codex = world.get(SpeciesProgressTrait);
        const questChain = world.get(QuestChains);
        const settings = world.get(Settings);
        if (!progress || !tracking || !settings) return false;
        if (!canPrestige(progress.level)) return false;

        const newCount = progress.prestigeCount + 1;
        const resetState = getPrestigeResetState();
        const bonus = calculatePrestigeBonus(newCount);
        const prestigeSpecies = getUnlockedPrestigeSpecies(newCount);
        const newUnlockedSpecies = [
          "white-oak",
          ...prestigeSpecies.map((s) => s.id),
        ];

        // Reset PlayerProgress subset
        world.set(PlayerProgress, {
          ...progress,
          level: resetState.level,
          xp: resetState.xp,
          coins: 0,
          prestigeCount: newCount,
          unlockedTools: ["trowel", "watering-can"],
          unlockedSpecies: newUnlockedSpecies,
        });

        // Reset world-scoped state
        world.set(Resources, resetState.resources);
        world.set(Seeds, resetState.seeds);
        world.set(Grid, { gridSize: 12 });
        world.set(Build, {
          mode: false,
          templateId: null,
          placedStructures: [],
        });
        world.set(Tracking, {
          ...tracking,
          treesPlanted: resetState.treesPlanted,
          treesMatured: resetState.treesMatured,
          treesHarvested: resetState.treesHarvested,
          treesWatered: resetState.treesWatered,
          speciesPlanted: [],
        });
        world.set(MarketStateTrait, initializeMarketState());
        world.set(MerchantStateTrait, initializeMerchantState());
        world.set(MarketEventStateTrait, initializeMarketEventState());
        world.set(EventStateTrait, initializeEventState());

        // Preserve lists
        if (achievements) world.set(Achievements, achievements);
        if (lifetime) world.set(LifetimeResources, lifetime);
        if (codex)
          world.set(SpeciesProgressTrait, {
            speciesProgress: codex.speciesProgress,
            pendingCodexUnlocks: [],
          });
        if (questChain) world.set(QuestChains, questChain);

        // Update stamina on player entity
        const player = world.queryFirst(IsPlayer, FarmerState);
        if (player) {
          const newMax = 100 + bonus.staminaBonus;
          player.set(FarmerState, { stamina: newMax, maxStamina: newMax });
        }

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

      setActiveBorderCosmetic: (id: string | null) => {
        world.set(PlayerProgress, (prev) => ({
          ...prev,
          activeBorderCosmetic: id,
        }));
      },

      setBuildMode: (enabled: boolean, templateId?: string) => {
        world.set(Build, (prev) => ({
          ...prev,
          mode: enabled,
          templateId: enabled ? (templateId ?? null) : null,
        }));
      },

      addPlacedStructure: (
        templateId: string,
        worldX: number,
        worldZ: number,
      ) => {
        world.set(Build, (prev) => ({
          ...prev,
          placedStructures: [
            ...prev.placedStructures,
            { templateId, worldX, worldZ },
          ],
        }));
      },

      // ── Grove data (ephemeral save state, module-scoped holder) ──
      saveGrove: (
        trees: GroveData["trees"],
        playerPosition: { x: number; z: number },
      ) => {
        setGroveData({ trees, playerPosition });
      },

      removePlacedStructure: (worldX: number, worldZ: number) => {
        world.set(Build, (prev) => ({
          ...prev,
          placedStructures: prev.placedStructures.filter(
            (s) => s.worldX !== worldX || s.worldZ !== worldZ,
          ),
        }));
      },

      resetGame: () => {
        // Clear ephemeral groveData (used to live on Zustand store)
        setGroveData(null);
        world.set(PlayerProgress, {
          level: 1,
          xp: 0,
          coins: 100,
          selectedTool: "trowel",
          selectedSpecies: "white-oak",
          currentTool: "trowel",
          unlockedTools: ["trowel", "watering-can"],
          unlockedSpecies: ["white-oak"],
          activeBorderCosmetic: null,
          prestigeCount: 0,
        });
        world.set(Resources, emptyResources());
        world.set(LifetimeResources, emptyResources());
        world.set(Seeds, { "white-oak": 10 });
        world.set(Tracking, {
          treesPlanted: 0,
          treesMatured: 0,
          treesHarvested: 0,
          treesWatered: 0,
          wildTreesHarvested: 0,
          wildTreesRegrown: 0,
          treesPlantedInSpring: 0,
          treesHarvestedInAutumn: 0,
          toolUseCounts: {},
          visitedZoneTypes: [],
          wildSpeciesHarvested: [],
          speciesPlanted: [],
          seasonsExperienced: [],
        });
        world.set(Achievements, { items: [] });
        world.set(Quests, {
          activeQuests: [],
          completedQuestIds: [],
          completedGoalIds: [],
          lastQuestRefresh: 0,
        });
        world.set(QuestChains, initializeChainState());
        world.set(MarketStateTrait, initializeMarketState());
        world.set(MerchantStateTrait, initializeMerchantState());
        world.set(MarketEventStateTrait, initializeMarketEventState());
        world.set(EventStateTrait, initializeEventState());
        world.set(SpeciesProgressTrait, {
          speciesProgress: {},
          pendingCodexUnlocks: [],
        });
        world.set(ToolUpgrades, {});
        world.set(Grid, { gridSize: 12 });
        world.set(Build, {
          mode: false,
          templateId: null,
          placedStructures: [],
        });
        world.set(WorldMeta, {
          currentZoneId: "starting-grove",
          worldSeed: "",
          discoveredZones: ["starting-grove"],
        });
        world.set(Settings, {
          hasSeenRules: false,
          hapticsEnabled: true,
          soundEnabled: true,
        });
        world.set(GameScreen, { value: "menu" });
        world.set(Difficulty, { id: "normal", permadeath: false });
        // Time: Spring (month 3), Day 1, 8:00 AM — matches legacy
        // Zustand INITIAL_GAME_TIME. Calculation: 60 days (2 months) + 8h.
        const initialGameTimeSeconds =
          (2 * 30 * 24 * 60 + 8 * 60) * 60;
        world.set(Time, {
          gameTimeMicroseconds: initialGameTimeSeconds * 1_000_000,
          last: 0,
          delta: 0,
        });
        world.set(CurrentSeason, { value: "spring" });
        world.set(CurrentDay, { value: 1 });
        const player = world.queryFirst(IsPlayer, FarmerState);
        if (player) {
          player.set(FarmerState, { stamina: 100, maxStamina: 100 });
        }
      },

      // ── Time actions ─────────────────────────────────────────
      setGameTime: (microseconds: number) => {
        world.set(Time, (prev) => ({
          ...prev,
          gameTimeMicroseconds: microseconds,
        }));
      },
      setCurrentSeason: (season: Season) => {
        world.set(CurrentSeason, { value: season });
      },
      setCurrentDay: (day: number) => {
        world.set(CurrentDay, { value: day });
      },

      // ── Quest actions ────────────────────────────────────────
      setActiveQuests: (quests: ActiveQuest[]) => {
        world.set(Quests, (prev) => ({ ...prev, activeQuests: quests }));
      },
      updateQuest: (questId: string, quest: ActiveQuest) => {
        world.set(Quests, (prev) => ({
          ...prev,
          activeQuests: prev.activeQuests.map((q) =>
            q.id === questId ? quest : q,
          ),
        }));
      },
      completeQuest: (questId: string) => {
        world.set(Quests, (prev) => ({
          ...prev,
          activeQuests: prev.activeQuests.filter((q) => q.id !== questId),
          completedQuestIds: [...prev.completedQuestIds, questId],
        }));
        // T33: quest-complete feedback. "success" chord is distinct from
        // "levelUp" fanfare and "achievement" bell; reuses existing sound
        // rather than synthesizing another Tone.js graph.
        playSound("success");
      },
      setLastQuestRefresh: (time: number) => {
        world.set(Quests, (prev) => ({ ...prev, lastQuestRefresh: time }));
      },

      // ── Quest chain actions ──────────────────────────────────
      refreshAvailableChains: () => {
        const chains = world.get(QuestChains);
        const progress = world.get(PlayerProgress);
        if (!chains || !progress) return;
        const available = computeAvailableChains(chains, progress.level);
        world.set(QuestChains, { ...chains, availableChainIds: available });
      },

      startQuestChain: (chainId: string) => {
        const chains = world.get(QuestChains);
        const day = world.get(CurrentDay);
        if (!chains || !day) return;
        world.set(QuestChains, startChain(chains, chainId, day.value));
      },

      advanceQuestObjective: (
        eventType: string,
        amount: number,
      ): { chainId: string; stepId: string }[] => {
        const chains = world.get(QuestChains);
        if (!chains) return [];
        const result = advanceObjectives(chains, eventType, amount);
        if (result.state !== chains) {
          world.set(QuestChains, result.state);
        }
        return result.completedSteps;
      },

      claimQuestStepReward: (chainId: string) => {
        const chains = world.get(QuestChains);
        if (!chains) return;
        const result = claimStepReward(chains, chainId);
        if (!result.stepDef) return;

        world.set(QuestChains, result.state);

        const reward = result.stepDef.reward;
        if (reward.xp) bound.addXp(reward.xp);
        if (reward.resources) {
          for (const [resource, amount] of Object.entries(reward.resources)) {
            if (amount) bound.addResource(resource as ResourceType, amount);
          }
        }
        if (reward.seeds) {
          for (const seed of reward.seeds) {
            bound.addSeed(seed.speciesId, seed.amount);
          }
        }
        if (reward.unlockSpecies) bound.unlockSpecies(reward.unlockSpecies);

        queueMicrotask(() => {
          showToast(`Quest step complete: ${result.stepDef?.name}`, "success");
        });
      },

      // ── Discovery actions ────────────────────────────────────
      discoverZone: (zoneId: string): boolean => {
        const meta = world.get(WorldMeta);
        if (!meta) return false;
        if (meta.discoveredZones.includes(zoneId)) return false;
        world.set(WorldMeta, {
          ...meta,
          discoveredZones: [...meta.discoveredZones, zoneId],
        });
        queueMicrotask(() => {
          showToast(`Discovered new area!`, "success");
        });
        bound.addXp(50);
        return true;
      },

      // ── World/zone actions ───────────────────────────────────
      setCurrentZoneId: (zoneId: string) => {
        world.set(WorldMeta, (prev) => ({ ...prev, currentZoneId: zoneId }));
      },
      setWorldSeed: (seed: string) => {
        world.set(WorldMeta, (prev) => ({ ...prev, worldSeed: seed }));
      },

      // ── Achievement tracking ─────────────────────────────────
      incrementToolUse: (toolId: string) => {
        world.set(Tracking, (prev) => ({
          ...prev,
          toolUseCounts: {
            ...prev.toolUseCounts,
            [toolId]: (prev.toolUseCounts[toolId] ?? 0) + 1,
          },
        }));
      },

      incrementWildTreesHarvested: (speciesId?: string) => {
        world.set(Tracking, (prev) => ({
          ...prev,
          wildTreesHarvested: prev.wildTreesHarvested + 1,
          wildSpeciesHarvested:
            speciesId && !prev.wildSpeciesHarvested.includes(speciesId)
              ? [...prev.wildSpeciesHarvested, speciesId]
              : prev.wildSpeciesHarvested,
        }));
      },

      incrementWildTreesRegrown: () => {
        world.set(Tracking, (prev) => ({
          ...prev,
          wildTreesRegrown: prev.wildTreesRegrown + 1,
        }));
      },

      trackVisitedZoneType: (zoneType: string) => {
        world.set(Tracking, (prev) =>
          prev.visitedZoneTypes.includes(zoneType)
            ? prev
            : {
                ...prev,
                visitedZoneTypes: [...prev.visitedZoneTypes, zoneType],
              },
        );
      },

      incrementSeasonalPlanting: (season: string) => {
        world.set(Tracking, (prev) => ({
          ...prev,
          treesPlantedInSpring:
            season === "spring"
              ? prev.treesPlantedInSpring + 1
              : prev.treesPlantedInSpring,
        }));
      },

      incrementSeasonalHarvest: (season: string) => {
        world.set(Tracking, (prev) => ({
          ...prev,
          treesHarvestedInAutumn:
            season === "autumn"
              ? prev.treesHarvestedInAutumn + 1
              : prev.treesHarvestedInAutumn,
        }));
      },

      // ── Tool upgrade actions ─────────────────────────────────
      upgradeToolTier: (toolId: string): boolean => {
        const upgrades = world.get(ToolUpgrades);
        const resources = world.get(Resources);
        if (!upgrades || !resources) return false;
        const currentTier = upgrades[toolId] ?? 0;
        const nextTier = getToolUpgradeTier(currentTier);
        if (!nextTier) return false;
        if (!canAffordToolUpgrade(nextTier, resources)) return false;
        const newResources = { ...resources };
        for (const [resource, amount] of Object.entries(nextTier.cost)) {
          const key = resource as ResourceType;
          newResources[key] = (newResources[key] ?? 0) - (amount as number);
        }
        world.set(Resources, newResources);
        world.set(ToolUpgrades, {
          ...upgrades,
          [toolId]: currentTier + 1,
        });
        queueMicrotask(() => {
          showToast(`Tool upgraded to tier ${currentTier + 1}!`, "success");
        });
        return true;
      },

      // ── Economy actions ──────────────────────────────────────
      recordMarketTrade: (
        resource: ResourceType,
        direction: "buy" | "sell",
        amount: number,
      ) => {
        const market = world.get(MarketStateTrait);
        const day = world.get(CurrentDay);
        if (!market || !day) return;
        world.set(
          MarketStateTrait,
          recordTrade(market, resource, direction, amount, day.value),
        );
      },

      updateEconomy: (currentDay: number) => {
        const market = world.get(MarketStateTrait);
        const merchant = world.get(MerchantStateTrait);
        const marketEvents = world.get(MarketEventStateTrait);
        const meta = world.get(WorldMeta);
        if (!market || !merchant || !marketEvents) return;
        const rngSeed = meta?.worldSeed || "default";

        const prunedMarket = pruneHistory(market, currentDay);
        const newMerchantState = updateMerchant(merchant, currentDay, rngSeed);
        const eventResult = updateMarketEvents(
          marketEvents,
          currentDay,
          rngSeed,
        );

        if (prunedMarket !== market) {
          world.set(MarketStateTrait, prunedMarket);
        }
        if (newMerchantState !== merchant) {
          world.set(MerchantStateTrait, newMerchantState);
          if (newMerchantState.isPresent && !merchant.isPresent) {
            queueMicrotask(() => {
              showToast("A traveling merchant has arrived!", "success");
            });
          }
        }
        if (eventResult.state !== marketEvents) {
          world.set(MarketEventStateTrait, eventResult.state);
          if (eventResult.newEventTriggered && eventResult.state.activeEvent) {
            queueMicrotask(() => {
              showToast("Market event started!", "success");
            });
          }
        }
      },

      purchaseMerchantOffer: (offerId: string): boolean => {
        const merchant = world.get(MerchantStateTrait);
        const resources = world.get(Resources);
        if (!merchant || !resources) return false;
        if (!merchant.isPresent) return false;

        const offer = merchant.currentOffers.find((o) => o.id === offerId);
        if (!offer || offer.quantity <= 0) return false;

        for (const [resource, amount] of Object.entries(offer.cost)) {
          if ((resources[resource as ResourceType] ?? 0) < (amount as number)) {
            return false;
          }
        }

        const newResources = { ...resources };
        for (const [resource, amount] of Object.entries(offer.cost)) {
          newResources[resource as ResourceType] -= amount as number;
        }

        const result = purchaseOffer(merchant, offerId);
        if (!result.offer) return false;

        world.set(Resources, newResources);
        world.set(MerchantStateTrait, result.state);

        const reward = result.offer.reward;
        if (reward.type === "resource" && reward.resource && reward.amount) {
          bound.addResource(reward.resource, reward.amount);
        } else if (
          reward.type === "seed" &&
          reward.speciesId &&
          reward.amount
        ) {
          bound.addSeed(reward.speciesId, reward.amount);
        } else if (reward.type === "xp" && reward.amount) {
          bound.addXp(reward.amount);
        }

        queueMicrotask(() => {
          showToast(`Purchased: ${result.offer?.name}`, "success");
        });
        return true;
      },

      // ── Event scheduler actions ──────────────────────────────
      tickEvents: (context: EventContext) => {
        const eventState = world.get(EventStateTrait);
        if (!eventState) return;
        const result = updateEvents(eventState, context);
        if (result.state !== eventState) {
          world.set(EventStateTrait, result.state);
        }
        if (result.festivalStarted) {
          queueMicrotask(() => {
            showToast(
              `${result.festivalStarted?.name} has begun!`,
              "achievement",
            );
          });
        }
        if (result.festivalEnded) {
          const def = getFestivalDef(result.festivalEnded);
          const completed = eventState.activeFestival?.completed;
          queueMicrotask(() => {
            if (completed && def) {
              showToast(`${def.name} complete!`, "success");
              const reward = def.completionReward;
              if (reward.xp) bound.addXp(reward.xp);
              if (reward.resources) {
                for (const [resource, amount] of Object.entries(
                  reward.resources,
                )) {
                  if (amount)
                    bound.addResource(resource as ResourceType, amount);
                }
              }
              if (reward.seeds) {
                for (const seed of reward.seeds) {
                  bound.addSeed(seed.speciesId, seed.amount);
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

      advanceEventChallenge: (challengeType: string, amount = 1) => {
        const eventState = world.get(EventStateTrait);
        if (!eventState) return;
        if (!eventState.activeFestival) return;
        const next = advanceFestivalChallenge(
          eventState,
          challengeType,
          amount,
        );
        if (next !== eventState) {
          world.set(EventStateTrait, next);
        }
      },

      resolveEncounter: (definitionId: string) => {
        const eventState = world.get(EventStateTrait);
        if (!eventState) return;
        const next = resolveEncounterPure(eventState, definitionId);
        if (next !== eventState) {
          world.set(EventStateTrait, next);
        }
      },

      // ── Species codex actions ────────────────────────────────
      trackSpeciesPlanting: (speciesId: string) => {
        const codex = world.get(SpeciesProgressTrait);
        if (!codex) return;
        const existing =
          codex.speciesProgress[speciesId] ?? createEmptyProgress();
        const updated: SpeciesProgress = {
          ...existing,
          timesPlanted: existing.timesPlanted + 1,
        };
        updated.discoveryTier = computeDiscoveryTier(updated);

        const tierChanged = updated.discoveryTier > existing.discoveryTier;
        const newPending = tierChanged
          ? [...codex.pendingCodexUnlocks, speciesId]
          : codex.pendingCodexUnlocks;

        if (tierChanged) {
          const sp = getSpeciesById(speciesId);
          queueMicrotask(() => {
            showToast(
              `Codex: ${sp?.name ?? speciesId} -- Discovered!`,
              "achievement",
            );
          });
        }

        world.set(SpeciesProgressTrait, {
          speciesProgress: { ...codex.speciesProgress, [speciesId]: updated },
          pendingCodexUnlocks: newPending,
        });
      },

      trackSpeciesGrowth: (speciesId: string, newStage: number) => {
        const codex = world.get(SpeciesProgressTrait);
        if (!codex) return;
        const existing =
          codex.speciesProgress[speciesId] ?? createEmptyProgress();
        if (newStage <= existing.maxStageReached) return;

        const updated: SpeciesProgress = {
          ...existing,
          maxStageReached: newStage,
        };
        updated.discoveryTier = computeDiscoveryTier(updated);

        const tierChanged = updated.discoveryTier > existing.discoveryTier;
        const newPending = tierChanged
          ? [...codex.pendingCodexUnlocks, speciesId]
          : codex.pendingCodexUnlocks;

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

        world.set(SpeciesProgressTrait, {
          speciesProgress: { ...codex.speciesProgress, [speciesId]: updated },
          pendingCodexUnlocks: newPending,
        });
      },

      trackSpeciesHarvest: (speciesId: string, yieldAmount: number) => {
        const codex = world.get(SpeciesProgressTrait);
        if (!codex) return;
        const existing =
          codex.speciesProgress[speciesId] ?? createEmptyProgress();
        const updated: SpeciesProgress = {
          ...existing,
          timesHarvested: existing.timesHarvested + 1,
          totalYield: existing.totalYield + yieldAmount,
        };
        updated.discoveryTier = computeDiscoveryTier(updated);

        const tierChanged = updated.discoveryTier > existing.discoveryTier;
        const newPending = tierChanged
          ? [...codex.pendingCodexUnlocks, speciesId]
          : codex.pendingCodexUnlocks;

        if (tierChanged) {
          const sp = getSpeciesById(speciesId);
          queueMicrotask(() => {
            showToast(
              `Codex: ${sp?.name ?? speciesId} -- Legendary!`,
              "achievement",
            );
          });
        }

        world.set(SpeciesProgressTrait, {
          speciesProgress: { ...codex.speciesProgress, [speciesId]: updated },
          pendingCodexUnlocks: newPending,
        });
      },

      consumePendingCodexUnlock: (): string | null => {
        const codex = world.get(SpeciesProgressTrait);
        if (!codex || codex.pendingCodexUnlocks.length === 0) return null;
        const [first, ...rest] = codex.pendingCodexUnlocks;
        world.set(SpeciesProgressTrait, {
          ...codex,
          pendingCodexUnlocks: rest,
        });
        return first;
      },

      // ── Settings actions ─────────────────────────────────────
      setHasSeenRules: (seen: boolean) => {
        world.set(Settings, (prev) => ({ ...prev, hasSeenRules: seen }));
      },
      setHapticsEnabled: (enabled: boolean) => {
        world.set(Settings, (prev) => ({ ...prev, hapticsEnabled: enabled }));
      },
      setSoundEnabled: (enabled: boolean) => {
        world.set(Settings, (prev) => ({ ...prev, soundEnabled: enabled }));
      },

      // ── Difficulty ───────────────────────────────────────────
      setDifficulty: (id: string, permadeath: boolean) => {
        world.set(Difficulty, { id, permadeath });
      },

      // ── Hydration ────────────────────────────────────────────
      hydrateFromDb: (dbState: HydratedGameState) => {
        // Screen & Difficulty
        if (dbState.screen !== undefined) {
          world.set(GameScreen, { value: dbState.screen });
        }
        if (
          dbState.difficulty !== undefined ||
          dbState.permadeath !== undefined
        ) {
          const cur = world.get(Difficulty);
          world.set(Difficulty, {
            id: dbState.difficulty ?? cur?.id ?? "normal",
            permadeath: dbState.permadeath ?? cur?.permadeath ?? false,
          });
        }

        // PlayerProgress (merge)
        const pp = world.get(PlayerProgress);
        if (pp) {
          const next = { ...pp };
          if (dbState.selectedTool !== undefined)
            next.selectedTool = dbState.selectedTool;
          if (dbState.selectedSpecies !== undefined)
            next.selectedSpecies = dbState.selectedSpecies;
          if (dbState.currentTool !== undefined)
            next.currentTool = dbState.currentTool;
          if (dbState.coins !== undefined) next.coins = dbState.coins;
          if (dbState.xp !== undefined) next.xp = dbState.xp;
          if (dbState.level !== undefined) next.level = dbState.level;
          if (dbState.unlockedTools !== undefined)
            next.unlockedTools = dbState.unlockedTools;
          if (dbState.unlockedSpecies !== undefined)
            next.unlockedSpecies = dbState.unlockedSpecies;
          if (dbState.activeBorderCosmetic !== undefined)
            next.activeBorderCosmetic = dbState.activeBorderCosmetic;
          if (dbState.prestigeCount !== undefined)
            next.prestigeCount = dbState.prestigeCount;
          world.set(PlayerProgress, next);
        }

        // Tracking (merge)
        const tr = world.get(Tracking);
        if (tr) {
          const next = { ...tr };
          if (dbState.treesPlanted !== undefined)
            next.treesPlanted = dbState.treesPlanted;
          if (dbState.treesMatured !== undefined)
            next.treesMatured = dbState.treesMatured;
          if (dbState.treesHarvested !== undefined)
            next.treesHarvested = dbState.treesHarvested;
          if (dbState.treesWatered !== undefined)
            next.treesWatered = dbState.treesWatered;
          if (dbState.wildTreesHarvested !== undefined)
            next.wildTreesHarvested = dbState.wildTreesHarvested;
          if (dbState.wildTreesRegrown !== undefined)
            next.wildTreesRegrown = dbState.wildTreesRegrown;
          if (dbState.treesPlantedInSpring !== undefined)
            next.treesPlantedInSpring = dbState.treesPlantedInSpring;
          if (dbState.treesHarvestedInAutumn !== undefined)
            next.treesHarvestedInAutumn = dbState.treesHarvestedInAutumn;
          if (dbState.toolUseCounts !== undefined)
            next.toolUseCounts = dbState.toolUseCounts;
          if (dbState.visitedZoneTypes !== undefined)
            next.visitedZoneTypes = dbState.visitedZoneTypes;
          if (dbState.wildSpeciesHarvested !== undefined)
            next.wildSpeciesHarvested = dbState.wildSpeciesHarvested;
          if (dbState.speciesPlanted !== undefined)
            next.speciesPlanted = dbState.speciesPlanted;
          if (dbState.seasonsExperienced !== undefined)
            next.seasonsExperienced = dbState.seasonsExperienced;
          world.set(Tracking, next);
        }

        // Time
        if (dbState.gameTimeMicroseconds !== undefined) {
          const microseconds = dbState.gameTimeMicroseconds;
          world.set(Time, (prev) => ({
            ...prev,
            gameTimeMicroseconds: microseconds,
          }));
        }
        if (dbState.currentSeason !== undefined) {
          world.set(CurrentSeason, { value: dbState.currentSeason });
        }
        if (dbState.currentDay !== undefined) {
          world.set(CurrentDay, { value: dbState.currentDay });
        }

        // Quests (merge)
        const quests = world.get(Quests);
        if (quests) {
          const next = { ...quests };
          if (dbState.activeQuests !== undefined)
            next.activeQuests = dbState.activeQuests;
          if (dbState.completedQuestIds !== undefined)
            next.completedQuestIds = dbState.completedQuestIds;
          if (dbState.completedGoalIds !== undefined)
            next.completedGoalIds = dbState.completedGoalIds;
          if (dbState.lastQuestRefresh !== undefined)
            next.lastQuestRefresh = dbState.lastQuestRefresh;
          world.set(Quests, next);
        }

        if (dbState.questChainState !== undefined) {
          world.set(QuestChains, dbState.questChainState);
        }

        // Resources
        if (dbState.resources !== undefined)
          world.set(Resources, dbState.resources);
        if (dbState.lifetimeResources !== undefined)
          world.set(LifetimeResources, dbState.lifetimeResources);
        if (dbState.seeds !== undefined) world.set(Seeds, dbState.seeds);

        // Achievements
        if (dbState.achievements !== undefined)
          world.set(Achievements, { items: dbState.achievements });

        // Stamina (on player entity)
        if (dbState.stamina !== undefined || dbState.maxStamina !== undefined) {
          const player = world.queryFirst(IsPlayer, FarmerState);
          if (player) {
            const cur = player.get(FarmerState);
            player.set(FarmerState, {
              stamina: dbState.stamina ?? cur?.stamina ?? 100,
              maxStamina: dbState.maxStamina ?? cur?.maxStamina ?? 100,
            });
          }
        }

        // Grid
        if (dbState.gridSize !== undefined) {
          world.set(Grid, { gridSize: dbState.gridSize });
        }

        // WorldMeta (merge)
        const meta = world.get(WorldMeta);
        if (meta) {
          const next = { ...meta };
          if (dbState.currentZoneId !== undefined)
            next.currentZoneId = dbState.currentZoneId;
          if (dbState.worldSeed !== undefined)
            next.worldSeed = dbState.worldSeed;
          if (dbState.discoveredZones !== undefined)
            next.discoveredZones = dbState.discoveredZones;
          world.set(WorldMeta, next);
        }

        // Build (merge)
        const build = world.get(Build);
        if (build) {
          const next = { ...build };
          if (dbState.buildMode !== undefined) next.mode = dbState.buildMode;
          if (dbState.buildTemplateId !== undefined)
            next.templateId = dbState.buildTemplateId;
          if (dbState.placedStructures !== undefined)
            next.placedStructures = dbState.placedStructures;
          world.set(Build, next);
        }

        // Tool upgrades
        if (dbState.toolUpgrades !== undefined)
          world.set(ToolUpgrades, dbState.toolUpgrades);

        // Economy / events
        if (dbState.marketState !== undefined)
          world.set(MarketStateTrait, dbState.marketState);
        if (dbState.merchantState !== undefined)
          world.set(MerchantStateTrait, dbState.merchantState);
        if (dbState.marketEventState !== undefined)
          world.set(MarketEventStateTrait, dbState.marketEventState);
        if (dbState.eventState !== undefined)
          world.set(EventStateTrait, dbState.eventState);

        // Species codex (merge)
        const codex = world.get(SpeciesProgressTrait);
        if (codex) {
          const next = { ...codex };
          if (dbState.speciesProgress !== undefined)
            next.speciesProgress = dbState.speciesProgress;
          if (dbState.pendingCodexUnlocks !== undefined)
            next.pendingCodexUnlocks = dbState.pendingCodexUnlocks;
          world.set(SpeciesProgressTrait, next);
        }

        // Settings (merge)
        const settings = world.get(Settings);
        if (settings) {
          const next = { ...settings };
          if (dbState.hasSeenRules !== undefined)
            next.hasSeenRules = dbState.hasSeenRules;
          if (dbState.hapticsEnabled !== undefined)
            next.hapticsEnabled = dbState.hapticsEnabled;
          if (dbState.soundEnabled !== undefined)
            next.soundEnabled = dbState.soundEnabled;
          world.set(Settings, next);
        }
      },
    }) as const;

  bound = build();
  return bound;
});

/**
 * Convenience: the global Koota world is a singleton, so there is only ever
 * one action bundle. Consumers that need the raw object (not via `useActions`)
 * can call `actions()` to get the bundle.
 */
export const actions = () => gameActions(koota);
