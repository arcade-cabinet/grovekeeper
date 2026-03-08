/**
 * RadialActionMenu -- Circular arrangement of action buttons around
 * the projected selection ring center.
 *
 * Actions are placed on a circle of RING_RADIUS pixels, starting from
 * the top (12 o'clock). The entire ring shifts inward when near viewport
 * edges. Dismissed by tapping the invisible backdrop.
 *
 * Staggered scale-in animation per button with delayed label fade-in.
 */

import React, { useEffect, useMemo } from "react";
import { AccessibilityInfo, Dimensions, Pressable, View } from "react-native";

// Re-export FPS entity action builder for convenience at callsites.
export { getActionsForEntity } from "./radialActions";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";
import { Text } from "@/components/ui/text";
import type { RadialAction } from "./radialActions.ts";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RadialActionMenuProps {
  open: boolean;
  actions: RadialAction[];
  centerX: number;
  centerY: number;
  onSelect: (actionId: string) => void;
  onDismiss: () => void;
}

// Re-export the RadialAction type for convenience
export type { RadialAction };

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const RING_RADIUS = 70; // px from center to button center
const BUTTON_SIZE = 52; // px -- above 44px minimum touch target
const EDGE_PADDING = 8; // px from viewport edge
const STAGGER_DELAY = 40; // ms between each button animation
const LABEL_EXTRA_DELAY = 20; // ms extra delay for label after its button

// ---------------------------------------------------------------------------
// Colors (from original COLORS constant)
// ---------------------------------------------------------------------------

const COLORS = {
  soilDark: "#3E2723",
} as const;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function useReducedMotion(): boolean {
  const [reduced, setReduced] = React.useState(false);
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduced);
    const sub = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduced);
    return () => sub.remove();
  }, []);
  return reduced;
}

// ---------------------------------------------------------------------------
// Radial button with staggered animation
// ---------------------------------------------------------------------------

