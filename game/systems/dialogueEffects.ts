/**
 * Dialogue effect application (Spec §15, §17).
 *
 * Pure functions -- no ECS, Rapier, or R3F imports.
 *
 * Processes DialogueEffect arrays against quest chain state.
 * Handles 'start_quest' and 'advance_quest' effect types.
 * Other effect types (give_item, give_xp, etc.) are handled
 * by the store or UI layer -- this module is quest-only.
 */

import type { DialogueEffect } from "@/game/ecs/components/dialogue";
import { advanceObjectives, startChain } from "@/game/quests/questChainEngine";
import type { QuestChainState } from "@/game/quests/types";

/**
 * Apply dialogue effects to quest chain state.
 *
 * Processes effects in order. Each 'start_quest' calls startChain;
 * each 'advance_quest' calls advanceObjectives. Other effect types
 * are ignored (handled elsewhere in the stack).
 *
 * Returns new state and the list of any steps that completed.
 */
export function applyDialogueEffects(
  effects: DialogueEffect[],
  state: QuestChainState,
  currentDay: number,
): {
  state: QuestChainState;
  completedSteps: { chainId: string; stepId: string }[];
} {
  let current = state;
  const allCompleted: { chainId: string; stepId: string }[] = [];

  for (const effect of effects) {
    if (effect.type === "start_quest") {
      current = startChain(current, String(effect.value), currentDay);
    } else if (effect.type === "advance_quest") {
      const result = advanceObjectives(current, String(effect.value), effect.amount ?? 1);
      current = result.state;
      allCompleted.push(...result.completedSteps);
    }
  }

  return { state: current, completedSteps: allCompleted };
}
