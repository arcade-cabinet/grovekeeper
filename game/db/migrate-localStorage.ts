/**
 * One-time migration from localStorage (Zustand persist + grove save)
 * to SQLite tables. Archives the original keys after migration.
 *
 * On native platforms (iOS/Android), this is a no-op since localStorage
 * is not the primary persistence mechanism. On web, it migrates any
 * existing Zustand persist data into the relational SQLite tables.
 */
import { Platform } from "react-native";
import { getDb } from "./client";
import * as schema from "./schema";

const ZUSTAND_KEY = "grove-keeper-save";
const GROVE_KEY = "grovekeeper-grove";

/**
 * Migrate localStorage data into SQLite tables.
 * Returns true if data was found and migrated.
 * No-op on native platforms where localStorage is not used.
 */
export async function migrateFromLocalStorage(): Promise<boolean> {
  // On native, there's no localStorage to migrate from
  if (Platform.OS !== "web") return false;

  const db = getDb();
  if (!db) return false;

  let zustandRaw: string | null = null;
  try {
    zustandRaw = localStorage.getItem(ZUSTAND_KEY);
  } catch {
    // localStorage not available
    return false;
  }

  if (!zustandRaw) return false;

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(zustandRaw);
  } catch {
    return false;
  }

  // Zustand persist stores state under a "state" key
  const s: Record<string, unknown> = (parsed.state as Record<string, unknown>) ?? parsed;
  if (!s || typeof s !== "object") return false;

  await db.transaction(async (tx) => {
    await migrateSaveConfig(tx);
    await migratePlayer(tx, s);
    await migrateResources(tx, s);
    await migrateUnlocks(tx, s);
    await migrateWorldAndTime(tx, s);
    await migrateTracking(tx, s);
    await migrateSettingsAndUpgrades(tx, s);
    await migrateStructures(tx, s);
  });

  archiveLocalStorage(zustandRaw);
  return true;
}

// --- Migration helpers ---

// biome-ignore lint/suspicious/noExplicitAny: drizzle transaction type
async function migrateSaveConfig(tx: any): Promise<void> {
  await tx.insert(schema.saveConfig).values({
    difficulty: "normal",
    permadeath: false,
    version: 1,
    createdAt: Date.now(),
  });
}

// biome-ignore lint/suspicious/noExplicitAny: drizzle transaction type
async function migratePlayer(tx: any, s: Record<string, unknown>): Promise<void> {
  await tx.insert(schema.player).values({
    level: num(s, "level", 1),
    xp: num(s, "xp", 0),
    coins: num(s, "coins", 100),
    stamina: num(s, "stamina", 100),
    maxStamina: num(s, "maxStamina", 100),
    selectedTool: str(s, "selectedTool", "trowel"),
    selectedSpecies: str(s, "selectedSpecies", "white-oak"),
    gridSize: num(s, "gridSize", 12),
    prestigeCount: num(s, "prestigeCount", 0),
    activeBorderCosmetic: str(s, "activeBorderCosmetic", null),
  });
}

// biome-ignore lint/suspicious/noExplicitAny: drizzle transaction type
async function migrateResources(tx: any, s: Record<string, unknown>): Promise<void> {
  const resources = obj(s, "resources") as Record<string, number> | null;
  const lifetimeResources = obj(s, "lifetimeResources") as Record<string, number> | null;
  for (const type of ["timber", "sap", "fruit", "acorns"]) {
    await tx.insert(schema.resources).values({
      type,
      current: resources?.[type] ?? 0,
      lifetime: lifetimeResources?.[type] ?? 0,
    });
  }

  const seedsData = obj(s, "seeds") as Record<string, number> | null;
  if (seedsData) {
    for (const [speciesId, amount] of Object.entries(seedsData)) {
      if (amount > 0) {
        await tx.insert(schema.seeds).values({ speciesId, amount });
      }
    }
  }
}

// biome-ignore lint/suspicious/noExplicitAny: drizzle transaction type
async function migrateUnlocks(tx: any, s: Record<string, unknown>): Promise<void> {
  const unlockedTools = arr(s, "unlockedTools") as string[];
  for (const toolId of unlockedTools) {
    await tx.insert(schema.unlocks).values({ type: "tool", itemId: toolId });
  }
  const unlockedSpecies = arr(s, "unlockedSpecies") as string[];
  for (const speciesId of unlockedSpecies) {
    await tx.insert(schema.unlocks).values({ type: "species", itemId: speciesId });
  }

  const achievementsData = arr(s, "achievements") as string[];
  for (const id of achievementsData) {
    await tx.insert(schema.achievements).values({ achievementId: id });
  }
}

