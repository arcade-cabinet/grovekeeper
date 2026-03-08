/**
 * worldNames -- Seeded, deterministic name generation for procedural world areas and NPCs.
 *
 * Generates stable names for:
 *   - Hedge labyrinth POIs (e.g. "The Emberveil Labyrinth")
 *   - Procedural village POIs (e.g. "Fernwick", "Mosshollow")
 *   - Landmark POIs: ruins, towers, camps (e.g. "The Forgotten Tower")
 *   - Procedural NPC names (nature-rooted, gender-neutral)
 *
 * The starting village "Rootmere" is FIXED and never generated.
 * Named starting NPCs (Elder Rowan, Hazel, etc.) are FIXED.
 *
 * Spec §40: World Naming System.
 *
 * All functions are pure — same inputs always produce the same output.
 * All randomness via scopedRNG from game/utils/seedWords.ts.
 */

import { scopedRNG } from "./seedWords.ts";

// ── Types ─────────────────────────────────────────────────────────────────────

/** The category of a named procedural area. */
export type AreaType = "labyrinth" | "village" | "landmark";

// ── Word banks ────────────────────────────────────────────────────────────────

/** Spec §40.2 — Labyrinth name adjectives. */
const LABYRINTH_ADJECTIVES: readonly string[] = [
  "Thorn",
  "Briar",
  "Hollow",
  "Pale",
  "Ember",
  "Moss",
  "Silver",
  "Veil",
  "Dusk",
  "Ancient",
  "Gnarled",
  "Verdant",
  "Twilight",
  "Ashen",
];

/** Spec §40.2 — Labyrinth name nouns (title-cased for compound use). */
const LABYRINTH_NOUNS: readonly string[] = [
  "Wood",
  "Root",
  "Glen",
  "Mere",
  "Rise",
  "Stone",
  "Gate",
  "Arch",
  "Ring",
  "Veil",
  "Watch",
];

/** Spec §40.2 — Village name prefixes. */
const VILLAGE_PREFIXES: readonly string[] = [
  "Briar",
  "Fern",
  "Moss",
  "Oak",
  "Ash",
  "Thorn",
  "Elm",
  "Reed",
  "Rowan",
  "Birch",
  "Alder",
  "Heather",
];

/** Spec §40.2 — Village name suffixes (lowercase, appended directly). */
const VILLAGE_SUFFIXES: readonly string[] = [
  "wick",
  "holm",
  "dale",
  "mere",
  "haven",
  "ford",
  "shaw",
  "hollow",
  "fell",
  "gate",
];

/** Spec §40.2 — Landmark name adjectives. */
const LANDMARK_ADJECTIVES: readonly string[] = [
  "Pale",
  "Crumbled",
  "Mossy",
  "Forgotten",
  "Overgrown",
  "Weathered",
  "Still",
];

/** Spec §40.2 — Landmark name types. */
const LANDMARK_TYPES: readonly string[] = [
  "Tower",
  "Ruin",
  "Camp",
  "Ring",
  "Mound",
  "Hollow",
  "Crossing",
  "Well",
];

/** Spec §40.3 — NPC first names (nature-rooted, gender-neutral). */
const NPC_FIRST_NAMES: readonly string[] = [
  "Alder",
  "Ash",
  "Birch",
  "Brier",
  "Cedar",
  "Clover",
  "Dusk",
  "Elder",
  "Elm",
  "Fern",
  "Finch",
  "Flint",
  "Garnet",
  "Haze",
  "Hazel",
  "Ivy",
  "Juniper",
  "Lichen",
  "Linden",
  "Maple",
  "Marsh",
  "Mist",
  "Mossy",
  "Needle",
  "Oak",
  "Pine",
  "Reed",
  "Robin",
  "Rowan",
  "Rush",
  "Sage",
  "Sedge",
  "Slate",
  "Sorrel",
  "Thorn",
  "Wren",
  "Yarrow",
];

/** Spec §40.3 — Optional NPC descriptive titles (10% probability). */
const NPC_TITLES: readonly string[] = [
  "the Young",
  "of the Grove",
  "Far-Walker",
  "Root-Finder",
  "Storm-Watcher",
  "Seed-Bearer",
  "Thorn-Hand",
];

/** Reserved starting village name -- never generated procedurally. Spec §40.1. */
const RESERVED_VILLAGE_NAME = "Rootmere";

