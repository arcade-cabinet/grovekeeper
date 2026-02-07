/**
 * Database query helpers for hydrating and persisting the game store.
 *
 * hydrateGameStore() — reads all SQLite tables → returns partial GameState
 * persistGameStore() — reads current Zustand state → writes to SQLite tables
 * saveGroveToDb() / loadGroveFromDb() — ECS tree/tile serialization via SQLite
 */
import { getDb } from "./client";
import * as schema from "./schema";
import type { ResourceType } from "../game/constants/resources";
import type { Season } from "../game/systems/time";

// ─── Types ────────────────────────────────────────────────────
export interface HydratedGameState {
  difficulty: string;
  permadeath: boolean;
  level: number;
  xp: number;
  coins: number;
  stamina: number;
  maxStamina: number;
  selectedTool: string;
  selectedSpecies: string;
  gridSize: number;
  prestigeCount: number;
  activeBorderCosmetic: string | null;
  resources: Record<ResourceType, number>;
  lifetimeResources: Record<ResourceType, number>;
  seeds: Record<string, number>;
  unlockedTools: string[];
  unlockedSpecies: string[];
  achievements: string[];
  treesPlanted: number;
  treesMatured: number;
  treesHarvested: number;
  treesWatered: number;
  seasonsExperienced: string[];
  speciesPlanted: string[];
  toolUseCounts: Record<string, number>;
  wildTreesHarvested: number;
  wildTreesRegrown: number;
  visitedZoneTypes: string[];
  treesPlantedInSpring: number;
  treesHarvestedInAutumn: number;
  wildSpeciesHarvested: string[];
  completedQuestIds: string[];
  completedGoalIds: string[];
  lastQuestRefresh: number;
  gameTimeMicroseconds: number;
  currentSeason: Season;
  currentDay: number;
  worldSeed: string;
  discoveredZones: string[];
  currentZoneId: string;
  hasSeenRules: boolean;
  hapticsEnabled: boolean;
  soundEnabled: boolean;
  toolUpgrades: Record<string, number>;
  placedStructures: { templateId: string; worldX: number; worldZ: number }[];
  groveData: { trees: SerializedTreeDb[]; playerPosition: { x: number; z: number } } | null;
}

