/**
 * Context-aware action resolution logic (Spec §23).
 *
 * Pure function that maps (raycast target type + selected tool) to
 * the appropriate action label. No React or RN dependencies.
 *
 * Used by ActionButtons to show contextual actions based on what
 * the player is looking at through the FPS crosshair.
 */

import type { RaycastEntityType } from "@/game/hooks/useRaycast";

export interface ContextAction {
  /** Display label for the button (e.g. "CHOP", "TALK", "ATTACK"). */
  label: string;
  /** Tool to auto-select, or null if action is tool-independent. */
  toolId: string | null;
  /** Whether the action can be executed right now. */
  enabled: boolean;
}

/**
 * Resolve the contextual action based on what the player is looking at
 * and their currently selected tool.
 *
 * Rules:
 * - tree + axe → CHOP
 * - tree + watering-can → WATER
 * - tree + pruning-shears → PRUNE
 * - tree + other → CHOP (default tree action)
 * - crop + watering-can → WATER
 * - crop + other → HARVEST
 * - npc → TALK (tool-independent)
 * - enemy → ATTACK (tool-independent)
 * - structure → INTERACT
 * - null → USE (disabled, shows current tool)
 */
export function resolveContextAction(
  targetType: RaycastEntityType | null,
  selectedTool: string,
): ContextAction {
  if (targetType === null) {
    return { label: "USE", toolId: selectedTool, enabled: false };
  }

  switch (targetType) {
    case "tree":
      switch (selectedTool) {
        case "watering-can":
          return { label: "WATER", toolId: "watering-can", enabled: true };
        case "pruning-shears":
          return { label: "PRUNE", toolId: "pruning-shears", enabled: true };
        case "axe":
          return { label: "CHOP", toolId: "axe", enabled: true };
        default:
          return { label: "CHOP", toolId: "axe", enabled: true };
      }

    case "crop":
      switch (selectedTool) {
        case "watering-can":
          return { label: "WATER", toolId: "watering-can", enabled: true };
        default:
          return { label: "HARVEST", toolId: "axe", enabled: true };
      }

    case "npc":
      return { label: "TALK", toolId: null, enabled: true };

    case "enemy":
      return { label: "ATTACK", toolId: null, enabled: true };

    case "structure":
      return { label: "INTERACT", toolId: null, enabled: true };
  }
}