/** Probability (0-1) that an NPC receives a descriptive title. Spec §40.3. */
const NPC_TITLE_PROBABILITY = 0.1;

// ── Helpers ───────────────────────────────────────────────────────────────────

function pickFrom<T>(arr: readonly T[], rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)];
}

// ── Area name generation ───────────────────────────────────────────────────────

/**
 * Generate a labyrinth name.
 * Format: "The [Adjective][Noun] Labyrinth"
 * Example: "The Emberveil Labyrinth", "The Thornwood Labyrinth"
 */
function generateLabyrinthName(worldSeed: string, chunkX: number, chunkZ: number): string {
  const rng = scopedRNG("area-name", worldSeed, chunkX, chunkZ);
  const adj = pickFrom(LABYRINTH_ADJECTIVES, rng);
  const noun = pickFrom(LABYRINTH_NOUNS, rng);
  return `The ${adj}${noun} Labyrinth`;
}

/**
 * Generate a village name.
 * Format: "[Prefix][suffix]" -- a single compound word
 * Example: "Fernwick", "Mosshollow", "Brierhaven"
 *
 * Guard: if the result is "Rootmere" (reserved), re-roll once with chunkX + 1.
 */
function generateVillageName(worldSeed: string, chunkX: number, chunkZ: number): string {
  const rng = scopedRNG("area-name", worldSeed, chunkX, chunkZ);
  const prefix = pickFrom(VILLAGE_PREFIXES, rng);
  const suffix = pickFrom(VILLAGE_SUFFIXES, rng);
  const name = `${prefix}${suffix}`;

  if (name === RESERVED_VILLAGE_NAME) {
    const rng2 = scopedRNG("area-name", worldSeed, chunkX + 1, chunkZ);
    const prefix2 = pickFrom(VILLAGE_PREFIXES, rng2);
    const suffix2 = pickFrom(VILLAGE_SUFFIXES, rng2);
    return `${prefix2}${suffix2}`;
  }

  return name;
}

/**
 * Generate a landmark name.
 * Format: "The [Adjective] [Type]"
 * Example: "The Forgotten Tower", "The Mossy Ring"
 */
function generateLandmarkName(worldSeed: string, chunkX: number, chunkZ: number): string {
  const rng = scopedRNG("area-name", worldSeed, chunkX, chunkZ);
  const adj = pickFrom(LANDMARK_ADJECTIVES, rng);
  const type = pickFrom(LANDMARK_TYPES, rng);
  return `The ${adj} ${type}`;
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Generate a deterministic name for a procedural POI.
 *
 * Names are stable: same (type, worldSeed, chunkX, chunkZ) gives same name.
 *
 * Spec §40.2.
 *
 * @param type      "labyrinth" | "village" | "landmark"
 * @param worldSeed World seed string.
 * @param chunkX    Chunk X grid coordinate.
 * @param chunkZ    Chunk Z grid coordinate.
 * @returns         A human-readable name for the area.
 */
export function generateAreaName(
  type: AreaType,
  worldSeed: string,
  chunkX: number,
  chunkZ: number,
): string {
  switch (type) {
    case "labyrinth":
      return generateLabyrinthName(worldSeed, chunkX, chunkZ);
    case "village":
      return generateVillageName(worldSeed, chunkX, chunkZ);
    case "landmark":
      return generateLandmarkName(worldSeed, chunkX, chunkZ);
  }
}

/**
 * Generate a deterministic name for a procedural NPC.
 *
 * Names are stable: same (worldSeed, npcId) gives same name for the NPC's lifetime.
 * 10% chance of receiving a descriptive title.
 *
 * Spec §40.3.
 *
 * @param worldSeed World seed string.
 * @param npcId     Stable entity ID (e.g. "village-npc-5-3-0").
 * @returns         A human-readable NPC name (e.g. "Fern", "Oak the Young", "Reed, Far-Walker").
 */
export function generateNpcName(worldSeed: string, npcId: string): string {
  const rng = scopedRNG("npc-name", worldSeed, npcId);
  const firstName = pickFrom(NPC_FIRST_NAMES, rng);

  if (rng() < NPC_TITLE_PROBABILITY) {
    const title = pickFrom(NPC_TITLES, rng);
    if (title.startsWith("the ") || title.startsWith("of ")) {
      return `${firstName} ${title}`;
    }
    return `${firstName}, ${title}`;
  }

  return firstName;
}
