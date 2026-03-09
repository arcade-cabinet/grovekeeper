/**
 * NpcBrain configuration constants (values from config/game/ai.json).
 */

import aiConfig from "@/config/game/ai.json" with { type: "json" };

export const WANDER_RANGE: number = aiConfig.npcBrain.wanderRange;
export const WANDER_INTERVAL: number = aiConfig.npcBrain.wanderInterval;
export const NOTICE_RANGE: number = aiConfig.npcBrain.noticeRange;
export const APPROACH_RANGE: number = aiConfig.npcBrain.approachRange;
export const ADJACENT_RANGE: number = aiConfig.npcBrain.adjacentRange;
