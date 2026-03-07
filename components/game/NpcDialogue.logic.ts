/**
 * NpcDialogue pure logic (Spec §15, §33).
 *
 * Extracted from NpcDialogue.tsx so Jest can import without the JSX runtime
 * chain initializing React Native. See codebase pattern:
 * "JSX runtime chain breaks .tsx pure-function tests".
 *
 * Pure functions -- no React, no React Native, no ECS imports.
 */

import type { DialogueNode, DialogueTree } from "@/game/ecs/components/dialogue";

// ---------------------------------------------------------------------------
// Pure functions (exported for testing)
// ---------------------------------------------------------------------------

/**
 * Resolve the current DialogueNode from a tree and nodeId.
 *
 * Returns undefined if tree is missing, nodeId is null, or the node
 * is not found in the tree's nodes array.
 *
 * @param tree   Loaded dialogue tree (from getDialogueTreeById)
 * @param nodeId Current node ID (from DialogueComponent.currentNodeId)
 */
export function getActiveDialogueNode(
  tree: DialogueTree | undefined,
  nodeId: string | null,
): DialogueNode | undefined {
  if (!tree || !nodeId) return undefined;
  return tree.nodes.find((n) => n.nodeId === nodeId);
}

/**
 * Resolve a display name for the entity in conversation.
 *
 * Priority: NPC name > spirit ID label > entityId fallback.
 *
 * @param npc               NPC component subset (if entity is an NPC)
 * @param grovekeeperSpirit Spirit component subset (if entity is a spirit)
 * @param entityId          Entity ID fallback
 */
export function resolveEntityDisplayName(
  npc?: { name: string },
  grovekeeperSpirit?: { spiritId: string },
  entityId?: string,
): string {
  if (npc) return npc.name;
  if (grovekeeperSpirit) return `Spirit: ${grovekeeperSpirit.spiritId}`;
  return entityId ?? "Unknown";
}
