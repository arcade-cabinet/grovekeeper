/**
 * Brand-aligned seed word generator for Grovekeeper.
 *
 * Generates memorable "adjective adjective noun" world seeds like
 * "Gentle Mossy Hollow" or "Ancient Whispering Canopy".
 *
 * All words are themed around cozy forest/nature vibes.
 */

import { createRNG, hashString } from "./seedRNG";

const ADJECTIVES = [
  // Texture & feel
  "Mossy",
  "Dewy",
  "Misty",
  "Silken",
  "Velvety",
  "Fuzzy",
  "Downy",
  "Feathery",
  "Woolly",
  "Pebbly",
  // Light & color
  "Golden",
  "Silver",
  "Amber",
  "Rosy",
  "Copper",
  "Tawny",
  "Dusky",
  "Moonlit",
  "Sunlit",
  "Dappled",
  // Temperature & season
  "Warm",
  "Cool",
  "Frosty",
  "Balmy",
  "Crisp",
  "Breezy",
  "Gentle",
  "Mild",
  "Brisk",
  "Toasty",
  // Age & feeling
  "Ancient",
  "Young",
  "Timeless",
  "Sleepy",
  "Dreamy",
  "Quiet",
  "Hushed",
  "Peaceful",
  "Tranquil",
  "Serene",
  // Nature-specific
  "Verdant",
  "Leafy",
  "Blooming",
  "Budding",
  "Flowering",
  "Tangled",
  "Winding",
  "Climbing",
  "Trailing",
  "Whispering",
  // Sound & movement
  "Rustling",
  "Humming",
  "Chirping",
  "Murmuring",
  "Babbling",
  "Swaying",
  "Dancing",
  "Drifting",
  "Floating",
  "Gliding",
  // Size & shape
  "Tiny",
  "Little",
  "Hidden",
  "Towering",
  "Sprawling",
  "Winding",
  "Curling",
  "Round",
  "Tall",
  "Deep",
] as const;

const NOUNS = [
  // Trees & plants
  "Oak",
  "Birch",
  "Pine",
  "Willow",
  "Maple",
  "Cedar",
  "Elm",
  "Fern",
  "Ivy",
  "Moss",
  // Forest features
  "Grove",
  "Hollow",
  "Glen",
  "Thicket",
  "Glade",
  "Copse",
  "Dell",
  "Meadow",
  "Clearing",
  "Canopy",
  // Water features
  "Brook",
  "Creek",
  "Pond",
  "Spring",
  "Rivulet",
  "Pool",
  "Falls",
  "Mist",
  "Dew",
  "Rain",
  // Earth features
  "Stone",
  "Pebble",
  "Root",
  "Bark",
  "Stump",
  "Log",
  "Ridge",
  "Knoll",
  "Hillock",
  "Burrow",
  // Creatures
  "Robin",
  "Wren",
  "Finch",
  "Owl",
  "Fox",
  "Hare",
  "Badger",
  "Hedgehog",
  "Squirrel",
  "Moth",
  // Magical/cozy
  "Lantern",
  "Ember",
  "Hearth",
  "Acorn",
  "Seedling",
  "Blossom",
  "Petal",
  "Mushroom",
  "Toadstool",
  "Lichen",
] as const;

/**
 * Generate a brand-aligned "Adjective Adjective Noun" seed phrase.
 *
 * If no entropy source is provided, uses Date.now() for initial randomness.
 * The two adjectives are guaranteed to be different.
 */
export function generateSeedPhrase(entropy?: number): string {
  const seed = entropy ?? Date.now();
  const rng = createRNG(seed);

  const adj1Index = Math.floor(rng() * ADJECTIVES.length);
  let adj2Index = Math.floor(rng() * (ADJECTIVES.length - 1));
  if (adj2Index >= adj1Index) adj2Index++;

  const nounIndex = Math.floor(rng() * NOUNS.length);

  return `${ADJECTIVES[adj1Index]} ${ADJECTIVES[adj2Index]} ${NOUNS[nounIndex]}`;
}

/**
 * Create a deterministic RNG from a seed phrase.
 * Hashes the phrase string to get a numeric seed, then creates a Mulberry32 PRNG.
 */
export function rngFromSeedPhrase(phrase: string): () => number {
  return createRNG(hashString(phrase));
}

/**
 * Create a scoped RNG for a specific subsystem.
 * Combines the world seed with a scope string for independent streams.
 *
 * Example: `scopedRNG("quests", "Gentle Mossy Hollow", 5)` produces
 * a deterministic RNG for quest generation on day 5.
 */
export function scopedRNG(scope: string, worldSeed: string, ...extra: (string | number)[]): () => number {
  const key = [scope, worldSeed, ...extra.map(String)].join("-");
  return createRNG(hashString(key));
}
