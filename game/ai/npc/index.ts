/**
 * npc/ barrel -- re-exports the public API of the npc subpackage.
 * Callers import from "@/game/ai/npc" or "@/game/ai/NpcBrain".
 */

export { NpcBrain } from "./NpcBrain.ts";
export { ADJACENT_RANGE, APPROACH_RANGE, NOTICE_RANGE, WANDER_INTERVAL, WANDER_RANGE } from "./config.ts";
export { NpcEntity } from "./entity.ts";
export { ApproachPlayerEvaluator, IdleEvaluator, ReturnHomeEvaluator, WanderEvaluator } from "./evaluators.ts";
export type { EvaluatorTag, NpcBehavior, NpcBrainContext, TaggedEvaluator } from "./types.ts";
