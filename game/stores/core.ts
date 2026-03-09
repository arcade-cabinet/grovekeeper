/**
 * core.ts -- Shared observable state, types, XP formulas, and persistence.
 * All domain action files import gameState$ and getState() from here.
 * Spec §5
 */

import { observable } from "@legendapp/state";
import { emptyResources } from "@/game/config/resources";
import { initializeEventState } from "@/game/events/eventScheduler";
import type { EventState } from "@/game/events/types";
import { initializeChainState } from "@/game/quests/questChainEngine";
import type { QuestChainState } from "@/game/quests/types";
import type { FastTravelPoint } from "@/game/systems/fastTravel";
import { initializeMarketEventState, type MarketEventState } from "@/game/systems/marketEvents";
import type { ActiveQuest } from "@/game/systems/quests";
import type { SpeciesProgress } from "@/game/systems/speciesDiscovery";
import { initializeMarketState, type MarketState } from "@/game/systems/supplyDemand";
import type { Season } from "@/game/systems/time";
import { initializeMerchantState, type MerchantState } from "@/game/systems/travelingMerchant";
import { initialTutorialState, type TutorialState } from "@/game/systems/tutorial";
import { chunkDiffs$ } from "@/game/world/chunkPersistence";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type GameScreen =
  | "menu"
  | "playing"
  | "paused"
  | "seedSelect"
  | "rules"
  | "death"
  | "permadeath";

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
// XP formulas (Spec §3)
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
  const daysPerMonth = 30;
  const monthsPerYear = 12;
  // One game "day" = 600 real seconds (from dayNight.json), not 86400.
  // MICROSECONDS_PER_DAY must match time.ts: dayLengthSeconds * 1_000_000 = 600_000_000.
  const MICROSECONDS_PER_DAY = 600 * 1_000_000;
  const totalDays =
    (year - 1) * monthsPerYear * daysPerMonth + (month - 1) * daysPerMonth + (day - 1);
  // 8:00 AM = 8/24 of a compressed game day
  const hourOffset = (hours / 24) * MICROSECONDS_PER_DAY;
  return totalDays * MICROSECONDS_PER_DAY + hourOffset;
})();

// ---------------------------------------------------------------------------
// Initial state
// ---------------------------------------------------------------------------

export const initialState = {
  screen: "menu" as GameScreen,
  difficulty: "sapling",
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
  placedStructures: [] as { templateId: string; worldX: number; worldZ: number }[],
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
  questChainState: initializeChainState() as QuestChainState,
  marketState: initializeMarketState() as MarketState,
  merchantState: initializeMerchantState() as MerchantState,
  marketEventState: initializeMarketEventState() as MarketEventState,
  eventState: initializeEventState() as EventState,
  speciesProgress: {} as Record<string, SpeciesProgress>,
  pendingCodexUnlocks: [] as string[],
  hasSeenRules: false,
  hapticsEnabled: true,
  soundEnabled: true,
  /** Player-configurable settings. Spec §26. */
  settings: {
    masterVolume: 1.0,
    sfxVolume: 1.0,
    ambientVolume: 0.7,
    drawDistance: 3,
    touchSensitivity: 1.0,
    reducedMotion: false,
  },
  /** Discovered campfire fast travel points. Spec §17.6 */
  discoveredCampfires: [] as FastTravelPoint[],
  /** Chunk fog-of-war discovery map. Spec §17.6 */
  discoveredChunks: {} as Record<string, string>,
  /** Trust/friendship levels per NPC. Spec §15. */
  npcRelationships: {} as Record<string, number>,
  /** Discovered Grovekeeper Spirit IDs. Spec §32.3. */
  discoveredSpiritIds: [] as string[],
  /** Tutorial state. Spec §25.1 */
  tutorialState: initialTutorialState() as TutorialState,
  /** Unix timestamp (ms) of the last successful save. 0 = never saved. Spec §26.3 */
  lastSavedAt: 0,
  /** Current hunger level. Spec §12.2 */
  hunger: 100,
  maxHunger: 100,
  /** Current heart count. Spec §12.3 */
  hearts: 5,
  maxHearts: 5,
  /** Player body temperature in °C. Spec §2.2 */
  bodyTemp: 37.0,
  lastCampfireId: null as string | null,
  lastCampfirePosition: null as { x: number; y: number; z: number } | null,
  activeCraftingStation: null as { type: string; entityId: string } | null,
};

export type GameStateData = typeof initialState;

// ---------------------------------------------------------------------------
// Observable state
// ---------------------------------------------------------------------------

export const gameState$ = observable(structuredClone(initialState));

// ---------------------------------------------------------------------------
// Ephemeral keys (not persisted)
// ---------------------------------------------------------------------------

export const EPHEMERAL_KEYS = new Set([
  "screen",
  "groveData",
  "buildMode",
  "buildTemplateId",
  "activeCraftingStation",
]);

// ---------------------------------------------------------------------------
// Helper: read state without tracking
// ---------------------------------------------------------------------------

export function getState(): GameStateData {
  return gameState$.peek();
}

// ---------------------------------------------------------------------------
// Persistence (call once from app entry point)
// ---------------------------------------------------------------------------

let persistenceInitialized = false;

export async function initPersistence(): Promise<void> {
  if (persistenceInitialized) return;
  persistenceInitialized = true;

  // On web, expo-sqlite/kv-store uses a SharedArrayBuffer + Atomics.wait()
  // bridge to make async OPFS operations appear synchronous. This bridge
  // requires full cross-origin isolation (COOP + COEP headers), which is only
  // provided by coi-serviceworker.js and only AFTER the first page load.
  //
  // Chrome makes a localhost exception for SharedArrayBuffer (typeof !== "undefined")
  // but the Atomics.wait() in the WASM worker still times out without COOP/COEP,
  // producing "Sync operation timeout" unhandled errors in the Expo overlay.
  //
  // Web persistence is handled by the drizzle/expo-sqlite relational path
  // (game/db/client.ts → openDatabaseSync → OPFS async, no sync bridge needed).
  // The usePersistence hook (app/_layout.tsx) calls hydrateGameStore() which
  // uses getDb() and handles the case where the DB is unavailable gracefully.
  // We therefore skip syncObservable entirely on web.
  const { Platform } = await import("react-native");
  if (Platform.OS === "web") {
    return;
  }

  const { syncObservable } = await import("@legendapp/state/sync");
  const { observablePersistSqlite } = await import("@legendapp/state/persist-plugins/expo-sqlite");
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
