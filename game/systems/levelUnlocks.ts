/**
 * Level Unlock System
 *
 * Maps player level to species and tool unlocks.
 * Data sourced from config/game/levelUnlocks.json. Spec §16.2
 */

import levelUnlocksData from "@/config/game/levelUnlocks.json" with { type: "json" };

export interface LevelUnlockEntry {
  level: number;
  species?: string[];
  tools?: string[];
}

export interface UnlockSet {
  species: string[];
  tools: string[];
}

export const LEVEL_UNLOCKS: readonly LevelUnlockEntry[] =
  levelUnlocksData as LevelUnlockEntry[];

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

export function checkNewUnlocks(oldLevel: number, newLevel: number): UnlockSet {
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
