/**
 * DialogueChoices — branch choice buttons for active dialogue (Spec §33.5).
 *
 * React Native overlay component rendering tappable choice buttons for the
 * current dialogue node. Displays when a node has branches. Buttons have
 * 44px minimum touch targets. After AUTO_ADVANCE_DURATION seconds with no
 * player input, automatically selects the seed-determined branch.
 *
 * Pure functions exported for testing:
 *   - computeAutoAdvanceProgress(elapsed, duration)
 *
 * See GAME_SPEC.md §33.5.
 */

import { useEffect, useRef } from "react";
import { Pressable, View } from "react-native";
import { Text } from "@/components/ui/text";
import { ACCENT, LIGHT, TYPE } from "@/components/ui/tokens";
import type { DialogueBranch } from "@/game/ecs/components/dialogue";
import { selectDefaultBranchNode } from "@/game/systems/dialogueBranch";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Auto-advance duration in seconds (Spec §33.5). */
export const AUTO_ADVANCE_DURATION = 3;

// ---------------------------------------------------------------------------
// Pure functions (exported for testing)
// ---------------------------------------------------------------------------

/**
 * Compute progress toward auto-advance as a value in [0, 1].
 *
 * @param elapsed  Seconds elapsed since dialogue node was shown
 * @param duration Total seconds before auto-advance fires
 * @returns        Progress clamped to [0, 1]: 0 = just started, 1 = ready
 */
export function computeAutoAdvanceProgress(elapsed: number, duration: number): number {
  if (duration <= 0) return 1;
  return Math.min(1, Math.max(0, elapsed / duration));
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface DialogueChoicesProps {
  /** Available branch choices for the current node. */
  branches: DialogueBranch[];
  /** Whether the choice panel is visible. */
  visible: boolean;
  /** World seed for deterministic auto-advance branch selection (Spec §33.2). */
  worldSeed: string;
  /** Entity ID (NPC or spirit) for deterministic branch selection. */
  entityId: string;
  /** Node index within the tree for deterministic branch selection. */
  nodeIndex: number;
  /** Called when the player selects a branch or auto-advance fires. */
  onBranchSelect: (branch: DialogueBranch) => void;
}

// ---------------------------------------------------------------------------
// DialogueChoices component
// ---------------------------------------------------------------------------

/**
 * Renders tappable branch choice buttons for the current dialogue node.
 *
 * Positions below the SpeechBubble text. Each button meets the 44px minimum
 * touch target. When AUTO_ADVANCE_DURATION seconds elapse without player
 * input, the seed-selected branch fires automatically via selectDefaultBranchNode.
 *
 * Timer resets whenever visible, branches, worldSeed, entityId, or nodeIndex
 * change. Player tap cancels the timer before calling onBranchSelect.
 *
 * See GAME_SPEC.md §33.5.
 */
export const DialogueChoices = ({
  branches,
  visible,
  worldSeed,
  entityId,
  nodeIndex,
  onBranchSelect,
}: DialogueChoicesProps) => {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Cancel any existing timer before (re-)arming.
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    if (!visible || branches.length === 0) return;

    timerRef.current = setTimeout(() => {
      const branch = selectDefaultBranchNode(branches, worldSeed, entityId, nodeIndex);
      if (branch) {
        onBranchSelect(branch);
      }
    }, AUTO_ADVANCE_DURATION * 1000);

    return () => {
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [visible, branches, worldSeed, entityId, nodeIndex, onBranchSelect]);

  if (!visible || branches.length === 0) return null;

  const handlePress = (branch: DialogueBranch) => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    onBranchSelect(branch);
  };

  return (
    <View className="w-full px-4 py-2">
      {branches.map((branch, index) => (
        <Pressable
          key={`branch-${branch.targetNodeId}-${index}`}
          className="mb-2 min-h-[44px] justify-center rounded-xl px-4 py-2.5 active:opacity-80"
          style={{
            borderWidth: 2,
            borderColor: LIGHT.borderBranch,
            backgroundColor: "rgba(232,245,233,0.6)",
          }}
          onPress={() => handlePress(branch)}
          accessibilityLabel={branch.label}
          accessibilityRole="button"
        >
          <Text style={{ ...TYPE.body, fontWeight: "500", color: ACCENT.sap }}>{branch.label}</Text>
        </Pressable>
      ))}
    </View>
  );
};
