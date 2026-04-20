/**
 * Builds a plain-object snapshot of all Koota world state for DB persistence.
 *
 * persistGameStore() expects a `Record<string, unknown>` with fields matching
 * the legacy Zustand store shape. This helper flattens Koota traits into that
 * shape so we can keep `persistGameStore` unchanged while sourcing state from
 * Koota only.
 *
 * Also owns the runtime `groveData` (serialized tree positions + player pos)
 * which used to live on the Zustand store — it's ephemeral save-state and
 * doesn't need its own trait.
 */

import { koota } from "@/koota";
import type { SerializedTreeDb } from "@/db/queries";
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
  Quests,
  Resources,
  Seeds,
  Settings,
  Time,
  ToolUpgrades,
  Tracking,
  WorldMeta,
} from "@/traits";

export interface GroveData {
  trees: SerializedTreeDb[];
  playerPosition: { x: number; z: number };
}

// Module-level groveData holder. Reset on game reset.
let groveData: GroveData | null = null;

export function setGroveData(data: GroveData | null): void {
  groveData = data;
}

export function getGroveData(): GroveData | null {
  return groveData;
}

/**
 * Collect a flat snapshot of Koota world state matching the shape
 * `persistGameStore` / `saveGroveToDb` expect.
 */
export function buildDbSnapshot(): Record<string, unknown> {
  const progress = koota.get(PlayerProgress);
  const resources = koota.get(Resources);
  const lifetime = koota.get(LifetimeResources);
  const seeds = koota.get(Seeds);
  const tracking = koota.get(Tracking);
  const achievements = koota.get(Achievements);
  const quests = koota.get(Quests);
  const grid = koota.get(Grid);
  const build = koota.get(Build);
  const meta = koota.get(WorldMeta);
  const settings = koota.get(Settings);
  const screen = koota.get(GameScreen);
  const difficulty = koota.get(Difficulty);
  const time = koota.get(Time);
  const season = koota.get(CurrentSeason);
  const day = koota.get(CurrentDay);
  const toolUpgrades = koota.get(ToolUpgrades);

  const player = koota.queryFirst(IsPlayer, FarmerState);
  const farmer = player?.get(FarmerState);

  return {
    // Screen / Difficulty
    screen: screen?.value ?? "menu",
    difficulty: difficulty?.id ?? "normal",
    permadeath: difficulty?.permadeath ?? false,

    // Player progress
    level: progress?.level ?? 1,
    xp: progress?.xp ?? 0,
    coins: progress?.coins ?? 0,
    selectedTool: progress?.selectedTool ?? "trowel",
    selectedSpecies: progress?.selectedSpecies ?? "white-oak",
    currentTool: progress?.currentTool ?? "trowel",
    unlockedTools: progress?.unlockedTools ?? ["trowel", "watering-can"],
    unlockedSpecies: progress?.unlockedSpecies ?? ["white-oak"],
    activeBorderCosmetic: progress?.activeBorderCosmetic ?? null,
    prestigeCount: progress?.prestigeCount ?? 0,

    // Resources / Seeds
    resources: resources ?? { timber: 0, sap: 0, fruit: 0, acorns: 0 },
    lifetimeResources: lifetime ?? {
      timber: 0,
      sap: 0,
      fruit: 0,
      acorns: 0,
    },
    seeds: seeds ?? {},

    // Stamina (on player entity)
    stamina: farmer?.stamina ?? 100,
    maxStamina: farmer?.maxStamina ?? 100,

    // Tracking
    treesPlanted: tracking?.treesPlanted ?? 0,
    treesMatured: tracking?.treesMatured ?? 0,
    treesHarvested: tracking?.treesHarvested ?? 0,
    treesWatered: tracking?.treesWatered ?? 0,
    wildTreesHarvested: tracking?.wildTreesHarvested ?? 0,
    wildTreesRegrown: tracking?.wildTreesRegrown ?? 0,
    treesPlantedInSpring: tracking?.treesPlantedInSpring ?? 0,
    treesHarvestedInAutumn: tracking?.treesHarvestedInAutumn ?? 0,
    toolUseCounts: tracking?.toolUseCounts ?? {},
    visitedZoneTypes: tracking?.visitedZoneTypes ?? [],
    wildSpeciesHarvested: tracking?.wildSpeciesHarvested ?? [],
    speciesPlanted: tracking?.speciesPlanted ?? [],
    seasonsExperienced: tracking?.seasonsExperienced ?? [],

    // Achievements
    achievements: achievements ?? [],

    // Quests
    activeQuests: quests?.activeQuests ?? [],
    completedQuestIds: quests?.completedQuestIds ?? [],
    completedGoalIds: quests?.completedGoalIds ?? [],
    lastQuestRefresh: quests?.lastQuestRefresh ?? 0,

    // Time
    gameTimeMicroseconds: time?.gameTimeMicroseconds ?? 0,
    currentSeason: season?.value ?? "spring",
    currentDay: day?.value ?? 1,

    // Grid
    gridSize: grid?.gridSize ?? 12,

    // World / Zone
    currentZoneId: meta?.currentZoneId ?? "starting-grove",
    worldSeed: meta?.worldSeed ?? "",
    discoveredZones: meta?.discoveredZones ?? ["starting-grove"],

    // Build
    buildMode: build?.mode ?? false,
    buildTemplateId: build?.templateId ?? null,
    placedStructures: build?.placedStructures ?? [],

    // Tool upgrades
    toolUpgrades: toolUpgrades ?? {},

    // Settings
    hasSeenRules: settings?.hasSeenRules ?? false,
    hapticsEnabled: settings?.hapticsEnabled ?? true,
    soundEnabled: settings?.soundEnabled ?? true,

    // Ephemeral groveData (not a trait)
    groveData,
  };
}
