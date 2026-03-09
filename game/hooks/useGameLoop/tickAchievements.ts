/**
 * tickAchievements -- checks and unlocks achievements (throttled ~5s).
 */

import { showAchievementAction as showAchievement } from "@/components/game/AchievementPopup/store";
import { treesQuery } from "@/game/ecs/world";
import { useGameStore } from "@/game/stores";
import {
  checkAchievements,
  getAchievementById,
  type PlayerStats,
} from "@/game/systems/achievements";
import type { TimeState } from "@/game/systems/time";
import { showToast } from "@/game/ui/Toast.ts";

/** Achievement checks run every ~5 seconds. */
export const ACHIEVEMENT_CHECK_INTERVAL = 5;

export function tickAchievements(
  lastAchievementCheck: { current: number },
  timeState: TimeState,
  dt: number,
): void {
  lastAchievementCheck.current += dt;

  if (lastAchievementCheck.current < ACHIEVEMENT_CHECK_INTERVAL) return;

  lastAchievementCheck.current = 0;

  const store = useGameStore.getState();

  let oldGrowthCount = 0;
  for (const entity of treesQuery) {
    if (entity.tree.stage >= 4) oldGrowthCount++;
  }

  let discoveryCount = 0;
  for (const progress of Object.values(store.speciesProgress)) {
    if (progress.discoveryTier >= 1) discoveryCount++;
  }

  const stats: PlayerStats = {
    treesPlanted: store.treesPlanted,
    treesHarvested: store.treesHarvested,
    treesWatered: store.treesWatered,
    totalTimber: store.lifetimeResources.timber ?? 0,
    totalSap: store.lifetimeResources.sap ?? 0,
    totalFruit: store.lifetimeResources.fruit ?? 0,
    totalAcorns: store.lifetimeResources.acorns ?? 0,
    level: store.level,
    speciesPlanted: store.speciesPlanted,
    maxStageReached: Math.max(0, ...Array.from(treesQuery).map((e) => e.tree.stage)),
    currentGridSize: store.gridSize,
    prestigeCount: store.prestigeCount,
    questsCompleted: store.questChainState.completedChainIds.length,
    recipesUnlocked: ((store as Record<string, unknown>).recipesUnlocked as number) ?? 0,
    structuresPlaced: store.placedStructures.length,
    oldGrowthCount,
    npcsFriended: ((store as Record<string, unknown>).npcsFriended as number) ?? 0,
    totalDaysPlayed: timeState.dayNumber,
    tradeCount: store.marketState.tradeHistory.length,
    festivalCount: store.eventState.completedFestivalIds.length,
    discoveryCount,
    chunksVisited: store.discoveredZones.length,
    biomesDiscovered: store.visitedZoneTypes.length,
    spiritsDiscovered: store.discoveredSpiritIds.length,
  };

  const newAchievements = checkAchievements(stats, store.achievements);
  for (const id of newAchievements) {
    store.unlockAchievement(id);
    const def = getAchievementById(id);
    if (def) {
      showToast(`Achievement: ${def.name}!`, "achievement");
      showAchievement(id);
    }
  }
}
