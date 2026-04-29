import { createActions } from "koota";
import type { ResourceType } from "@/config/resources";
import { koota } from "@/koota";
import {
  Achievements,
  Build,
  CurrentDay,
  CurrentSeason,
  Difficulty,
  FarmerState,
  GameScreen,
  Grid,
  IsPlayer,
  LifetimeResources,
  PlayerProgress,
  QuestChains,
  Quests,
  Resources,
  Seeds,
  Settings,
  SpeciesProgressTrait,
  Time,
  Tracking,
  WorldMeta,
} from "@/traits";
import { showToast } from "@/ui/game/Toast";

export interface HydratedGameState {
  screen?: string;
  difficulty?: string;
  permadeath?: boolean;
  selectedTool?: string;
  selectedSpecies?: string;
  currentTool?: string;
  coins?: number;
  xp?: number;
  level?: number;
  unlockedTools?: string[];
  unlockedSpecies?: string[];
  activeBorderCosmetic?: string | null;
  prestigeCount?: number;
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
  gameTimeMicroseconds?: number;
  currentSeason?: "spring" | "summer" | "autumn" | "winter";
  currentDay?: number;
  activeQuests?: unknown[];
  completedQuestIds?: string[];
  completedGoalIds?: string[];
  lastQuestRefresh?: number;
  questChainState?: unknown;
  resources?: { timber: number; sap: number; fruit: number; acorns: number };
  lifetimeResources?: {
    timber: number;
    sap: number;
    fruit: number;
    acorns: number;
  };
  seeds?: Record<string, number>;
  achievements?: string[];
  stamina?: number;
  maxStamina?: number;
  gridSize?: number;
  currentZoneId?: string;
  worldSeed?: string;
  discoveredZones?: string[];
  buildMode?: boolean;
  buildTemplateId?: string | null;
  placedStructures?: { templateId: string; worldX: number; worldZ: number }[];
  hasSeenRules?: boolean;
  hapticsEnabled?: boolean;
  soundEnabled?: boolean;
  speciesProgress?: Record<string, unknown>;
  pendingCodexUnlocks?: string[];
}

