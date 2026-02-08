/**
 * NpcManager — Pure logic module for NPC templates and dialogue.
 *
 * Handles template lookup, dialogue node traversal, and adjacency
 * checks. No BabylonJS or React dependencies — purely data-driven.
 */

import dialogueData from "./data/dialogues.json";
import npcData from "./data/npcs.json";
import type { DialogueNode, NpcTemplate } from "./types";

const npcTemplates: NpcTemplate[] = npcData as NpcTemplate[];
const dialogueNodes: DialogueNode[] = dialogueData as DialogueNode[];

const npcMap = new Map<string, NpcTemplate>();
for (const npc of npcTemplates) {
  npcMap.set(npc.id, npc);
}

const dialogueMap = new Map<string, DialogueNode>();
for (const node of dialogueNodes) {
  dialogueMap.set(node.id, node);
}

/** Get an NPC template by ID. */
export function getNpcTemplate(id: string): NpcTemplate | undefined {
  return npcMap.get(id);
}

/** Get all NPC templates. */
export function getAllNpcTemplates(): NpcTemplate[] {
  return npcTemplates;
}

/** Get a dialogue node by ID. */
export function getDialogueNode(nodeId: string): DialogueNode | undefined {
  return dialogueMap.get(nodeId);
}

/**
 * Check if a player at (px, pz) is adjacent to an NPC at (nx, nz).
 * Uses Manhattan distance <= 1.5 (adjacent tile in any direction).
 */
export function isPlayerAdjacent(
  px: number,
  pz: number,
  nx: number,
  nz: number,
): boolean {
  return Math.abs(px - nx) <= 1.5 && Math.abs(pz - nz) <= 1.5;
}
