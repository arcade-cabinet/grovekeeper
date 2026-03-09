/**
 * DialogueChoices -- branch choice buttons for active dialogue (Spec SS33.5).
 *
 * React Native overlay component rendering tappable choice buttons for the
 * current dialogue node. Displays when a node has branches. Buttons have
 * 44px minimum touch targets. After AUTO_ADVANCE_DURATION seconds with no
 * player input, automatically selects the seed-determined branch.
 *
 * Polish features:
 *   - Staggered slide-in animation from bottom
 *   - Numbered shortcuts (1, 2, 3...)
 *   - Golden flash on selection before transitioning
 *   - Subtle border glow on press
 *
 * Pure functions exported for testing:
 *   - computeAutoAdvanceProgress(elapsed, duration)
 *
 * See GAME_SPEC.md SS33.5.
 */

import { useEffect, useRef, useState } from "react";
import { Animated, Easing, Pressable, View } from "react-native";
import { Text } from "@/components/ui/text";
import { ACCENT, FONTS, TYPE } from "@/components/ui/tokens";
import type { DialogueBranch } from "@/game/ecs/components/dialogue";
import { selectDefaultBranchNode } from "@/game/systems/dialogueBranch";
import { choiceSlideDelay } from "./dialogueAnimations.ts";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Auto-advance duration in seconds (Spec SS33.5). */
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
// Animated choice card
// ---------------------------------------------------------------------------

function ChoiceCard({
  branch,
  index,
  onPress,
}: {
  branch: DialogueBranch;
  index: number;
  onPress: (branch: DialogueBranch) => void;
}) {
  const slideAnim = useRef(new Animated.Value(0)).current;
  const flashAnim = useRef(new Animated.Value(0)).current;
  const [flashing, setFlashing] = useState(false);

  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: 1,
      duration: 250,
      delay: choiceSlideDelay(index),
      easing: Easing.out(Easing.back(1.1)),
      useNativeDriver: true,
    }).start();
  }, [slideAnim, index]);

  const handlePress = () => {
    if (flashing) return;
    setFlashing(true);
    Animated.timing(flashAnim, {
      toValue: 1,
      duration: 180,
      useNativeDriver: false,
    }).start(() => {
      onPress(branch);
    });
  };

  const translateY = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [30, 0],
  });

  const opacity = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  const bgColor = flashAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["rgba(255,213,79,0.06)", "rgba(255,213,79,0.25)"],
  });

  const borderColor = flashAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["rgba(255,213,79,0.25)", ACCENT.gold],
  });

  return (
    <Animated.View
      style={{
        transform: [{ translateY }],
        opacity,
        marginBottom: 8,
      }}
    >
      <Pressable
        className="min-h-[44px] flex-row items-center rounded-xl px-4 py-2.5 active:opacity-80"
        onPress={handlePress}
        accessibilityLabel={branch.label}
        accessibilityRole="button"
      >
        <Animated.View
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: 0,
            bottom: 0,
            borderRadius: 12,
            borderWidth: 1,
            borderColor,
            backgroundColor: bgColor,
          }}
        />
        {/* Number badge */}
        <View
          style={{
            width: 24,
            height: 24,
            borderRadius: 12,
            backgroundColor: "rgba(255,213,79,0.15)",
            alignItems: "center",
            justifyContent: "center",
            marginRight: 10,
          }}
        >
          <Text
            style={{
              fontSize: 12,
              fontWeight: "700",
              fontFamily: FONTS.data,
              color: ACCENT.gold,
            }}
          >
            {index + 1}
          </Text>
        </View>
        {/* Label */}
        <Text
          style={{
            ...TYPE.body,
            flex: 1,
            fontWeight: "500",
            color: "rgba(232,245,233,0.9)",
          }}
        >
          {branch.label}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface DialogueChoicesProps {
  /** Available branch choices for the current node. */
  branches: DialogueBranch[];
  /** Whether the choice panel is visible. */
  visible: boolean;
  /** World seed for deterministic auto-advance branch selection (Spec SS33.2). */
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
 * See GAME_SPEC.md SS33.5.
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
    <View className="w-full px-4 py-1">
      {branches.map((branch, index) => (
        <ChoiceCard
          key={`branch-${branch.targetNodeId}-${index}`}
          branch={branch}
          index={index}
          onPress={handlePress}
        />
      ))}
    </View>
  );
};