const gameActions = createActions((world) => ({
  setScreen: (
    screen: "menu" | "new-game" | "playing" | "paused" | "seedSelect" | "rules",
  ) => {
    world.set(GameScreen, { value: screen });
  },

  setBuildMode: (enabled: boolean, templateId?: string) => {
    world.set(Build, (prev) => ({
      ...prev,
      mode: enabled,
      templateId: enabled ? (templateId ?? null) : null,
    }));
  },

  addPlacedStructure: (templateId: string, worldX: number, worldZ: number) => {
    world.set(Build, (prev) => ({
      ...prev,
      placedStructures: [
        ...prev.placedStructures,
        { templateId, worldX, worldZ },
      ],
    }));
  },

  addResource: (type: ResourceType, amount: number) => {
    world.set(Resources, (prev) => ({ ...prev, [type]: prev[type] + amount }));
    world.set(LifetimeResources, (prev) => ({
      ...prev,
      [type]: prev[type] + amount,
    }));
  },

  incrementTreesHarvested: () => {
    world.set(Tracking, (prev) => ({
      ...prev,
      treesHarvested: prev.treesHarvested + 1,
    }));
  },

  discoverZone: (zoneId: string): boolean => {
    const meta = world.get(WorldMeta);
    if (!meta) return false;
    if (meta.discoveredZones.includes(zoneId)) return false;
    world.set(WorldMeta, {
      ...meta,
      discoveredZones: [...meta.discoveredZones, zoneId],
    });
    queueMicrotask(() => {
      showToast("Discovered new area!", "success");
    });
    return true;
  },

  setWorldSeed: (seed: string) => {
    world.set(WorldMeta, (prev) => ({ ...prev, worldSeed: seed }));
  },

  setSoundEnabled: (enabled: boolean) => {
    world.set(Settings, (prev) => ({ ...prev, soundEnabled: enabled }));
  },

  hydrateFromDb: (dbState: HydratedGameState) => {
    const VALID_SCREENS = [
      "menu",
      "new-game",
      "playing",
      "paused",
      "seedSelect",
      "rules",
    ] as const;
    type ScreenValue = (typeof VALID_SCREENS)[number];
    if (
      dbState.screen !== undefined &&
      (VALID_SCREENS as readonly string[]).includes(dbState.screen)
    ) {
      world.set(GameScreen, { value: dbState.screen as ScreenValue });
    }
    if (dbState.difficulty !== undefined || dbState.permadeath !== undefined) {
      const cur = world.get(Difficulty);
      world.set(Difficulty, {
        id: dbState.difficulty ?? cur?.id ?? "normal",
        permadeath: dbState.permadeath ?? cur?.permadeath ?? false,
      });
    }
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
    if (dbState.gameTimeMicroseconds !== undefined) {
      const us = dbState.gameTimeMicroseconds;
      world.set(Time, (prev) => ({ ...prev, gameTimeMicroseconds: us }));
    }
    if (dbState.currentSeason !== undefined) {
      world.set(CurrentSeason, { value: dbState.currentSeason });
    }
    if (dbState.currentDay !== undefined) {
      world.set(CurrentDay, { value: dbState.currentDay });
    }
    const quests = world.get(Quests);
    if (
      quests &&
      (dbState.activeQuests !== undefined ||
        dbState.completedQuestIds !== undefined ||
        dbState.completedGoalIds !== undefined ||
        dbState.lastQuestRefresh !== undefined)
    ) {
      const next = { ...quests };
      if (dbState.activeQuests !== undefined)
        next.activeQuests = dbState.activeQuests as typeof quests.activeQuests;
      if (dbState.completedQuestIds !== undefined)
        next.completedQuestIds = dbState.completedQuestIds;
      if (dbState.completedGoalIds !== undefined)
        next.completedGoalIds = dbState.completedGoalIds;
      if (dbState.lastQuestRefresh !== undefined)
        next.lastQuestRefresh = dbState.lastQuestRefresh;
      world.set(Quests, next);
    }
    if (dbState.questChainState !== undefined) {
      world.set(
        QuestChains,
        dbState.questChainState as Parameters<
          typeof world.set<typeof QuestChains>
        >[1],
      );
    }
    if (dbState.resources !== undefined)
      world.set(Resources, dbState.resources);
    if (dbState.lifetimeResources !== undefined)
      world.set(LifetimeResources, dbState.lifetimeResources);
    if (dbState.seeds !== undefined) world.set(Seeds, dbState.seeds);
    if (dbState.achievements !== undefined)
      world.set(Achievements, { items: dbState.achievements });
    if (dbState.stamina !== undefined || dbState.maxStamina !== undefined) {
      const player = world.queryFirst(IsPlayer, FarmerState);
      if (player) {
        const cur = player.get(FarmerState);
        player.set(FarmerState, {
          stamina: dbState.stamina ?? cur?.stamina ?? 100,
          maxStamina: dbState.maxStamina ?? cur?.maxStamina ?? 100,
          hp: cur?.hp ?? 100,
          maxHp: cur?.maxHp ?? 100,
        });
      }
    }
    if (dbState.gridSize !== undefined)
      world.set(Grid, { gridSize: dbState.gridSize });
    const meta = world.get(WorldMeta);
    if (meta) {
      const next = { ...meta };
      if (dbState.currentZoneId !== undefined)
        next.currentZoneId = dbState.currentZoneId;
      if (dbState.worldSeed !== undefined) next.worldSeed = dbState.worldSeed;
      if (dbState.discoveredZones !== undefined)
        next.discoveredZones = dbState.discoveredZones;
      world.set(WorldMeta, next);
    }
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
    const codex = world.get(SpeciesProgressTrait);
    if (
      codex &&
      (dbState.speciesProgress !== undefined ||
        dbState.pendingCodexUnlocks !== undefined)
    ) {
      const next = { ...codex };
      if (dbState.speciesProgress !== undefined)
        next.speciesProgress =
          dbState.speciesProgress as typeof codex.speciesProgress;
      if (dbState.pendingCodexUnlocks !== undefined)
        next.pendingCodexUnlocks = dbState.pendingCodexUnlocks;
      world.set(SpeciesProgressTrait, next);
    }
  },
}));

export const actions = () => gameActions(koota);
