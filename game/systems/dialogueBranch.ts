/**
 * Dialogue branch selection system (Spec §33.2).
 *
 * Pure functions — no ECS, Rapier, or R3F imports.
 *
 * Selects the "default" branch from a dialogue node using normalized
 * seedBias weights and scopedRNG. The same worldSeed + entityId + nodeIndex
 * always produces the same branch selection, making each seed's narrative
 * path deterministic.
 *
 * Branching math: B^D unique paths per tree (avg 3^4 = 81 paths).
 * Multiplied across all trees → enormous per-seed narrative diversity.
 */

import { scopedRNG } from "@/game/utils/seedWords";
import type { DialogueBranch } from "@/game/ecs/components/dialogue";

// ---------------------------------------------------------------------------
// Weight normalization
// ---------------------------------------------------------------------------

/**
 * Normalize an array of seedBias values to sum to 1.0.
 *
 * If all weights are zero, returns uniform distribution (each = 1/N).
 * Returns a new array of normalized weights in the same order as input.
 */
export function normalizeSeedBias(branches: DialogueBranch[]): number[] {
  if (branches.length === 0) return [];
  const total = branches.reduce((sum, b) => sum + b.seedBias, 0);
  if (total === 0) {
    return branches.map(() => 1 / branches.length);
  }
  return branches.map((b) => b.seedBias / total);
}

// ---------------------------------------------------------------------------
// Branch selection
// ---------------------------------------------------------------------------

/**
 * Select the default branch index using normalized seedBias weights and
 * scopedRNG("dialogue-branch", worldSeed, entityId, nodeIndex).
 *
 * Uses weighted roulette-wheel selection: pick the branch where the RNG
 * roll falls within its cumulative probability window.
 *
 * @param branches  - Branches on the current node
 * @param worldSeed - World seed string
 * @param entityId  - Entity ID (NPC or spirit)
 * @param nodeIndex - Node index within the dialogue tree
 * @returns Index of selected branch, or -1 if branches is empty
 */
export function selectDefaultBranch(
  branches: DialogueBranch[],
  worldSeed: string,
  entityId: string,
  nodeIndex: number,
): number {
  if (branches.length === 0) return -1;
  if (branches.length === 1) return 0;

  const weights = normalizeSeedBias(branches);
  const rng = scopedRNG("dialogue-branch", worldSeed, entityId, nodeIndex);
  const roll = rng();

  let cumulative = 0;
  for (let i = 0; i < weights.length; i++) {
    cumulative += weights[i];
    if (roll < cumulative) return i;
  }

  // Fallback: floating-point edge case where roll === 1.0
  return weights.length - 1;
}

/**
 * Select the default branch object using normalized seedBias weights and
 * scopedRNG("dialogue-branch", worldSeed, entityId, nodeIndex).
 *
 * Returns undefined if branches is empty.
 */
export function selectDefaultBranchNode(
  branches: DialogueBranch[],
  worldSeed: string,
  entityId: string,
  nodeIndex: number,
): DialogueBranch | undefined {
  const idx = selectDefaultBranch(branches, worldSeed, entityId, nodeIndex);
  if (idx === -1) return undefined;
  return branches[idx];
}