function RadialButton({
  action,
  angle,
  index,
  onSelect,
  reduceMotion,
}: {
  action: RadialAction;
  angle: number;
  index: number;
  onSelect: (actionId: string) => void;
  reduceMotion: boolean;
}) {
  const scale = useSharedValue(reduceMotion ? 1 : 0);
  const opacity = useSharedValue(reduceMotion ? 1 : 0);

  useEffect(() => {
    if (reduceMotion) {
      scale.value = 1;
      opacity.value = 1;
      return;
    }
    const delay = index * STAGGER_DELAY;
    scale.value = withDelay(
      delay,
      withTiming(1, {
        duration: 200,
        easing: Easing.out(Easing.back(1.5)),
      }),
    );
    opacity.value = withDelay(
      delay,
      withTiming(1, { duration: 150, easing: Easing.out(Easing.ease) }),
    );
  }, [scale, opacity, reduceMotion, index]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const x = Math.cos(angle) * RING_RADIUS - BUTTON_SIZE / 2;
  const y = Math.sin(angle) * RING_RADIUS - BUTTON_SIZE / 2;

  return (
    <Animated.View
      className="absolute"
      style={[
        {
          left: x,
          top: y,
          width: BUTTON_SIZE,
          height: BUTTON_SIZE,
        },
        animatedStyle,
      ]}
    >
      <Pressable
        className="h-full w-full items-center justify-center rounded-full shadow-lg"
        style={{
          backgroundColor: `${action.color}e0`,
          borderWidth: 2,
          borderColor: COLORS.soilDark,
        }}
        onPress={() => onSelect(action.id)}
        accessibilityLabel={action.label}
      >
        <Text className="text-lg leading-none">{action.icon}</Text>
      </Pressable>
    </Animated.View>
  );
}

// ---------------------------------------------------------------------------
// Radial label with staggered fade-in
// ---------------------------------------------------------------------------

function RadialLabel({
  action,
  angle,
  index,
  reduceMotion,
}: {
  action: RadialAction;
  angle: number;
  index: number;
  reduceMotion: boolean;
}) {
  const opacity = useSharedValue(reduceMotion ? 1 : 0);

  useEffect(() => {
    if (reduceMotion) {
      opacity.value = 1;
      return;
    }
    const delay = index * STAGGER_DELAY + LABEL_EXTRA_DELAY;
    opacity.value = withDelay(
      delay,
      withTiming(1, { duration: 150, easing: Easing.out(Easing.ease) }),
    );
  }, [opacity, reduceMotion, index]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  // Position label centered below the button
  const x = Math.cos(angle) * RING_RADIUS;
  const y = Math.sin(angle) * RING_RADIUS + BUTTON_SIZE / 2 + 2;

  return (
    <Animated.View
      className="absolute items-center"
      style={[
        {
          left: x - 40, // centering: half of 80px wide container
          top: y,
          width: 80,
        },
        animatedStyle,
      ]}
      pointerEvents="none"
    >
      <Text
        className="text-center text-[10px] font-semibold text-white"
        style={{
          textShadowColor: COLORS.soilDark,
          textShadowOffset: { width: 0, height: 1 },
          textShadowRadius: 3,
        }}
      >
        {action.label}
      </Text>
    </Animated.View>
  );
}

// ---------------------------------------------------------------------------
// FPS screen-center helper
// ---------------------------------------------------------------------------

/**
 * Returns the screen center coordinates for FPS radial menus.
 *
 * In FPS mode the menu should open at the crosshair position (screen center).
 * Pass the returned `{ cx, cy }` as `centerX` / `centerY` to <RadialActionMenu>.
 *
 * Pure function — safe to call outside React render.
 */
export function getFpsScreenCenter(): { cx: number; cy: number } {
  const { width, height } = Dimensions.get("window");
  return { cx: width / 2, cy: height / 2 };
}

// ---------------------------------------------------------------------------
// Menu component
// ---------------------------------------------------------------------------

export function RadialActionMenu({
  open,
  actions,
  centerX,
  centerY,
  onSelect,
  onDismiss,
}: RadialActionMenuProps) {
  const reduceMotion = useReducedMotion();

  const angles = useMemo(() => {
    const count = actions.length;
    if (count === 0) return [];
    const startAngle = -Math.PI / 2; // Start from top (12 o'clock)
    return actions.map((_, i) => startAngle + (i / count) * 2 * Math.PI);
  }, [actions]);

  // Viewport edge clamping: shift center so all buttons stay visible
  const { cx, cy } = useMemo(() => {
    const { width: vw, height: vh } = Dimensions.get("window");
    const pad = RING_RADIUS + BUTTON_SIZE / 2 + EDGE_PADDING;
    return {
      cx: Math.min(Math.max(centerX, pad), vw - pad),
      cy: Math.min(Math.max(centerY, pad), vh - pad),
    };
  }, [centerX, centerY]);

  if (!open || actions.length === 0) return null;

  return (
    <View className="absolute inset-0" style={{ zIndex: 9997 }}>
      {/* Invisible backdrop for dismissal */}
      <Pressable
        className="absolute inset-0"
        onPress={onDismiss}
        accessibilityLabel="Close action menu"
      />

      {/* Radial container positioned at clamped center */}
      <View
        className="absolute"
        style={{
          left: cx,
          top: cy,
          width: 0,
          height: 0,
        }}
      >
        {/* Buttons */}
        {actions.map((action, i) => (
          <RadialButton
            key={action.id}
            action={action}
            angle={angles[i]}
            index={i}
            onSelect={onSelect}
            reduceMotion={reduceMotion}
          />
        ))}

        {/* Labels (separate layer to avoid clipping) */}
        {actions.map((action, i) => (
          <RadialLabel
            key={`label-${action.id}`}
            action={action}
            angle={angles[i]}
            index={i}
            reduceMotion={reduceMotion}
          />
        ))}
      </View>
    </View>
  );
}