export interface SerializedTreeDb {
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

// ─── Hydrate ──────────────────────────────────────────────────

/**
 * Read all SQLite tables and build the game state object.
 */
export function hydrateGameStore(): HydratedGameState {
  const { db } = getDb();

  // save_config
  const config = db.select().from(schema.saveConfig).all()[0];

  // player
  const p = db.select().from(schema.player).all()[0];

  // resources
  const resourceRows = db.select().from(schema.resources).all();
  const resources: Record<string, number> = { timber: 0, sap: 0, fruit: 0, acorns: 0 };
  const lifetimeResources: Record<string, number> = { timber: 0, sap: 0, fruit: 0, acorns: 0 };
  for (const r of resourceRows) {
    resources[r.type] = r.current;
    lifetimeResources[r.type] = r.lifetime;
  }

  // seeds
  const seedRows = db.select().from(schema.seeds).all();
  const seedsMap: Record<string, number> = {};
  for (const s of seedRows) {
    seedsMap[s.speciesId] = s.amount;
  }

  // unlocks
  const unlockRows = db.select().from(schema.unlocks).all();
  const unlockedTools: string[] = [];
  const unlockedSpecies: string[] = [];
  for (const u of unlockRows) {
    if (u.type === "tool") unlockedTools.push(u.itemId);
    else if (u.type === "species") unlockedSpecies.push(u.itemId);
  }

  // achievements
  const achievementRows = db.select().from(schema.achievements).all();
  const achievementIds = achievementRows.map((a) => a.achievementId);

  // world_state
  const ws = db.select().from(schema.worldState).all()[0];

  // time_state
  const ts = db.select().from(schema.timeState).all()[0];

  // tracking
  const tr = db.select().from(schema.tracking).all()[0];

  // settings
  const st = db.select().from(schema.settings).all()[0];

  // tool_upgrades
  const tuRows = db.select().from(schema.toolUpgrades).all();
  const toolUpgrades: Record<string, number> = {};
  for (const tu of tuRows) {
    toolUpgrades[tu.toolId] = tu.tier;
  }

  // structures
  const structRows = db.select().from(schema.structures).all();
  const placedStructures = structRows.map((s) => ({
    templateId: s.templateId,
    worldX: s.worldX,
    worldZ: s.worldZ,
  }));

  // Build groveData from tree/position tables
  const treeRows = db.select().from(schema.trees).all();
  const groveData = treeRows.length > 0
    ? {
        trees: treeRows.map((t) => ({
          speciesId: t.speciesId,
          gridX: t.gridX,
          gridZ: t.gridZ,
          stage: t.stage as 0 | 1 | 2 | 3 | 4,
          progress: t.progress,
          watered: Boolean(t.watered),
          totalGrowthTime: t.totalGrowthTime,
          plantedAt: t.plantedAt,
          meshSeed: t.meshSeed,
        })),
        playerPosition: { x: ws?.playerPosX ?? 6, z: ws?.playerPosZ ?? 6 },
      }
    : null;

  return {
    difficulty: config?.difficulty ?? "normal",
    permadeath: Boolean(config?.permadeath ?? false),
    level: p?.level ?? 1,
    xp: p?.xp ?? 0,
    coins: p?.coins ?? 100,
    stamina: p?.stamina ?? 100,
    maxStamina: p?.maxStamina ?? 100,
    selectedTool: p?.selectedTool ?? "trowel",
    selectedSpecies: p?.selectedSpecies ?? "white-oak",
    gridSize: p?.gridSize ?? 12,
    prestigeCount: p?.prestigeCount ?? 0,
    activeBorderCosmetic: p?.activeBorderCosmetic ?? null,
    resources: resources as Record<ResourceType, number>,
    lifetimeResources: lifetimeResources as Record<ResourceType, number>,
    seeds: seedsMap,
    unlockedTools,
    unlockedSpecies,
    achievements: achievementIds,
    treesPlanted: tr?.treesPlanted ?? 0,
    treesMatured: tr?.treesMatured ?? 0,
    treesHarvested: tr?.treesHarvested ?? 0,
    treesWatered: tr?.treesWatered ?? 0,
    seasonsExperienced: parseJson(tr?.seasonsExperiencedJson, []),
    speciesPlanted: parseJson(tr?.speciesPlantedJson, []),
    toolUseCounts: parseJson(tr?.toolUseCountsJson, {}),
    wildTreesHarvested: tr?.wildTreesHarvested ?? 0,
    wildTreesRegrown: tr?.wildTreesRegrown ?? 0,
    visitedZoneTypes: parseJson(tr?.visitedZoneTypesJson, []),
    treesPlantedInSpring: tr?.treesPlantedInSpring ?? 0,
    treesHarvestedInAutumn: tr?.treesHarvestedInAutumn ?? 0,
    wildSpeciesHarvested: parseJson(tr?.wildSpeciesHarvestedJson, []),
    completedQuestIds: parseJson(tr?.completedQuestIdsJson, []),
    completedGoalIds: parseJson(tr?.completedGoalIdsJson, []),
    lastQuestRefresh: tr?.lastQuestRefresh ?? 0,
    gameTimeMicroseconds: ts?.gameTimeMicroseconds ?? 0,
    currentSeason: (ts?.season ?? "spring") as Season,
    currentDay: ts?.day ?? 1,
    worldSeed: ws?.worldSeed ?? "",
    discoveredZones: parseJson(ws?.discoveredZonesJson, ["starting-grove"]),
    currentZoneId: ws?.currentZoneId ?? "starting-grove",
    hasSeenRules: Boolean(st?.hasSeenRules ?? false),
    hapticsEnabled: st ? Boolean(st.hapticsEnabled) : true,
    soundEnabled: st ? Boolean(st.soundEnabled) : true,
    toolUpgrades,
    placedStructures,
    groveData,
  };
}

// ─── Persist ──────────────────────────────────────────────────

/**
 * Write the current game state to SQLite tables.
 * Uses upsert pattern: delete all rows, re-insert.
 * This is fast for small singleton tables in an in-memory SQLite.
 */
// biome-ignore lint/suspicious/noExplicitAny: state is an arbitrary Zustand snapshot with heterogeneous value types
export function persistGameStore(state: Record<string, any>): void {
  const { db, sqlDb } = getDb();

  // Use a transaction for atomicity
  sqlDb.run("BEGIN TRANSACTION");
  try {
    persistPlayer(db, sqlDb, state);
    persistResources(db, sqlDb, state);
    persistUnlocks(db, sqlDb, state);
    persistWorldAndTime(db, sqlDb, state);
    persistTracking(db, sqlDb, state);
    persistSettingsAndUpgrades(db, sqlDb, state);
    persistStructures(db, sqlDb, state);

    sqlDb.run("COMMIT");
  } catch (e) {
    sqlDb.run("ROLLBACK");
    throw e;
  }
}

// biome-ignore lint/suspicious/noExplicitAny: state is an arbitrary Zustand snapshot
function persistPlayer(db: ReturnType<typeof getDb>["db"], sqlDb: ReturnType<typeof getDb>["sqlDb"], state: Record<string, any>): void {
  sqlDb.run("DELETE FROM player");
  db.insert(schema.player).values({
    level: state.level as number,
    xp: state.xp as number,
    coins: state.coins as number,
    stamina: state.stamina as number,
    maxStamina: state.maxStamina as number,
    selectedTool: state.selectedTool as string,
    selectedSpecies: state.selectedSpecies as string,
    gridSize: state.gridSize as number,
    prestigeCount: state.prestigeCount as number,
    activeBorderCosmetic: (state.activeBorderCosmetic as string | null) ?? null,
  }).run();
}

// biome-ignore lint/suspicious/noExplicitAny: state is an arbitrary Zustand snapshot
function persistResources(db: ReturnType<typeof getDb>["db"], sqlDb: ReturnType<typeof getDb>["sqlDb"], state: Record<string, any>): void {
  sqlDb.run("DELETE FROM resources");
  const resources = state.resources as Record<string, number>;
  const lifetimeResources = state.lifetimeResources as Record<string, number>;
  for (const type of ["timber", "sap", "fruit", "acorns"]) {
    db.insert(schema.resources).values({
      type,
      current: resources?.[type] ?? 0,
      lifetime: lifetimeResources?.[type] ?? 0,
    }).run();
  }

  sqlDb.run("DELETE FROM seeds");
  const seeds = state.seeds as Record<string, number>;
  if (seeds) {
    for (const [speciesId, amount] of Object.entries(seeds)) {
      if (amount > 0) {
        db.insert(schema.seeds).values({ speciesId, amount }).run();
      }
    }
  }
}

// biome-ignore lint/suspicious/noExplicitAny: state is an arbitrary Zustand snapshot
function persistUnlocks(db: ReturnType<typeof getDb>["db"], sqlDb: ReturnType<typeof getDb>["sqlDb"], state: Record<string, any>): void {
  sqlDb.run("DELETE FROM unlocks");
  const unlockedTools = state.unlockedTools as string[];
  if (unlockedTools) {
    for (const toolId of unlockedTools) {
      db.insert(schema.unlocks).values({ type: "tool", itemId: toolId }).run();
    }
  }
  const unlockedSpecies = state.unlockedSpecies as string[];
  if (unlockedSpecies) {
    for (const speciesId of unlockedSpecies) {
      db.insert(schema.unlocks).values({ type: "species", itemId: speciesId }).run();
    }
  }

  sqlDb.run("DELETE FROM achievements");
  const achievements = state.achievements as string[];
  if (achievements) {
    for (const id of achievements) {
      db.insert(schema.achievements).values({ achievementId: id }).run();
    }
  }
}

// biome-ignore lint/suspicious/noExplicitAny: state is an arbitrary Zustand snapshot
function persistWorldAndTime(db: ReturnType<typeof getDb>["db"], sqlDb: ReturnType<typeof getDb>["sqlDb"], state: Record<string, any>): void {
  sqlDb.run("DELETE FROM world_state");
  const groveData = state.groveData as { playerPosition?: { x: number; z: number } } | null;
  db.insert(schema.worldState).values({
    worldSeed: (state.worldSeed as string) ?? "",
    discoveredZonesJson: JSON.stringify(state.discoveredZones ?? ["starting-grove"]),
    currentZoneId: (state.currentZoneId as string) ?? "starting-grove",
    playerPosX: groveData?.playerPosition?.x ?? 6,
    playerPosZ: groveData?.playerPosition?.z ?? 6,
  }).run();

  sqlDb.run("DELETE FROM time_state");
  db.insert(schema.timeState).values({
    gameTimeMicroseconds: (state.gameTimeMicroseconds as number) ?? 0,
    season: (state.currentSeason as string) ?? "spring",
    day: (state.currentDay as number) ?? 1,
  }).run();
}

// biome-ignore lint/suspicious/noExplicitAny: state is an arbitrary Zustand snapshot
function persistTracking(db: ReturnType<typeof getDb>["db"], sqlDb: ReturnType<typeof getDb>["sqlDb"], state: Record<string, any>): void {
  sqlDb.run("DELETE FROM tracking");
  db.insert(schema.tracking).values({
    treesPlanted: (state.treesPlanted as number) ?? 0,
    treesMatured: (state.treesMatured as number) ?? 0,
    treesHarvested: (state.treesHarvested as number) ?? 0,
    treesWatered: (state.treesWatered as number) ?? 0,
    seasonsExperiencedJson: JSON.stringify(state.seasonsExperienced ?? []),
    speciesPlantedJson: JSON.stringify(state.speciesPlanted ?? []),
    toolUseCountsJson: JSON.stringify(state.toolUseCounts ?? {}),
    wildTreesHarvested: (state.wildTreesHarvested as number) ?? 0,
    wildTreesRegrown: (state.wildTreesRegrown as number) ?? 0,
    visitedZoneTypesJson: JSON.stringify(state.visitedZoneTypes ?? []),
    treesPlantedInSpring: (state.treesPlantedInSpring as number) ?? 0,
    treesHarvestedInAutumn: (state.treesHarvestedInAutumn as number) ?? 0,
    wildSpeciesHarvestedJson: JSON.stringify(state.wildSpeciesHarvested ?? []),
    completedQuestIdsJson: JSON.stringify(state.completedQuestIds ?? []),
    completedGoalIdsJson: JSON.stringify(state.completedGoalIds ?? []),
    lastQuestRefresh: (state.lastQuestRefresh as number) ?? 0,
  }).run();
}

// biome-ignore lint/suspicious/noExplicitAny: state is an arbitrary Zustand snapshot
function persistSettingsAndUpgrades(db: ReturnType<typeof getDb>["db"], sqlDb: ReturnType<typeof getDb>["sqlDb"], state: Record<string, any>): void {
  sqlDb.run("DELETE FROM settings");
  db.insert(schema.settings).values({
    hasSeenRules: (state.hasSeenRules as boolean) ?? false,
    hapticsEnabled: (state.hapticsEnabled as boolean) ?? true,
    soundEnabled: (state.soundEnabled as boolean) ?? true,
  }).run();

  sqlDb.run("DELETE FROM tool_upgrades");
  const toolUpgrades = state.toolUpgrades as Record<string, number>;
  if (toolUpgrades) {
    for (const [toolId, tier] of Object.entries(toolUpgrades)) {
      if (tier > 0) {
        db.insert(schema.toolUpgrades).values({ toolId, tier }).run();
      }
    }
  }
}

// biome-ignore lint/suspicious/noExplicitAny: state is an arbitrary Zustand snapshot
function persistStructures(db: ReturnType<typeof getDb>["db"], sqlDb: ReturnType<typeof getDb>["sqlDb"], state: Record<string, any>): void {
  sqlDb.run("DELETE FROM structures");
  const placedStructures = state.placedStructures as { templateId: string; worldX: number; worldZ: number }[];
  if (placedStructures) {
    for (const struct of placedStructures) {
      db.insert(schema.structures).values({
        templateId: struct.templateId,
        worldX: struct.worldX,
        worldZ: struct.worldZ,
      }).run();
    }
  }
}

// ─── Grove (ECS trees) ───────────────────────────────────────

/**
 * Save tree data from the ECS to the trees table.
 */
export function saveGroveToDb(
  treesData: SerializedTreeDb[],
  playerPos: { x: number; z: number },
): void {
  const { db, sqlDb } = getDb();

  sqlDb.run("BEGIN TRANSACTION");
  try {
    sqlDb.run("DELETE FROM trees");
    for (const t of treesData) {
      db.insert(schema.trees).values({
        speciesId: t.speciesId,
        gridX: t.gridX,
        gridZ: t.gridZ,
        stage: t.stage,
        progress: t.progress,
        watered: t.watered,
        totalGrowthTime: t.totalGrowthTime,
        plantedAt: t.plantedAt,
        meshSeed: t.meshSeed,
      }).run();
    }

    // Update player position in world_state
    sqlDb.run(
      "UPDATE world_state SET player_pos_x = ?, player_pos_z = ?",
      [playerPos.x, playerPos.z],
    );

    sqlDb.run("COMMIT");
  } catch (e) {
    sqlDb.run("ROLLBACK");
    throw e;
  }
}

/**
 * Load tree data from the trees table.
 */
export function loadGroveFromDb(): { trees: SerializedTreeDb[]; playerPosition: { x: number; z: number } } | null {
  const { db } = getDb();

  const treeRows = db.select().from(schema.trees).all();
  if (treeRows.length === 0) return null;

  const ws = db.select().from(schema.worldState).all()[0];

  return {
    trees: treeRows.map((t) => ({
      speciesId: t.speciesId,
      gridX: t.gridX,
      gridZ: t.gridZ,
      stage: t.stage as 0 | 1 | 2 | 3 | 4,
      progress: t.progress,
      watered: Boolean(t.watered),
      totalGrowthTime: t.totalGrowthTime,
      plantedAt: t.plantedAt,
      meshSeed: t.meshSeed,
    })),
    playerPosition: {
      x: ws?.playerPosX ?? 6,
      z: ws?.playerPosZ ?? 6,
    },
  };
}

// ─── New Game Setup ──────────────────────────────────────────

/**
 * Initialize the database for a new game with the chosen difficulty.
 */
export function setupNewGame(
  difficulty: string,
  permadeath: boolean,
  startingResources: Record<string, number>,
  startingSeeds: Record<string, number>,
): void {
  const { db, sqlDb } = getDb();

  sqlDb.run("BEGIN TRANSACTION");
  try {
    // Clear all existing data (hardcoded table names — not user input)
    sqlDb.run("DELETE FROM save_config");
    sqlDb.run("DELETE FROM player");
    sqlDb.run("DELETE FROM resources");
    sqlDb.run("DELETE FROM seeds");
    sqlDb.run("DELETE FROM unlocks");
    sqlDb.run("DELETE FROM achievements");
    sqlDb.run("DELETE FROM trees");
    sqlDb.run("DELETE FROM grid_cells");
    sqlDb.run("DELETE FROM structures");
    sqlDb.run("DELETE FROM quests");
    sqlDb.run("DELETE FROM quest_goals");
    sqlDb.run("DELETE FROM world_state");
    sqlDb.run("DELETE FROM time_state");
    sqlDb.run("DELETE FROM tracking");
    sqlDb.run("DELETE FROM settings");
    sqlDb.run("DELETE FROM tool_upgrades");

    // save_config (immutable after creation)
    db.insert(schema.saveConfig).values({
      difficulty,
      permadeath,
      version: 1,
      createdAt: Date.now(),
    }).run();

    // player
    db.insert(schema.player).values({
      level: 1,
      xp: 0,
      coins: 100,
      stamina: 100,
      maxStamina: 100,
    }).run();

    // resources
    for (const type of ["timber", "sap", "fruit", "acorns"]) {
      db.insert(schema.resources).values({
        type,
        current: startingResources[type] ?? 0,
        lifetime: 0,
      }).run();
    }

    // seeds
    for (const [speciesId, amount] of Object.entries(startingSeeds)) {
      if (amount > 0) {
        db.insert(schema.seeds).values({ speciesId, amount }).run();
      }
    }

    // default unlocks
    db.insert(schema.unlocks).values({ type: "tool", itemId: "trowel" }).run();
    db.insert(schema.unlocks).values({ type: "tool", itemId: "watering-can" }).run();
    db.insert(schema.unlocks).values({ type: "species", itemId: "white-oak" }).run();

    // world_state
    db.insert(schema.worldState).values({}).run();

    // time_state (Spring, Day 1, 8:00 AM)
    const initialGameTime = calculateInitialGameTime();
    db.insert(schema.timeState).values({
      gameTimeMicroseconds: initialGameTime,
      season: "spring",
      day: 1,
    }).run();

    // tracking
    db.insert(schema.tracking).values({}).run();

    // settings
    db.insert(schema.settings).values({}).run();

    sqlDb.run("COMMIT");
  } catch (e) {
    sqlDb.run("ROLLBACK");
    throw e;
  }
}

function calculateInitialGameTime(): number {
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

  const totalDays = ((year - 1) * monthsPerYear * daysPerMonth) +
                   ((month - 1) * daysPerMonth) +
                   (day - 1);
  const totalHours = totalDays * hoursPerDay + hours;
  const totalMinutes = totalHours * minutesPerHour;
  const totalSeconds = totalMinutes * secondsPerMinute;
  return totalSeconds * microsecondsPerSecond;
}

// ─── Helpers ──────────────────────────────────────────────────
function parseJson<T>(raw: string | undefined | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}
