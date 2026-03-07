/**
 * Achievement checker functions -- pure, no side effects.
 * Spec §25
 */

import type { Achievement, PlayerStats } from "./types";
import { CORE_ACHIEVEMENTS } from "./core";
import { WORLD_ACHIEVEMENTS } from "./world";

/** Combined catalog of all 45 achievements. */
export const ACHIEVEMENTS: Achievement[] = [...CORE_ACHIEVEMENTS, ...WORLD_ACHIEVEMENTS];

/**
 * Check all achievements and return the IDs of any newly earned ones.
 */
export function checkAchievements(stats: PlayerStats, alreadyEarned: string[]): string[] {
  const earned = new Set(alreadyEarned);
  const newlyEarned: string[] = [];

  for (const achievement of ACHIEVEMENTS) {
    if (earned.has(achievement.id)) continue;
    if (achievement.check(stats)) {
      newlyEarned.push(achievement.id);
    }
  }

  return newlyEarned;
}

/** Look up an achievement definition by ID. */
export function getAchievementById(id: string): Achievement | undefined {
  return ACHIEVEMENTS.find((a) => a.id === id);
}
