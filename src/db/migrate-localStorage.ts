/**
 * One-time migration from localStorage (Zustand persist + grove save)
 * to SQLite tables. Archives the original keys after migration.
 */
import type { AppDatabase } from "./client";
import * as schema from "./schema";

const ZUSTAND_KEY = "grove-keeper-save";
const GROVE_KEY = "grovekeeper-grove";

/**
 * Migrate localStorage data into SQLite tables.
 * Returns true if data was found and migrated.
 */
export function migrateFromLocalStorage(db: AppDatabase): boolean {
  const zustandRaw = localStorage.getItem(ZUSTAND_KEY);
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

  // ─── save_config ────────────────────────────────
  db.insert(schema.saveConfig).values({
    difficulty: "normal",
    permadeath: false,
    version: 1,
    createdAt: Date.now(),
  }).run();

  // ─── player ─────────────────────────────────────
  db.insert(schema.player).values({
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
  }).run();

  // ─── resources ──────────────────────────────────
  const resources = obj(s, "resources") as Record<string, number> | null;
  const lifetimeResources = obj(s, "lifetimeResources") as Record<string, number> | null;
  for (const type of ["timber", "sap", "fruit", "acorns"]) {
    db.insert(schema.resources).values({
      type,
      current: resources?.[type] ?? 0,
      lifetime: lifetimeResources?.[type] ?? 0,
    }).run();
  }

  // ─── seeds ──────────────────────────────────────
  const seedsData = obj(s, "seeds") as Record<string, number> | null;
  if (seedsData) {
    for (const [speciesId, amount] of Object.entries(seedsData)) {
      if (amount > 0) {
        db.insert(schema.seeds).values({ speciesId, amount }).run();
      }
    }
  }

  // ─── unlocks ────────────────────────────────────
  const unlockedTools = arr(s, "unlockedTools") as string[];
  for (const toolId of unlockedTools) {
    db.insert(schema.unlocks).values({ type: "tool", itemId: toolId }).run();
  }
  const unlockedSpecies = arr(s, "unlockedSpecies") as string[];
  for (const speciesId of unlockedSpecies) {
    db.insert(schema.unlocks).values({ type: "species", itemId: speciesId }).run();
  }

  // ─── achievements ──────────────────────────────
  const achievementsData = arr(s, "achievements") as string[];
  for (const id of achievementsData) {
    db.insert(schema.achievements).values({ achievementId: id }).run();
  }

  // ─── world_state ───────────────────────────────
  const groveData = obj(s, "groveData") as { playerPosition?: { x: number; z: number } } | null;
  db.insert(schema.worldState).values({
    worldSeed: str(s, "worldSeed", ""),
    discoveredZonesJson: JSON.stringify(arr(s, "discoveredZones")),
    currentZoneId: str(s, "currentZoneId", "starting-grove"),
    playerPosX: groveData?.playerPosition?.x ?? 6,
    playerPosZ: groveData?.playerPosition?.z ?? 6,
  }).run();

  // ─── time_state ────────────────────────────────
  db.insert(schema.timeState).values({
    gameTimeMicroseconds: num(s, "gameTimeMicroseconds", 0),
    season: str(s, "currentSeason", "spring"),
    day: num(s, "currentDay", 1),
  }).run();

  // ─── tracking ──────────────────────────────────
  db.insert(schema.tracking).values({
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
  }).run();

  // ─── settings ──────────────────────────────────
  db.insert(schema.settings).values({
    hasSeenRules: bool(s, "hasSeenRules", false),
    hapticsEnabled: bool(s, "hapticsEnabled", true),
    soundEnabled: bool(s, "soundEnabled", true),
  }).run();

  // ─── tool_upgrades ─────────────────────────────
  const toolUpgradesData = obj(s, "toolUpgrades") as Record<string, number> | null;
  if (toolUpgradesData) {
    for (const [toolId, tier] of Object.entries(toolUpgradesData)) {
      if (tier > 0) {
        db.insert(schema.toolUpgrades).values({ toolId, tier }).run();
      }
    }
  }

  // ─── structures ────────────────────────────────
  const placedStructures = arr(s, "placedStructures") as { templateId: string; worldX: number; worldZ: number }[];
  for (const struct of placedStructures) {
    db.insert(schema.structures).values({
      templateId: struct.templateId,
      worldX: struct.worldX,
      worldZ: struct.worldZ,
    }).run();
  }

  // Archive original localStorage keys (don't delete — safety net)
  try {
    localStorage.setItem(`${ZUSTAND_KEY}-archived`, zustandRaw);
    localStorage.removeItem(ZUSTAND_KEY);
    const groveRaw = localStorage.getItem(GROVE_KEY);
    if (groveRaw) {
      localStorage.setItem(`${GROVE_KEY}-archived`, groveRaw);
      localStorage.removeItem(GROVE_KEY);
    }
  } catch {
    // Non-critical — ignore storage errors during archival
  }

  return true;
}

// ─── Helpers ──────────────────────────────────
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
  return v && typeof v === "object" && !Array.isArray(v) ? v as Record<string, unknown> : null;
}
