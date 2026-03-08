/**
 * tickGrowth -- advances tree growth and crop growth each frame.
 */
import { getSpeciesById } from "@/game/config/species";
import { cropsQuery, treesQuery } from "@/game/ecs/world";
import { useGameStore } from "@/game/stores";
import { tickCropGrowth } from "@/game/systems/cropGrowth";
import { calcGrowthRate, MAX_STAGE } from "@/game/systems/growth";
import { initHarvestable } from "@/game/systems/harvest";
import type { TimeState } from "@/game/systems/time";

export function tickGrowth(
  timeState: TimeState,
  weatherGrowthMult: number,
  growthSpeedMult: number,
  dt: number,
): void {
  const store = useGameStore.getState();

  for (const entity of treesQuery) {
    const tree = entity.tree;
    if (tree.stage >= MAX_STAGE) continue;

    const species = getSpeciesById(tree.speciesId);
    if (!species) continue;

    const baseTime = species.baseGrowthTimes[tree.stage] ?? 30;

    const growthRate = calcGrowthRate({
      baseTime,
      difficulty: species.difficulty,
      season: timeState.season,
      watered: tree.watered,
      evergreen: species.evergreen,
      speciesId: tree.speciesId,
    });

    if (growthRate <= 0) continue;

    const fertilizedMult = tree.fertilized ? 2.0 : 1.0;
    const progressDelta = growthRate * weatherGrowthMult * fertilizedMult * growthSpeedMult * dt;
    tree.progress += progressDelta;
    tree.totalGrowthTime += dt;

    if (tree.progress >= 1 && tree.stage < MAX_STAGE) {
      tree.progress = 0;
      (tree as { stage: number }).stage = tree.stage + 1;

      if (tree.fertilized) {
        tree.fertilized = false;
      }

      store.trackSpeciesGrowth(tree.speciesId, tree.stage);

      if (tree.stage === 3) {
        store.incrementTreesMatured();
        initHarvestable(entity);
      }

      if (tree.stage === 4) {
        initHarvestable(entity);
      }
    }
  }

  tickCropGrowth(cropsQuery, timeState.season, weatherGrowthMult, dt);
}
