/**
 * Dialogue effect application (Spec §15, §17).
 *
 * Pure functions -- no ECS, Rapier, or R3F imports.
 *
 * Processes DialogueEffect arrays against quest chain state.
 * Handles 'start_quest', 'advance_quest', and 'unlock_species' effect types.
 * Other effect types (give_item, give_xp, etc.) are handled
 * by the store or UI layer -- this module delegates non-quest effects
 * as structured return data.
 */

import type { DialogueEffect } from "@/game/ecs/components/dialogue";
import { advanceObjectives, startChain } from "@/game/quests/questChainEngine";
import type { QuestChainState } from "@/game/quests/types";

/**
 * Apply dialogue effects to quest chain state.
 *
 * Processes effects in order:
 * - 'start_quest' calls startChain
 * - 'advance_quest' calls advanceObjectives
 * - 'unlock_species' accumulates speciesId into unlockedSpecies[]
 * - Other effect types are ignored (handled by store/UI layer)
 *
 * Returns new state, the list of any steps that completed, and any
 * species IDs that should be unlocked (caller is responsible for
 * persisting unlocks to the store).
 */
export function applyDialogueEffects(
  effects: DialogueEffect[],
  state: QuestChainState,
  currentDay: number,
): {
  state: QuestChainState;
  completedSteps: { chainId: string; stepId: string }[];
  unlockedSpecies: string[];
} {
  let current = state;
  const allCompleted: { chainId: string; stepId: string }[] = [];
  const unlockedSpecies: string[] = [];

  for (const effect of effects) {
    if (effect.type === "start_quest") {
      current = startChain(current, String(effect.value), currentDay);
    } else if (effect.type === "advance_quest") {
      const result = advanceObjectives(current, String(effect.value), effect.amount ?? 1);
      current = result.state;
      allCompleted.push(...result.completedSteps);
    } else if (effect.type === "unlock_species") {
      const speciesId = String(effect.value);
      if (!unlockedSpecies.includes(speciesId)) {
        unlockedSpecies.push(speciesId);
      }
    }
  }

  return { state: current, completedSteps: allCompleted, unlockedSpecies };
}
