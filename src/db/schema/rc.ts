/**
 * RC redesign schema.
 *
 * Tables for the Wind-Waker-style infinite procedural world that replaces the
 * fixed grid grove of pre-RC Grovekeeper:
 *
 *   - worlds            — multiple save slots; each row is one world the player started
 *   - groves            — claimed/discovered groves keyed by chunk coordinates
 *   - chunks            — sparse player modifications to procgen chunks (deltas)
 *   - inventory         — per-world item counts
 *   - known_recipes     — recipes the player has unlocked in this world
 *   - placed_structures — structures placed inside groves (or unbound)
 *   - dialogue_history  — last phrase each NPC said, for non-repeating phrase pools
 *
 * Audio/graphics/UX settings are NOT in SQLite — they live in
 * @capacitor/preferences (see src/db/preferences.ts) per the spec
 * (small KV → Preferences; structured/relational → SQLite).
 *
 * All FKs use ON DELETE CASCADE so deleting a world wipes its dependent rows.
 */
import {
  index,
  integer,
  primaryKey,
  real,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

// ─── worlds ─────────────────────────────────────────────────
// One row per save slot. The player chooses a name and a difficulty/seed
// at world-creation; everything else hangs off this row.
export const worlds = sqliteTable("worlds", {
  id: text("id").primaryKey(), // uuid v4 string
  name: text("name").notNull().default("Grovekeeper"),
  gardenerName: text("gardener_name").notNull().default("Gardener"),
  worldSeed: text("world_seed").notNull(),
  difficulty: text("difficulty").notNull().default("sapling"), // seedling|sapling|hardwood|ironwood
  createdAt: integer("created_at")
    .notNull()
    .$defaultFn(() => Date.now()),
  lastPlayedAt: integer("last_played_at")
    .notNull()
    .$defaultFn(() => Date.now()),
});

// ─── groves ─────────────────────────────────────────────────
// A grove is a special "blessed meadow" chunk. Most chunks are not groves.
// state = 'undiscovered' rows are NOT stored — only persist once player
// reaches the chunk. So presence of a row implies state >= 'discovered'.
export const groves = sqliteTable(
  "groves",
  {
    id: text("id").primaryKey(),
    worldId: text("world_id")
      .notNull()
      .references(() => worlds.id, { onDelete: "cascade" }),
    chunkX: integer("chunk_x").notNull(),
    chunkZ: integer("chunk_z").notNull(),
    biome: text("biome").notNull(), // surrounding biome flavor
    state: text("state").notNull().default("discovered"), // discovered|claimed
    discoveredAt: integer("discovered_at")
      .notNull()
      .$defaultFn(() => Date.now()),
    claimedAt: integer("claimed_at"),
    hearthLitAt: integer("hearth_lit_at"),
  },
  (t) => ({
    worldChunkIdx: uniqueIndex("groves_world_chunk_uq").on(
      t.worldId,
      t.chunkX,
      t.chunkZ,
    ),
    worldStateIdx: index("groves_world_state_idx").on(t.worldId, t.state),
  }),
);

// ─── chunks ─────────────────────────────────────────────────
// Sparse player modifications to procgen chunks. Most chunks are pure
// procgen and have no row. Only chunks the player has *changed* (placed/
// removed voxels, harvested wild trees, etc.) get a row whose JSON blob
// describes the diff against deterministic procgen output.
export const chunks = sqliteTable(
  "chunks",
  {
    worldId: text("world_id")
      .notNull()
      .references(() => worlds.id, { onDelete: "cascade" }),
    chunkX: integer("chunk_x").notNull(),
    chunkZ: integer("chunk_z").notNull(),
    biome: text("biome").notNull(),
    generatedAt: integer("generated_at")
      .notNull()
      .$defaultFn(() => Date.now()),
    // JSON: array of {x, y, z, op: 'set' | 'remove', blockId?: string}
    modifiedBlocksJson: text("modified_blocks_json").notNull().default("[]"),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.worldId, t.chunkX, t.chunkZ] }),
  }),
);

// ─── inventory ──────────────────────────────────────────────
// Per-world item counts. (worldId, itemId) is unique.
export const inventory = sqliteTable(
  "inventory",
  {
    worldId: text("world_id")
      .notNull()
      .references(() => worlds.id, { onDelete: "cascade" }),
    itemId: text("item_id").notNull(),
    count: integer("count").notNull().default(0),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.worldId, t.itemId] }),
  }),
);

// ─── known_recipes ──────────────────────────────────────────
// Recipes the player has unlocked. Idempotent: re-learning is a no-op.
export const knownRecipes = sqliteTable(
  "known_recipes",
  {
    worldId: text("world_id")
      .notNull()
      .references(() => worlds.id, { onDelete: "cascade" }),
    recipeId: text("recipe_id").notNull(),
    learnedAt: integer("learned_at")
      .notNull()
      .$defaultFn(() => Date.now()),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.worldId, t.recipeId] }),
  }),
);

// ─── placed_structures ──────────────────────────────────────
// Structures placed in groves (or unbound from a grove if groveId is null).
export const placedStructures = sqliteTable(
  "placed_structures",
  {
    id: text("id").primaryKey(),
    worldId: text("world_id")
      .notNull()
      .references(() => worlds.id, { onDelete: "cascade" }),
    groveId: text("grove_id").references(() => groves.id, {
      onDelete: "cascade",
    }),
    x: real("x").notNull(),
    y: real("y").notNull(),
    z: real("z").notNull(),
    type: text("type").notNull(),
    rotation: real("rotation").notNull().default(0),
    placedAt: integer("placed_at")
      .notNull()
      .$defaultFn(() => Date.now()),
  },
  (t) => ({
    worldIdx: index("placed_structures_world_idx").on(t.worldId),
    groveIdx: index("placed_structures_grove_idx").on(t.groveId),
  }),
);

// ─── dialogue_history ───────────────────────────────────────
// Records the last phrase each NPC said, so phrase pools can avoid
// immediate repeats. (worldId, npcId) is unique.
export const dialogueHistory = sqliteTable(
  "dialogue_history",
  {
    worldId: text("world_id")
      .notNull()
      .references(() => worlds.id, { onDelete: "cascade" }),
    npcId: text("npc_id").notNull(),
    lastPhraseId: text("last_phrase_id").notNull(),
    saidAt: integer("said_at")
      .notNull()
      .$defaultFn(() => Date.now()),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.worldId, t.npcId] }),
  }),
);

// ─── inferred row types ─────────────────────────────────────
export type World = typeof worlds.$inferSelect;
export type NewWorld = typeof worlds.$inferInsert;
export type Grove = typeof groves.$inferSelect;
export type NewGrove = typeof groves.$inferInsert;
export type Chunk = typeof chunks.$inferSelect;
export type NewChunk = typeof chunks.$inferInsert;
export type InventoryRow = typeof inventory.$inferSelect;
export type NewInventoryRow = typeof inventory.$inferInsert;
export type KnownRecipe = typeof knownRecipes.$inferSelect;
export type NewKnownRecipe = typeof knownRecipes.$inferInsert;
export type PlacedStructure = typeof placedStructures.$inferSelect;
export type NewPlacedStructure = typeof placedStructures.$inferInsert;
export type DialogueHistoryRow = typeof dialogueHistory.$inferSelect;
export type NewDialogueHistoryRow = typeof dialogueHistory.$inferInsert;

export type GroveState = "discovered" | "claimed";
export type ChunkBlockOp = "set" | "remove";

export interface ChunkBlockMod {
  x: number;
  y: number;
  z: number;
  op: ChunkBlockOp;
  blockId?: string;
}
