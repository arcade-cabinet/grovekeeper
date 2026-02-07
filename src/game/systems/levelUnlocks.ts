/**
 * Level Unlock System
 *
 * Maps player level to species and tool unlocks.
 * See docs/game-design/progression.md for the level unlock table.
 */

export interface LevelUnlockEntry {
  level: number;
  species?: string[];
  tools?: string[];
}

export interface UnlockSet {
  species: string[];
  tools: string[];
}

/**
 * Canonical unlock table. Each entry lists what becomes available at that level.
 * Species IDs use kebab-case; tool IDs use kebab-case.
 */
export const LEVEL_UNLOCKS: readonly LevelUnlockEntry[] = [
  { level: 1, species: ["white-oak"], tools: ["trowel", "watering-can"] },
  { level: 2, species: ["weeping-willow"], tools: ["almanac"] },
  { level: 3, species: ["elder-pine"], tools: ["pruning-shears"] },
  { level: 4, tools: ["seed-pouch"] },
  { level: 5, species: ["cherry-blossom"], tools: ["shovel"] },
  { level: 6, species: ["ghost-birch"] },
  { level: 7, tools: ["axe"] },
  { level: 8, species: ["redwood"] },
  { level: 9, species: ["silver-birch"] },
  { level: 10, species: ["flame-maple"], tools: ["compost-bin"] },
  { level: 11, tools: ["rain-catcher"] },
  { level: 12, species: ["baobab"] },
  { level: 13, tools: ["fertilizer-spreader"] },
  { level: 14, species: ["ironbark"] },
  { level: 16, tools: ["scarecrow"] },
  { level: 18, species: ["golden-apple"] },
  { level: 20, tools: ["grafting-tool"] },
  { level: 22, species: ["mystic-fern"] },
] as const;

/**
 * Returns all unlocks granted at exactly `level`.
 * If the level has no entry in the table, returns empty arrays.
 */
export function getUnlocksForLevel(level: number): UnlockSet {
  const entry = LEVEL_UNLOCKS.find((e) => e.level === level);
  if (!entry) {
    return { species: [], tools: [] };
  }
  return {
    species: entry.species ? [...entry.species] : [],
    tools: entry.tools ? [...entry.tools] : [],
  };
}

/**
 * Returns cumulative unlocks from level 1 through `level` (inclusive).
 * Useful for determining the full set of content available to a player.
 */
export function getAllUnlocksUpToLevel(level: number): UnlockSet {
  const species: string[] = [];
  const tools: string[] = [];

  for (const entry of LEVEL_UNLOCKS) {
    if (entry.level > level) continue;
    if (entry.species) species.push(...entry.species);
    if (entry.tools) tools.push(...entry.tools);
  }

  return { species, tools };
}

/**
 * Returns unlocks newly earned between `oldLevel + 1` and `newLevel` (inclusive).
 * If `newLevel <= oldLevel`, returns empty arrays (no new unlocks).
 * Intended for showing "You unlocked X!" notifications on level-up.
 */
export function checkNewUnlocks(
  oldLevel: number,
  newLevel: number,
): UnlockSet {
  if (newLevel <= oldLevel) {
    return { species: [], tools: [] };
  }

  const species: string[] = [];
  const tools: string[] = [];

  for (const entry of LEVEL_UNLOCKS) {
    if (entry.level > oldLevel && entry.level <= newLevel) {
      if (entry.species) species.push(...entry.species);
      if (entry.tools) tools.push(...entry.tools);
    }
  }

  return { species, tools };
}
