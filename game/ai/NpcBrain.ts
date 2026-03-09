/**
 * Re-export shim — NpcBrain has been decomposed into game/ai/npc/.
 * This file exists so any import from "@/game/ai/NpcBrain" continues to work.
 */

export type { NpcBehavior, NpcBrainContext } from "./npc/index.ts";
export { NpcBrain } from "./npc/index.ts";
