/**
 * Database query helpers for hydrating and persisting the game store.
 *
 * hydrateGameStore() -- reads all SQLite tables -> returns partial GameState
 * persistGameStore() -- reads current Zustand state -> writes to SQLite tables
 * saveGroveToDb() / loadGroveFromDb() -- ECS tree/tile serialization via SQLite
 * setupNewGame() -- initialize a fresh game in the database
 *
 * All functions are async and call getDb(), returning early / no-op if null
 * (web fallback where expo-sqlite may not be available).
 */
import { getDb } from "./client";
import * as schema from "./schema";
import type { ResourceType } from "@/game/config/resources";
import type { Season } from "@/game/systems/time";

// --- Types ---

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

// --- Hydrate ---

/**
 * Read all SQLite tables and build the game state object.
 * Returns null if the database is not available.
 */
export async function hydrateGameStore(): Promise<HydratedGameState | null> {
  const db = getDb();
  if (!db) return null;

  // save_config
  const configRows = await db.select().from(schema.saveConfig);
  const config = configRows[0];

  // player
  const playerRows = await db.select().from(schema.player);
  const p = playerRows[0];

  // resources
  const resourceRows = await db.select().from(schema.resources);
  const rsc: Record<string, number> = { timber: 0, sap: 0, fruit: 0, acorns: 0 };
  const lifetimeRsc: Record<string, number> = { timber: 0, sap: 0, fruit: 0, acorns: 0 };
  for (const r of resourceRows) {
    rsc[r.type] = r.current;
    lifetimeRsc[r.type] = r.lifetime;
  }

  // seeds
  const seedRows = await db.select().from(schema.seeds);
  const seedsMap: Record<string, number> = {};
  for (const s of seedRows) {
    seedsMap[s.speciesId] = s.amount;
  }

  // unlocks
  const unlockRows = await db.select().from(schema.unlocks);
  const unlockedTools: string[] = [];
  const unlockedSpecies: string[] = [];
  for (const u of unlockRows) {
    if (u.type === "tool") unlockedTools.push(u.itemId);
    else if (u.type === "species") unlockedSpecies.push(u.itemId);
  }

  // achievements
  const achievementRows = await db.select().from(schema.achievements);
  const achievementIds = achievementRows.map((a) => a.achievementId);

  // world_state
  const wsRows = await db.select().from(schema.worldState);
  const ws = wsRows[0];

  // time_state
  const tsRows = await db.select().from(schema.timeState);
  const ts = tsRows[0];

  // tracking
  const trRows = await db.select().from(schema.tracking);
  const tr = trRows[0];

  // settings
  const stRows = await db.select().from(schema.settings);
  const st = stRows[0];

  // tool_upgrades
  const tuRows = await db.select().from(schema.toolUpgrades);
  const toolUpgradesMap: Record<string, number> = {};
  for (const tu of tuRows) {
    toolUpgradesMap[tu.toolId] = tu.tier;
  }

  // structures
  const structRows = await db.select().from(schema.structures);
  const placedStructures = structRows.map((s) => ({
    templateId: s.templateId,
    worldX: s.worldX,
    worldZ: s.worldZ,
  }));

  // Build groveData from tree/position tables
  const treeRows = await db.select().from(schema.trees);
  const groveData =
    treeRows.length > 0
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
    resources: rsc as Record<ResourceType, number>,
    lifetimeResources: lifetimeRsc as Record<ResourceType, number>,
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
    toolUpgrades: toolUpgradesMap,
    placedStructures,
    groveData,
  };
}

// --- Persist ---

/**
 * Write the current game state to SQLite tables.
 * Uses upsert pattern: delete all rows, re-insert.
 */
// biome-ignore lint/suspicious/noExplicitAny: state is an arbitrary Zustand snapshot with heterogeneous value types
export async function persistGameStore(state: Record<string, any>): Promise<void> {
  const db = getDb();
  if (!db) return;

  // expo-sqlite drizzle supports transactions via db.transaction()
  await db.transaction(async (tx) => {
    await persistPlayer(tx, state);
    await persistResources(tx, state);
    await persistUnlocks(tx, state);
    await persistWorldAndTime(tx, state);
    await persistTracking(tx, state);
    await persistSettingsAndUpgrades(tx, state);
    await persistStructures(tx, state);
  });
}

// biome-ignore lint/suspicious/noExplicitAny: transaction type + state snapshot
async function persistPlayer(tx: any, state: Record<string, any>): Promise<void> {
  await tx.delete(schema.player);
  await tx.insert(schema.player).values({
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
  });
}

