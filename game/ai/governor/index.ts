/**
 * governor/ barrel -- re-exports the public API of the governor subpackage.
 * Callers import from "@/game/ai/governor" or "@/game/ai/PlayerGovernor".
 */

export { GovernorEntity } from "./entity.ts";
export { ExploreEvaluator, HarvestEvaluator, PlantEvaluator, PruneEvaluator, TradeEvaluator, WaterEvaluator } from "./evaluators.ts";
export { PlayerGovernor } from "./PlayerGovernor.ts";
export { pickNearestEntity, pickNearestTile, pickSpecies, resolveTarget } from "./targeting.ts";
export type { ActionTarget, ActionType, GovernorProfile, GovernorState, PlayerGovernorConfig } from "./types.ts";
export { ACTION_PAUSE, DEFAULT_PROFILE } from "./types.ts";
