/**
 * achievements/ -- barrel export.
 * Spec §25
 *
 * Decomposed from achievements.ts (401 lines) into:
 *   types.ts    -- Achievement, PlayerStats interfaces
 *   core.ts     -- 20 core grove achievements (planting, harvesting, growing, collection, mastery)
 *   world.ts    -- 25 world achievements (social, exploration, economy, seasonal, NG+)
 *   checker.ts  -- ACHIEVEMENTS catalog + checkAchievements, getAchievementById
 */

export { ACHIEVEMENTS, checkAchievements, getAchievementById } from "./checker.ts";
export { CORE_ACHIEVEMENTS } from "./core.ts";
export type { Achievement, PlayerStats } from "./types.ts";
export { WORLD_ACHIEVEMENTS } from "./world.ts";
