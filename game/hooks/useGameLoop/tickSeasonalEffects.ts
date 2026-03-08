/**
 * tickSeasonalEffects -- applies season-change visual updates to trees and bushes.
 * Runs only when the season changes (not every frame). Spec ss6.3.
 */
import { getSpeciesById } from "@/game/config/species";
import type { VegetationSeason } from "@/game/ecs/components/vegetation";
import { bushesQuery, treesQuery } from "@/game/ecs/world";
import { applySeasonToBush, applySeasonToTree } from "@/game/systems/seasonalEffects";

/**
 * Apply seasonal tint / model changes to all tree and bush ECS entities.
 * Called once when the season transitions, not every frame.
 */
export function tickSeasonalEffects(season: string): void {
  const vegSeason = season as VegetationSeason;

  for (const entity of treesQuery) {
    const species = getSpeciesById(entity.tree.speciesId);
    if (!species) continue;
    const updated = applySeasonToTree(entity.tree, vegSeason, species.evergreen);
    entity.tree.seasonTint = updated.seasonTint;
    entity.tree.useWinterModel = updated.useWinterModel;
  }

  for (const entity of bushesQuery) {
    if (!entity.bush) continue;
    const updated = applySeasonToBush(entity.bush, vegSeason);
    entity.bush.season = updated.season;
    entity.bush.modelKey = updated.modelKey;
  }
}
