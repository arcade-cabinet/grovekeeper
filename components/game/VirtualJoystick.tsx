/**
 * VirtualJoystick -- Custom PanResponder-based joystick for mobile movement.
 *
 * Replaces the web nipplejs dependency with a native React Native
 * implementation. Features:
 * - Dead zone (~15% of max radius)
 * - Spring-back animation on release
 * - Knob physics clamped to outer ring
 * - Same callback interface (onMove with angle+force, onEnd)
 * - Visual: outer ring with cardinal dots + inner knob with gradient colors
 */

import type React from "react";
import { useCallback, useRef } from "react";
import { Animated, type GestureResponderEvent, PanResponder, View } from "react-native";
import { sharedTouchProvider } from "@/game/input/sharedTouchProvider";
import { triggerHaptic } from "@/game/systems/haptics";
import { computeJoystickZoneRect, type JoystickProvider } from "./joystickHandlers";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface JoystickMoveData {
  /** Normalized X direction (-1 to 1) */
  x: number;
  /** Normalized Z direction (-1 to 1, inverted Y for world coordinates) */
  z: number;
  /** Angle in radians */
  angle: number;
  /** Force / magnitude (0 to 1) */
  force: number;
}

export interface VirtualJoystickProps {
  /** Ref to write movement data into for the game loop to consume. */
  movementRef: React.RefObject<{ x: number; z: number }>;
  /** Called when joystick active state changes. */
  onActiveChange?: (active: boolean) => void;
  /** Called every move event with direction data. */
  onMove?: (data: JoystickMoveData) => void;
  /** Called when joystick is released. */
  onEnd?: () => void;
  /**
   * Override the TouchProvider instance for testing.
   * Production code leaves this undefined and the shared singleton is used.
   */
  providerOverride?: JoystickProvider;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const BASE_SIZE = 120;
const KNOB_SIZE = 52;
const MAX_RADIUS = (BASE_SIZE - KNOB_SIZE) / 2; // 34px
const DEAD_ZONE = 5; // ~15% of maxRadius

// ---------------------------------------------------------------------------
// Colors (matches original)
// ---------------------------------------------------------------------------

const OUTER_BG = "rgba(245, 240, 227, 0.85)";
const OUTER_BORDER = "#5D4037";
const KNOB_COLOR_START = "#4A7C59";
// Note: linear gradient not natively supported; using KNOB_COLOR_START as solid fallback
const KNOB_BORDER = "#3E2723";
const DOT_COLOR = "rgba(93, 64, 55, 0.3)";

// ---------------------------------------------------------------------------
// Cardinal dot positions (N, S, E, W)
// ---------------------------------------------------------------------------

// Cardinal dot positions computed from BASE_SIZE
// Center offset: BASE_SIZE/2 - dotSize/2 = 58
const DOT_SIZE = 4;
const DOT_CENTER = BASE_SIZE / 2 - DOT_SIZE / 2; // 58

interface DotStyle {
  top?: number;
  bottom?: number;
  left?: number;
  right?: number;
}

const CARDINAL_DOT_STYLES: DotStyle[] = [
  { top: 6, left: DOT_CENTER }, // N
  { bottom: 6, left: DOT_CENTER }, // S
  { left: 6, top: DOT_CENTER }, // W
  { right: 6, top: DOT_CENTER }, // E
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function VirtualJoystick({
  movementRef,
  onActiveChange,
  onMove,
  onEnd,
  providerOverride,
}: VirtualJoystickProps) {
  const provider = providerOverride ?? sharedTouchProvider;
  // Animated knob position
  const knobX = useRef(new Animated.Value(0)).current;
  const knobY = useRef(new Animated.Value(0)).current;

  // Center of the base ring in screen coordinates
  const centerRef = useRef({ x: 0, y: 0 });
  const isActive = useRef(false);

  const resetKnob = useCallback(() => {
    Animated.spring(knobX, {
      toValue: 0,
      speed: 50,
      bounciness: 8,
      useNativeDriver: true,
    }).start();
    Animated.spring(knobY, {
      toValue: 0,
      speed: 50,
      bounciness: 8,
      useNativeDriver: true,
    }).start();

    if (movementRef.current) {
      movementRef.current.x = 0;
      movementRef.current.z = 0;
    }
  }, [knobX, knobY, movementRef]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,

      onPanResponderGrant: (evt: GestureResponderEvent) => {
        isActive.current = true;

        // Measure the base center from the touch location's page coordinates
        // The center is where the component is, we use the layout
        // We record it from the native event
        const { pageX, pageY, locationX, locationY } = evt.nativeEvent;
        centerRef.current = {
          x: pageX - locationX + BASE_SIZE / 2,
          y: pageY - locationY + BASE_SIZE / 2,
        };

        // Stop any spring animation
        knobX.stopAnimation();
        knobY.stopAnimation();

        // Feed into TouchProvider so InputManager receives moveX/moveZ
        const zone = computeJoystickZoneRect(pageX, pageY, locationX, locationY, BASE_SIZE);
        provider.onTouchStart({ identifier: 0, clientX: pageX, clientY: pageY }, zone);

        onActiveChange?.(true);
        triggerHaptic("light");
      },

      onPanResponderMove: (evt: GestureResponderEvent) => {
        if (!isActive.current) return;

        const { pageX, pageY } = evt.nativeEvent;

        // Forward raw touch to TouchProvider — it computes moveX/moveZ internally
        provider.onTouchMove({ identifier: 0, clientX: pageX, clientY: pageY });

        const dx = pageX - centerRef.current.x;
        const dy = pageY - centerRef.current.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < DEAD_ZONE) {
          // Inside dead zone -- zero output, center knob
          knobX.setValue(0);
          knobY.setValue(0);
          if (movementRef.current) {
            movementRef.current.x = 0;
            movementRef.current.z = 0;
          }
          return;
        }

        const clampedDist = Math.min(dist, MAX_RADIUS);
        const magnitude = (clampedDist - DEAD_ZONE) / (MAX_RADIUS - DEAD_ZONE);
        const nx = dx / dist;
        const ny = dy / dist;

        // Write movement (invert Y for world Z)
        if (movementRef.current) {
          movementRef.current.x = nx * magnitude;
          movementRef.current.z = -(ny * magnitude);
        }

        // Position knob
        const knobPosX = nx * clampedDist;
        const knobPosY = ny * clampedDist;
        knobX.setValue(knobPosX);
        knobY.setValue(knobPosY);

        // Fire move callback
        onMove?.({
          x: nx * magnitude,
          z: -(ny * magnitude),
          angle: Math.atan2(ny, nx),
          force: magnitude,
        });
      },

      onPanResponderRelease: () => {
        isActive.current = false;
        provider.onTouchEnd();
        resetKnob();
        onActiveChange?.(false);
        onEnd?.();
      },

      onPanResponderTerminate: () => {
        isActive.current = false;
        provider.onTouchEnd();
        resetKnob();
        onActiveChange?.(false);
        onEnd?.();
      },
    }),
  ).current;

  return (
    <View
      style={{
        width: BASE_SIZE,
        height: BASE_SIZE,
      }}
      {...panResponder.panHandlers}
    >
      {/* Base ring */}
      <View
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          borderRadius: BASE_SIZE / 2,
          backgroundColor: OUTER_BG,
          borderWidth: 3,
          borderColor: OUTER_BORDER,
          shadowColor: "#1A3A2A",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.15,
          shadowRadius: 12,
          elevation: 4,
        }}
      >
        {/* Cardinal dots -- N / S / E / W compass hints */}
        {CARDINAL_DOT_STYLES.map((pos, i) => (
          <View
            key={i}
            style={{
              position: "absolute",
              width: DOT_SIZE,
              height: DOT_SIZE,
              borderRadius: DOT_SIZE / 2,
              backgroundColor: DOT_COLOR,
              ...pos,
            }}
          />
        ))}
      </View>

      {/* Knob */}
      <Animated.View
        style={{
          position: "absolute",
          top: BASE_SIZE / 2 - KNOB_SIZE / 2,
          left: BASE_SIZE / 2 - KNOB_SIZE / 2,
          width: KNOB_SIZE,
          height: KNOB_SIZE,
          borderRadius: KNOB_SIZE / 2,
          backgroundColor: KNOB_COLOR_START,
          borderWidth: 2,
          borderColor: KNOB_BORDER,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.2,
          shadowRadius: 8,
          elevation: 6,
          transform: [{ translateX: knobX }, { translateY: knobY }],
        }}
        pointerEvents="none"
      />
    </View>
  );
}
