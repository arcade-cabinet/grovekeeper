/**
 * Drizzle ORM Schema — All tables for the Grovekeeper save database.
 *
 * 16 tables covering player state, resources, world data, quests,
 * achievements, structures, and forward-compatible columns for
 * survival systems (exposure, building integrity, diseases).
 */
import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";

// ─── save_config ─────────────────────────────────────────────
// Immutable after creation. Locked to chosen difficulty.
export const saveConfig = sqliteTable("save_config", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  difficulty: text("difficulty").notNull().default("normal"),
  permadeath: integer("permadeath", { mode: "boolean" }).notNull().default(false),
  version: integer("version").notNull().default(1),
  createdAt: integer("created_at").notNull().$defaultFn(() => Date.now()),
});

// ─── player ──────────────────────────────────────────────────
// Singleton row for player state.
export const player = sqliteTable("player", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  level: integer("level").notNull().default(1),
  xp: integer("xp").notNull().default(0),
  coins: integer("coins").notNull().default(100),
  stamina: real("stamina").notNull().default(100),
  maxStamina: real("max_stamina").notNull().default(100),
  selectedTool: text("selected_tool").notNull().default("trowel"),
  selectedSpecies: text("selected_species").notNull().default("white-oak"),
  gridSize: integer("grid_size").notNull().default(12),
  prestigeCount: integer("prestige_count").notNull().default(0),
  activeBorderCosmetic: text("active_border_cosmetic"),
  // Forward-compatible: PR 2 exposure system
  bodyTemp: real("body_temp").notNull().default(37),
});

// ─── resources ───────────────────────────────────────────────
// 4 rows: timber, sap, fruit, acorns
export const resources = sqliteTable("resources", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  type: text("type").notNull(),
  current: integer("current").notNull().default(0),
  lifetime: integer("lifetime").notNull().default(0),
});

// ─── seeds ───────────────────────────────────────────────────
// Per-species seed counts
export const seeds = sqliteTable("seeds", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  speciesId: text("species_id").notNull(),
  amount: integer("amount").notNull().default(0),
});

// ─── unlocks ─────────────────────────────────────────────────
// Insert-only. Records which tools/species are unlocked.
export const unlocks = sqliteTable("unlocks", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  type: text("type").notNull(), // "tool" | "species"
  itemId: text("item_id").notNull(),
});

// ─── achievements ────────────────────────────────────────────
// Insert-only. Records which achievements have been earned.
export const achievements = sqliteTable("achievements", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  achievementId: text("achievement_id").notNull(),
});

// ─── trees ───────────────────────────────────────────────────
// Per-zone tree entities. Indexed by zone for fast loading.
export const trees = sqliteTable("trees", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  speciesId: text("species_id").notNull(),
  gridX: integer("grid_x").notNull(),
  gridZ: integer("grid_z").notNull(),
  zoneId: text("zone_id").notNull().default("starting-grove"),
  stage: integer("stage").notNull().default(0),
  progress: real("progress").notNull().default(0),
  watered: integer("watered", { mode: "boolean" }).notNull().default(false),
  fertilized: integer("fertilized", { mode: "boolean" }).notNull().default(false),
  pruned: integer("pruned", { mode: "boolean" }).notNull().default(false),
  totalGrowthTime: real("total_growth_time").notNull().default(0),
  plantedAt: integer("planted_at").notNull().$defaultFn(() => Date.now()),
  meshSeed: integer("mesh_seed").notNull().default(0),
  harvestCooldownElapsed: real("harvest_cooldown_elapsed").notNull().default(0),
  harvestReady: integer("harvest_ready", { mode: "boolean" }).notNull().default(false),
  // Forward-compatible: PR 3 disease system
  blightType: text("blight_type"),
});

// ─── grid_cells ──────────────────────────────────────────────
// Per-zone tile grid. Indexed by zone.
export const gridCells = sqliteTable("grid_cells", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  gridX: integer("grid_x").notNull(),
  gridZ: integer("grid_z").notNull(),
  zoneId: text("zone_id").notNull().default("starting-grove"),
  type: text("type").notNull().default("soil"), // soil | water | rock | path
});