// biome-ignore lint/suspicious/noExplicitAny: drizzle transaction type
async function migrateWorldAndTime(tx: any, s: Record<string, unknown>): Promise<void> {
  const groveData = obj(s, "groveData") as {
    playerPosition?: { x: number; z: number };
  } | null;
  await tx.insert(schema.worldState).values({
    worldSeed: str(s, "worldSeed", ""),
    discoveredZonesJson: JSON.stringify(arr(s, "discoveredZones")),
    currentZoneId: str(s, "currentZoneId", "starting-grove"),
    playerPosX: groveData?.playerPosition?.x ?? 6,
    playerPosZ: groveData?.playerPosition?.z ?? 6,
  });

  await tx.insert(schema.timeState).values({
    gameTimeMicroseconds: num(s, "gameTimeMicroseconds", 0),
    season: str(s, "currentSeason", "spring"),
    day: num(s, "currentDay", 1),
  });
}

// biome-ignore lint/suspicious/noExplicitAny: drizzle transaction type
async function migrateTracking(tx: any, s: Record<string, unknown>): Promise<void> {
  await tx.insert(schema.tracking).values({
    treesPlanted: num(s, "treesPlanted", 0),
    treesMatured: num(s, "treesMatured", 0),
    treesHarvested: num(s, "treesHarvested", 0),
    treesWatered: num(s, "treesWatered", 0),
    seasonsExperiencedJson: JSON.stringify(arr(s, "seasonsExperienced")),
    speciesPlantedJson: JSON.stringify(arr(s, "speciesPlanted")),
    toolUseCountsJson: JSON.stringify(obj(s, "toolUseCounts") ?? {}),
    wildTreesHarvested: num(s, "wildTreesHarvested", 0),
    wildTreesRegrown: num(s, "wildTreesRegrown", 0),
    visitedZoneTypesJson: JSON.stringify(arr(s, "visitedZoneTypes")),
    treesPlantedInSpring: num(s, "treesPlantedInSpring", 0),
    treesHarvestedInAutumn: num(s, "treesHarvestedInAutumn", 0),
    wildSpeciesHarvestedJson: JSON.stringify(arr(s, "wildSpeciesHarvested")),
    completedQuestIdsJson: JSON.stringify(arr(s, "completedQuestIds")),
    completedGoalIdsJson: JSON.stringify(arr(s, "completedGoalIds")),
    lastQuestRefresh: num(s, "lastQuestRefresh", 0),
  });
}

// biome-ignore lint/suspicious/noExplicitAny: drizzle transaction type
async function migrateSettingsAndUpgrades(tx: any, s: Record<string, unknown>): Promise<void> {
  await tx.insert(schema.settings).values({
    hasSeenRules: bool(s, "hasSeenRules", false),
    hapticsEnabled: bool(s, "hapticsEnabled", true),
    soundEnabled: bool(s, "soundEnabled", true),
  });

  const toolUpgradesData = obj(s, "toolUpgrades") as Record<string, number> | null;
  if (toolUpgradesData) {
    for (const [toolId, tier] of Object.entries(toolUpgradesData)) {
      if (tier > 0) {
        await tx.insert(schema.toolUpgrades).values({ toolId, tier });
      }
    }
  }
}

// biome-ignore lint/suspicious/noExplicitAny: drizzle transaction type
async function migrateStructures(tx: any, s: Record<string, unknown>): Promise<void> {
  const placedStructures = arr(s, "placedStructures") as {
    templateId: string;
    worldX: number;
    worldZ: number;
  }[];
  for (const struct of placedStructures) {
    await tx.insert(schema.structures).values({
      templateId: struct.templateId,
      worldX: struct.worldX,
      worldZ: struct.worldZ,
    });
  }
}

function archiveLocalStorage(zustandRaw: string): void {
  try {
    localStorage.setItem(`${ZUSTAND_KEY}-archived`, zustandRaw);
    localStorage.removeItem(ZUSTAND_KEY);
    const groveRaw = localStorage.getItem(GROVE_KEY);
    if (groveRaw) {
      localStorage.setItem(`${GROVE_KEY}-archived`, groveRaw);
      localStorage.removeItem(GROVE_KEY);
    }
  } catch {
    // Non-critical -- ignore storage errors during archival
  }
}

// --- Helpers ---
function num(s: Record<string, unknown>, key: string, fallback: number): number {
  const v = s[key];
  return typeof v === "number" ? v : fallback;
}

function str(s: Record<string, unknown>, key: string, fallback: string | null): string | null {
  const v = s[key];
  return typeof v === "string" ? v : fallback;
}

function bool(s: Record<string, unknown>, key: string, fallback: boolean): boolean {
  const v = s[key];
  return typeof v === "boolean" ? v : fallback;
}

function arr(s: Record<string, unknown>, key: string): unknown[] {
  const v = s[key];
  return Array.isArray(v) ? v : [];
}

function obj(s: Record<string, unknown>, key: string): Record<string, unknown> | null {
  const v = s[key];
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
}
