/**
 * Dialogue tree loader and graph validator (Spec §33).
 *
 * Pure functions — no ECS, Rapier, or R3F imports.
 * Loads DialogueTree configs from JSON and validates node graph integrity:
 * every targetNodeId in every branch must exist as a nodeId in the same tree.
 */

import dialogueTreesConfig from "@/config/game/dialogue-trees.json" with { type: "json" };
import type { DialogueTree } from "@/game/ecs/components/dialogue";

// Cast needed: JSON imports are typed as `any` at the module boundary.
const CONFIG_TREES: DialogueTree[] = dialogueTreesConfig as unknown as DialogueTree[];

// ---------------------------------------------------------------------------
// Config accessors
// ---------------------------------------------------------------------------

/** Returns all dialogue trees from config (shallow copy of the array). */
export function getDialogueTrees(): DialogueTree[] {
  return [...CONFIG_TREES];
}

/** Finds a dialogue tree by its treeId. Returns undefined if not found. */
export function getDialogueTreeById(id: string): DialogueTree | undefined {
  return CONFIG_TREES.find((t) => t.treeId === id);
}

// ---------------------------------------------------------------------------
// Graph validation
// ---------------------------------------------------------------------------

/**
 * Validates a single dialogue tree's node graph integrity.
 *
 * Checks:
 * - entryNodeId exists in nodes
 * - Every branch.targetNodeId exists as a nodeId in the same tree
 *
 * Returns an array of error strings. Empty array means the tree is valid.
 */
export function validateDialogueTree(tree: DialogueTree): string[] {
  const errors: string[] = [];
  const nodeIds = new Set(tree.nodes.map((n) => n.nodeId));

  if (!nodeIds.has(tree.entryNodeId)) {
    errors.push(`Tree "${tree.treeId}": entryNodeId "${tree.entryNodeId}" not found in nodes`);
  }

  for (const node of tree.nodes) {
    for (const branch of node.branches) {
      if (!nodeIds.has(branch.targetNodeId)) {
        errors.push(
          `Tree "${tree.treeId}", node "${node.nodeId}": branch "${branch.label}" references missing targetNodeId "${branch.targetNodeId}"`,
        );
      }
    }
  }

  return errors;
}

/**
 * Validates all trees in the provided array.
 *
 * Returns a Map from treeId to error messages.
 * Only trees with errors are included in the result.
 */
export function validateAllDialogueTrees(trees: DialogueTree[]): Map<string, string[]> {
  const result = new Map<string, string[]>();
  for (const tree of trees) {
    const errors = validateDialogueTree(tree);
    if (errors.length > 0) {
      result.set(tree.treeId, errors);
    }
  }
  return result;
}

/**
 * Loads all dialogue trees from config and validates graph integrity.
 * Throws an Error if any tree fails validation.
 */
export function loadAndValidateDialogueTrees(): DialogueTree[] {
  const trees = getDialogueTrees();
  const errorMap = validateAllDialogueTrees(trees);

  if (errorMap.size > 0) {
    const messages: string[] = [];
    for (const errs of errorMap.values()) {
      messages.push(...errs);
    }
    throw new Error(`Dialogue tree validation failed:\n${messages.join("\n")}`);
  }

  return trees;
}