// ─── structures ──────────────────────────────────────────────
// Per-zone placed structures.
export const structures = sqliteTable("structures", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  templateId: text("template_id").notNull(),
  worldX: integer("world_x").notNull(),
  worldZ: integer("world_z").notNull(),
  zoneId: text("zone_id").notNull().default("starting-grove"),
  // Forward-compatible: PR 2 building integrity
  integrity: real("integrity").notNull().default(100),
});

// ─── quests ──────────────────────────────────────────────────
export const quests = sqliteTable("quests", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  questId: text("quest_id").notNull(),
  difficulty: text("difficulty").notNull().default("normal"),
  completed: integer("completed", { mode: "boolean" }).notNull().default(false),
  rewardsJson: text("rewards_json").notNull().default("{}"),
});

// ─── quest_goals ─────────────────────────────────────────────
export const questGoals = sqliteTable("quest_goals", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  questId: text("quest_id").notNull(),
  goalId: text("goal_id").notNull(),
  target: integer("target").notNull().default(1),
  progress: integer("progress").notNull().default(0),
});

// ─── world_state ─────────────────────────────────────────────
// Singleton. Stores world seed and discovery data.
export const worldState = sqliteTable("world_state", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  worldSeed: text("world_seed").notNull().default(""),
  discoveredZonesJson: text("discovered_zones_json").notNull().default('["starting-grove"]'),
  currentZoneId: text("current_zone_id").notNull().default("starting-grove"),
  playerPosX: real("player_pos_x").notNull().default(6),
  playerPosZ: real("player_pos_z").notNull().default(6),
});

// ─── time_state ──────────────────────────────────────────────
// Singleton. Game clock.
export const timeState = sqliteTable("time_state", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  gameTimeMicroseconds: real("game_time_us").notNull().default(0),
  season: text("season").notNull().default("spring"),
  day: integer("day").notNull().default(1),
});

// ─── tracking ────────────────────────────────────────────────
// Singleton. Counters/arrays for achievements and statistics.
export const tracking = sqliteTable("tracking", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  treesPlanted: integer("trees_planted").notNull().default(0),
  treesMatured: integer("trees_matured").notNull().default(0),
  treesHarvested: integer("trees_harvested").notNull().default(0),
  treesWatered: integer("trees_watered").notNull().default(0),
  seasonsExperiencedJson: text("seasons_experienced_json").notNull().default("[]"),
  speciesPlantedJson: text("species_planted_json").notNull().default("[]"),
  toolUseCountsJson: text("tool_use_counts_json").notNull().default("{}"),
  wildTreesHarvested: integer("wild_trees_harvested").notNull().default(0),
  wildTreesRegrown: integer("wild_trees_regrown").notNull().default(0),
  visitedZoneTypesJson: text("visited_zone_types_json").notNull().default("[]"),
  treesPlantedInSpring: integer("trees_planted_in_spring").notNull().default(0),
  treesHarvestedInAutumn: integer("trees_harvested_in_autumn").notNull().default(0),
  wildSpeciesHarvestedJson: text("wild_species_harvested_json").notNull().default("[]"),
  completedQuestIdsJson: text("completed_quest_ids_json").notNull().default("[]"),
  completedGoalIdsJson: text("completed_goal_ids_json").notNull().default("[]"),
  lastQuestRefresh: integer("last_quest_refresh").notNull().default(0),
});

// ─── settings ────────────────────────────────────────────────
// Singleton. User preferences.
export const settings = sqliteTable("settings", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  hasSeenRules: integer("has_seen_rules", { mode: "boolean" }).notNull().default(false),
  hapticsEnabled: integer("haptics_enabled", { mode: "boolean" }).notNull().default(true),
  soundEnabled: integer("sound_enabled", { mode: "boolean" }).notNull().default(true),
});

// ─── tool_upgrades ───────────────────────────────────────────
// Per-tool upgrade tier.
export const toolUpgrades = sqliteTable("tool_upgrades", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  toolId: text("tool_id").notNull(),
  tier: integer("tier").notNull().default(0),
});