// biome-ignore lint/suspicious/noExplicitAny: transaction type + state snapshot
async function persistResources(tx: any, state: Record<string, any>): Promise<void> {
  await tx.delete(schema.resources);
  const rsc = state.resources as Record<string, number>;
  const lifetimeRsc = state.lifetimeResources as Record<string, number>;
  for (const type of ["timber", "sap", "fruit", "acorns"]) {
    await tx.insert(schema.resources).values({
      type,
      current: rsc?.[type] ?? 0,
      lifetime: lifetimeRsc?.[type] ?? 0,
    });
  }

  await tx.delete(schema.seeds);
  const seedsData = state.seeds as Record<string, number>;
  if (seedsData) {
    for (const [speciesId, amount] of Object.entries(seedsData)) {
      if (amount > 0) {
        await tx.insert(schema.seeds).values({ speciesId, amount });
      }
    }
  }
}

// biome-ignore lint/suspicious/noExplicitAny: transaction type + state snapshot
async function persistUnlocks(tx: any, state: Record<string, any>): Promise<void> {
  await tx.delete(schema.unlocks);
  const unlockedTools = state.unlockedTools as string[];
  if (unlockedTools) {
    for (const toolId of unlockedTools) {
      await tx.insert(schema.unlocks).values({ type: "tool", itemId: toolId });
    }
  }
  const unlockedSpecies = state.unlockedSpecies as string[];
  if (unlockedSpecies) {
    for (const speciesId of unlockedSpecies) {
      await tx.insert(schema.unlocks).values({ type: "species", itemId: speciesId });
    }
  }

  await tx.delete(schema.achievements);
  const achievementsData = state.achievements as string[];
  if (achievementsData) {
    for (const id of achievementsData) {
      await tx.insert(schema.achievements).values({ achievementId: id });
    }
  }
}

// biome-ignore lint/suspicious/noExplicitAny: transaction type + state snapshot
async function persistWorldAndTime(tx: any, state: Record<string, any>): Promise<void> {
  await tx.delete(schema.worldState);
  const groveData = state.groveData as { playerPosition?: { x: number; z: number } } | null;
  await tx.insert(schema.worldState).values({
    worldSeed: (state.worldSeed as string) ?? "",
    discoveredZonesJson: JSON.stringify(state.discoveredZones ?? ["starting-grove"]),
    currentZoneId: (state.currentZoneId as string) ?? "starting-grove",
    playerPosX: groveData?.playerPosition?.x ?? 6,
    playerPosZ: groveData?.playerPosition?.z ?? 6,
  });

  await tx.delete(schema.timeState);
  await tx.insert(schema.timeState).values({
    gameTimeMicroseconds: (state.gameTimeMicroseconds as number) ?? 0,
    season: (state.currentSeason as string) ?? "spring",
    day: (state.currentDay as number) ?? 1,
  });
}

// biome-ignore lint/suspicious/noExplicitAny: transaction type + state snapshot
async function persistTracking(tx: any, state: Record<string, any>): Promise<void> {
  await tx.delete(schema.tracking);
  await tx.insert(schema.tracking).values({
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
  });
}

// biome-ignore lint/suspicious/noExplicitAny: transaction type + state snapshot
async function persistSettingsAndUpgrades(tx: any, state: Record<string, any>): Promise<void> {
  await tx.delete(schema.settings);
  await tx.insert(schema.settings).values({
    hasSeenRules: (state.hasSeenRules as boolean) ?? false,
    hapticsEnabled: (state.hapticsEnabled as boolean) ?? true,
    soundEnabled: (state.soundEnabled as boolean) ?? true,
  });

  await tx.delete(schema.toolUpgrades);
  const toolUpgradesData = state.toolUpgrades as Record<string, number>;
  if (toolUpgradesData) {
    for (const [toolId, tier] of Object.entries(toolUpgradesData)) {
      if (tier > 0) {
        await tx.insert(schema.toolUpgrades).values({ toolId, tier });
      }
    }
  }
}

// biome-ignore lint/suspicious/noExplicitAny: transaction type + state snapshot
async function persistStructures(tx: any, state: Record<string, any>): Promise<void> {
  await tx.delete(schema.structures);
  const placedStructures = state.placedStructures as
    | { templateId: string; worldX: number; worldZ: number }[]
    | undefined;
  if (placedStructures) {
    for (const struct of placedStructures) {
      await tx.insert(schema.structures).values({
        templateId: struct.templateId,
        worldX: struct.worldX,
        worldZ: struct.worldZ,
      });
    }
  }
}

// --- Grove (ECS trees) ---

/**
 * Save tree data from the ECS to the trees table.
 */
