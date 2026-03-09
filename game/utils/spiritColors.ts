/**
 * Grove-aligned color palette and seeded color resolution for Grovekeeper spirits.
 *
 * Exported so both ChunkManager (entity creation) and GrovekeeperSpirit (rendering)
 * share the same deterministic color logic without a cross-layer import.
 *
 * Spec §32.1: warm greens, teals, golds, soft violets — grove-aligned, never harsh.
 */

import { scopedRNG } from "./seedWords.ts";

/**
 * Grove-aligned palette for spirit emissive color.
 * 8 entries — one semantic match per spirit index.
 */
export const SPIRIT_COLORS = [
  "#6bdb7f", // warm green
  "#4ecdc4", // teal
  "#f7d794", // gold
  "#a29bfe", // soft violet
  "#55efc4", // mint teal
  "#ffeaa7", // soft yellow-gold
  "#74b9ff", // sky blue-teal
  "#fd79a8", // soft rose
] as const;

/**
 * Resolve the emissive color for a Grovekeeper spirit.
 *
 * Seeded from scopedRNG("spirit", worldSeed, mazeIndex) — unique per maze,
 * deterministic across sessions. Picks a color from SPIRIT_COLORS.
 *
 * @param mazeIndex  Spirit index in [0, 7].
 * @param worldSeed  World seed string.
 */
export function resolveEmissiveColor(mazeIndex: number, worldSeed: string): string {
  const rng = scopedRNG("spirit", worldSeed, mazeIndex);
  const index = Math.floor(rng() * SPIRIT_COLORS.length);
  return SPIRIT_COLORS[index];
}
