/**
 * TutorialOverlay -- Pulsing highlight ring that draws attention to a
 * target UI element, with an instruction label nearby and a Skip button.
 *
 * Reads tutorial state from the game store directly. When the tutorial is
 * active (not completed), shows the current step label and a 44px Skip
 * button. Callers may also pass a `targetRect` to show a highlight ring
 * around a specific HUD element.
 *
 * In React Native we cannot query the DOM via `data-tutorial-id`. Instead,
 * the caller provides the target rectangle (x, y, width, height) directly,
 * typically measured via `onLayout` or `measure()` on the target ref.
 *
 * The pulsing ring uses the React Native Animated API. Reduced-motion
 * preference is respected via AccessibilityInfo.
 */

import React, { useEffect, useRef } from "react";
import {
  AccessibilityInfo,
  Animated,
  Dimensions,
  Easing,
  Pressable,
  View,
} from "react-native";
import { Text } from "@/components/ui/text";
import { useGameStore } from "@/game/stores/gameStore";
import { currentStepLabel } from "@/game/systems/tutorial";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TutorialTargetRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface TutorialOverlayProps {
  /** Target element rectangle in screen coordinates. Null hides the ring. */
  targetRect: TutorialTargetRect | null;
  /** Fallback instruction text (used when no tutorial step is active). */
  label?: string | null;
}

// ---------------------------------------------------------------------------
// Colors
// ---------------------------------------------------------------------------

const COLORS = {
  autumnGold: "#FFB74D",
  soilDark: "#3E2723",
  skipBg: "rgba(62, 39, 35, 0.9)",
  skipText: "#FFB74D",
} as const;

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const RING_PADDING = 6;
const RING_BORDER_WIDTH = 3;
const RING_BORDER_RADIUS = 12;
const LABEL_OFFSET = 12;
const LABEL_ABOVE_THRESHOLD = 80; // if space below is less than this, show above
const SKIP_BUTTON_HEIGHT = 44; // mobile touch target minimum

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function TutorialOverlay({ targetRect, label: labelProp }: TutorialOverlayProps) {
  // All hooks must be called unconditionally (Rules of Hooks)
  const tutorialState = useGameStore((s) => s.tutorialState);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const reduceMotionRef = useRef(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then((reduced) => {
      reduceMotionRef.current = reduced;
    });
  }, []);

  useEffect(() => {
    if (!targetRect || reduceMotionRef.current) {
      pulseAnim.setValue(1);
      return;
    }

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.7,
          duration: 750,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 750,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );

    loop.start();
    return () => loop.stop();
  }, [targetRect, pulseAnim]);

  // Determine what to show (after all hooks)
  const activeLabel = currentStepLabel(tutorialState) ?? labelProp ?? null;
  const tutorialActive = !tutorialState.completed && tutorialState.currentStep !== "done";

  if (!tutorialActive && !activeLabel) return null;

  const { width: vw, height: vh } = Dimensions.get("window");

  // Scale animation interpolation (1 -> 1.05 at midpoint)
  const scaleInterpolation = pulseAnim.interpolate({
    inputRange: [0.7, 1],
    outputRange: [1.05, 1],
  });

  // Label position: follow targetRect if present, else fixed top center
  const centerX = targetRect ? targetRect.x + targetRect.width / 2 : vw / 2;
  const clampedX = Math.max(8, Math.min(centerX, vw - 8));
  const spaceBelow = targetRect ? vh - (targetRect.y + targetRect.height) : vh;
  const labelAbove = !!targetRect && spaceBelow < LABEL_ABOVE_THRESHOLD;
  const labelTop = targetRect
    ? labelAbove
      ? targetRect.y - SKIP_BUTTON_HEIGHT
      : targetRect.y + targetRect.height + LABEL_OFFSET
    : 80;

  return (
    <View
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 9999,
      }}
      pointerEvents="box-none"
    >
      {/* Pulsing gold ring around target element */}
      {targetRect && (
        <Animated.View
          style={{
            position: "absolute",
            left: targetRect.x - RING_PADDING,
            top: targetRect.y - RING_PADDING,
            width: targetRect.width + RING_PADDING * 2,
            height: targetRect.height + RING_PADDING * 2,
            borderRadius: RING_BORDER_RADIUS,
            borderWidth: RING_BORDER_WIDTH,
            borderColor: COLORS.autumnGold,
            opacity: pulseAnim,
            transform: [{ scale: scaleInterpolation }],
            shadowColor: COLORS.autumnGold,
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.5,
            shadowRadius: 12,
            elevation: 8,
          }}
        />
      )}

      {/* Instruction label */}
      {activeLabel && (
        <View
          style={{
            position: "absolute",
            left: clampedX,
            top: labelTop,
            transform: [{ translateX: -50 }],
            backgroundColor: COLORS.soilDark,
            paddingVertical: 6,
            paddingHorizontal: 14,
            borderRadius: 8,
            maxWidth: vw * 0.9,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 12,
            elevation: 6,
          }}
        >
          <Text
            className="text-center text-[13px] font-semibold text-white"
            numberOfLines={2}
          >
            {activeLabel}
          </Text>
        </View>
      )}

      {/* Skip button — 44px touch target, bottom-right corner */}
      {tutorialActive && (
        <Pressable
          onPress={() => useGameStore.getState().completeTutorialSkip()}
          style={({ pressed }) => ({
            position: "absolute",
            bottom: 96,
            right: 16,
            height: SKIP_BUTTON_HEIGHT,
            paddingHorizontal: 20,
            backgroundColor: pressed ? "rgba(62, 39, 35, 1)" : COLORS.skipBg,
            borderRadius: 8,
            borderWidth: 1,
            borderColor: COLORS.autumnGold,
            justifyContent: "center",
            alignItems: "center",
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.25,
            shadowRadius: 6,
            elevation: 5,
          })}
          accessibilityRole="button"
          accessibilityLabel="Skip tutorial"
        >
          <Text
            className="text-[13px] font-semibold"
            style={{ color: COLORS.skipText }}
          >
            Skip Tutorial
          </Text>
        </Pressable>
      )}
    </View>
  );
}