export async function saveGroveToDb(
  treesData: SerializedTreeDb[],
  playerPos: { x: number; z: number },
): Promise<void> {
  const db = getDb();
  if (!db) return;

  // Read existing world_state BEFORE the transaction deletes it
  const wsRows = await db.select().from(schema.worldState);
  const existingWs = wsRows[0];

  await db.transaction(async (tx) => {
    await tx.delete(schema.trees);
    for (const t of treesData) {
      await tx.insert(schema.trees).values({
        speciesId: t.speciesId,
        gridX: t.gridX,
        gridZ: t.gridZ,
        stage: t.stage,
        progress: t.progress,
        watered: t.watered,
        totalGrowthTime: t.totalGrowthTime,
        plantedAt: t.plantedAt,
        meshSeed: t.meshSeed,
      });
    }

    // Re-insert world_state with updated player position
    await tx.delete(schema.worldState);
    await tx.insert(schema.worldState).values({
      worldSeed: existingWs?.worldSeed ?? "",
      discoveredZonesJson: existingWs?.discoveredZonesJson ?? '["starting-grove"]',
      currentZoneId: existingWs?.currentZoneId ?? "starting-grove",
      playerPosX: playerPos.x,
      playerPosZ: playerPos.z,
    });
  });
}

/**
 * Load tree data from the trees table.
 */
export async function loadGroveFromDb(): Promise<{
  trees: SerializedTreeDb[];
  playerPosition: { x: number; z: number };
} | null> {
  const db = getDb();
  if (!db) return null;

  const treeRows = await db.select().from(schema.trees);
  if (treeRows.length === 0) return null;

  const wsRows = await db.select().from(schema.worldState);
  const ws = wsRows[0];

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

// --- New Game Setup ---

/**
 * Initialize the database for a new game with the chosen difficulty.
 */
export async function setupNewGame(
  difficulty: string,
  permadeath: boolean,
  startingResources: Record<string, number>,
  startingSeeds: Record<string, number>,
): Promise<void> {
  const db = getDb();
  if (!db) return;

  await db.transaction(async (tx) => {
    // Clear all existing data
    await tx.delete(schema.saveConfig);
    await tx.delete(schema.player);
    await tx.delete(schema.resources);
    await tx.delete(schema.seeds);
    await tx.delete(schema.unlocks);
    await tx.delete(schema.achievements);
    await tx.delete(schema.trees);
    await tx.delete(schema.gridCells);
    await tx.delete(schema.structures);
    await tx.delete(schema.quests);
    await tx.delete(schema.questGoals);
    await tx.delete(schema.worldState);
    await tx.delete(schema.timeState);
    await tx.delete(schema.tracking);
    await tx.delete(schema.settings);
    await tx.delete(schema.toolUpgrades);

    // save_config (immutable after creation)
    await tx.insert(schema.saveConfig).values({
      difficulty,
      permadeath,
      version: 1,
      createdAt: Date.now(),
    });

    // player
    await tx.insert(schema.player).values({
      level: 1,
      xp: 0,
      coins: 100,
      stamina: 100,
      maxStamina: 100,
    });

    // resources
    for (const type of ["timber", "sap", "fruit", "acorns"]) {
      await tx.insert(schema.resources).values({
        type,
        current: startingResources[type] ?? 0,
        lifetime: 0,
      });
    }

    // seeds
    for (const [speciesId, amount] of Object.entries(startingSeeds)) {
      if (amount > 0) {
        await tx.insert(schema.seeds).values({ speciesId, amount });
      }
    }

    // default unlocks
    await tx.insert(schema.unlocks).values({ type: "tool", itemId: "trowel" });
    await tx.insert(schema.unlocks).values({ type: "tool", itemId: "watering-can" });
    await tx.insert(schema.unlocks).values({ type: "species", itemId: "white-oak" });

    // world_state
    await tx.insert(schema.worldState).values({});

    // time_state (Spring, Day 1, 8:00 AM)
    const initialGameTime = calculateInitialGameTime();
    await tx.insert(schema.timeState).values({
      gameTimeMicroseconds: initialGameTime,
      season: "spring",
      day: 1,
    });

    // tracking
    await tx.insert(schema.tracking).values({});

    // settings
    await tx.insert(schema.settings).values({});
  });
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

  const totalDays =
    (year - 1) * monthsPerYear * daysPerMonth + (month - 1) * daysPerMonth + (day - 1);
  const totalHours = totalDays * hoursPerDay + hours;
  const totalMinutes = totalHours * minutesPerHour;
  const totalSeconds = totalMinutes * secondsPerMinute;
  return totalSeconds * microsecondsPerSecond;
}

// --- Helpers ---
function parseJson<T>(raw: string | undefined | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}
