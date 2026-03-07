/**
 * TutorialOverlay -- Pulsing highlight ring that draws attention to a
 * target UI element, with an instruction label nearby.
 *
 * In React Native we cannot query the DOM via `data-tutorial-id`. Instead,
 * the caller provides the target rectangle (x, y, width, height) directly,
 * typically measured via `onLayout` or `measure()` on the target ref.
 *
 * The pulsing ring uses the React Native Animated API. Reduced-motion
 * preference is respected via AccessibilityInfo.
 */

import React, { useEffect, useRef } from "react";
import { AccessibilityInfo, Animated, Dimensions, Easing, View } from "react-native";
import { Text } from "@/components/ui/text";

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
  /** Target element rectangle in screen coordinates. Null hides the overlay. */
  targetRect: TutorialTargetRect | null;
  /** Instruction text to show near the highlight ring. */
  label: string | null;
}

// ---------------------------------------------------------------------------
// Colors
// ---------------------------------------------------------------------------

const COLORS = {
  autumnGold: "#FFB74D",
  soilDark: "#3E2723",
} as const;

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const RING_PADDING = 6;
const RING_BORDER_WIDTH = 3;
const RING_BORDER_RADIUS = 12;
const LABEL_OFFSET = 12;
const LABEL_ABOVE_THRESHOLD = 80; // if space below is less than this, show above

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function TutorialOverlay({ targetRect, label }: TutorialOverlayProps) {
  // Pulsing animation
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

  if (!targetRect) return null;

  const { width: vw, height: vh } = Dimensions.get("window");

  // Calculate ring position
  const ringLeft = targetRect.x - RING_PADDING;
  const ringTop = targetRect.y - RING_PADDING;
  const ringWidth = targetRect.width + RING_PADDING * 2;
  const ringHeight = targetRect.height + RING_PADDING * 2;

  // Determine if label goes above or below
  const spaceBelow = vh - (targetRect.y + targetRect.height);
  const labelAbove = spaceBelow < LABEL_ABOVE_THRESHOLD;

  // Clamp label horizontal center to stay within viewport
  const labelCenterX = targetRect.x + targetRect.width / 2;
  const clampedLabelX = Math.max(8, Math.min(labelCenterX, vw - 8));
  const labelTop = labelAbove
    ? targetRect.y - 44
    : targetRect.y + targetRect.height + LABEL_OFFSET;

  // Scale animation interpolation (1 -> 1.05 at midpoint)
  const scaleInterpolation = pulseAnim.interpolate({
    inputRange: [0.7, 1],
    outputRange: [1.05, 1],
  });

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
      pointerEvents="none"
    >
      {/* Pulsing gold ring */}
      <Animated.View
        style={{
          position: "absolute",
          left: ringLeft,
          top: ringTop,
          width: ringWidth,
          height: ringHeight,
          borderRadius: RING_BORDER_RADIUS,
          borderWidth: RING_BORDER_WIDTH,
          borderColor: COLORS.autumnGold,
          opacity: pulseAnim,
          transform: [{ scale: scaleInterpolation }],
          // Glow effect via shadow
          shadowColor: COLORS.autumnGold,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.5,
          shadowRadius: 12,
          elevation: 8,
        }}
      />

      {/* Label */}
      {label && (
        <View
          style={{
            position: "absolute",
            left: clampedLabelX,
            top: labelTop,
            transform: [{ translateX: -50 }],
            backgroundColor: COLORS.soilDark,
            paddingVertical: 6,
            paddingHorizontal: 14,
            borderRadius: 8,
            maxWidth: vw * 0.9,
            // Shadow
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 12,
            elevation: 6,
          }}
        >
          <Text
            className="text-center text-[13px] font-semibold text-white"
            numberOfLines={1}
          >
            {label}
          </Text>
        </View>
      )}
    </View>
  );
}
