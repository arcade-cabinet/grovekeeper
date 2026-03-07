/**
 * TouchLookZone -- Right-half swipe area driving FPS camera look on mobile (Spec §23).
 *
 * Covers the right 50% of the screen (absolute overlay). Transparent — no
 * visible chrome. Uses React Native PanResponder to track finger movement and
 * forwards deltas to TouchProvider via its call-based API.
 *
 * Sensitivity: LOOK_SENSITIVITY (radians per pixel) is defined here as a named
 * constant so it can be moved to config/game/controls.json in a future pass.
 * The dead zone suppresses jitter from resting fingers or incidental contact.
 *
 * API contract: calls TouchProvider.onViewportTouchStart / onViewportTouchMove /
 * onViewportTouchEnd. Those methods accumulate look deltas internally and reset
 * them each postFrame(). This component never reads from TouchProvider — it only
 * pushes events.
 */

import { useRef, useMemo } from "react";
import {
  type GestureResponderEvent,
  PanResponder,
  StyleSheet,
  View,
} from "react-native";
import { TouchProvider } from "@/game/input/TouchProvider";

// ── Tuning constants (move to config/game/controls.json when config loader exists) ──

/**
 * Radians per pixel for viewport swipe look control.
 * Matches LOOK_SENSITIVITY inside TouchProvider so both routes produce
 * the same camera speed.
 */
export const LOOK_SENSITIVITY = 0.003;

/**
 * Minimum pixel displacement required to register a look event.
 * Movements smaller than this are ignored to suppress resting-finger jitter.
 */
export const LOOK_DEAD_ZONE = 2;

// ── Pure testable logic ───────────────────────────────────────────────────────

/**
 * Given a raw gesture delta (dx, dy in pixels), return the scaled look delta
 * in radians after applying sensitivity and dead zone.
 *
 * Returns null when the displacement is within the dead zone (no look event
 * should be fired).
 *
 * Exported so tests can verify sensitivity scaling and dead zone without
 * any PanResponder or React context.
 */
export function computeLookDelta(
  dx: number,
  dy: number,
  sensitivity: number,
  deadZone: number,
): { scaledDx: number; scaledDy: number } | null {
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist < deadZone) return null;
  return {
    scaledDx: dx * sensitivity,
    scaledDy: dy * sensitivity,
  };
}

// ── LookZoneRefs type (testable seam) ─────────────────────────────────────────

/** Mutable refs used by the look zone PanResponder handlers. */
export interface LookZoneRefs {
  activeTouchId: { current: number | null };
  prevPos: { current: { x: number; y: number } };
}

/** Minimal provider interface required by the look zone handlers. */
export type LookZoneProvider = Pick<
  TouchProvider,
  "onViewportTouchStart" | "onViewportTouchMove" | "onViewportTouchEnd"
>;

/**
 * Builds the PanResponder handler callbacks for the look zone.
 *
 * Extracted from the component so tests can exercise the handler logic
 * directly without a React rendering context or Hook constraints.
 *
 * @param refs  - Mutable ref objects for tracking active touch state.
 * @param provider - TouchProvider instance to forward events to.
 */
export function buildLookZoneHandlers(refs: LookZoneRefs, provider: LookZoneProvider) {
  return {
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderTerminationRequest: () => false,

    onPanResponderGrant: (evt: GestureResponderEvent) => {
      const { identifier, pageX, pageY } = evt.nativeEvent;
      const touchId = Number(identifier);
      refs.activeTouchId.current = touchId;
      refs.prevPos.current = { x: pageX, y: pageY };
      provider.onViewportTouchStart({
        identifier: touchId,
        clientX: pageX,
        clientY: pageY,
      });
    },

    onPanResponderMove: (evt: GestureResponderEvent) => {
      const { identifier, pageX, pageY } = evt.nativeEvent;
      if (Number(identifier) !== refs.activeTouchId.current) return;

      const dx = pageX - refs.prevPos.current.x;
      const dy = pageY - refs.prevPos.current.y;

      // Dead zone: skip if movement is too small
      const result = computeLookDelta(dx, dy, LOOK_SENSITIVITY, LOOK_DEAD_ZONE);
      if (result === null) return;

      // Update previous position only when we accept the move
      refs.prevPos.current = { x: pageX, y: pageY };

      // Forward raw pixel position to provider; provider applies its own
      // sensitivity internally via LOOK_SENSITIVITY in TouchProvider.ts.
      provider.onViewportTouchMove({
        identifier: Number(identifier),
        clientX: pageX,
        clientY: pageY,
      });
    },

    onPanResponderRelease: (evt: GestureResponderEvent) => {
      const { identifier } = evt.nativeEvent;
      provider.onViewportTouchEnd({ identifier: Number(identifier) });
      refs.activeTouchId.current = null;
    },

    onPanResponderTerminate: (evt: GestureResponderEvent) => {
      const id = refs.activeTouchId.current ?? Number(evt.nativeEvent.identifier);
      provider.onViewportTouchEnd({ identifier: id });
      refs.activeTouchId.current = null;
    },
  };
}

// ── Module-level singleton ────────────────────────────────────────────────────

/**
 * Singleton TouchProvider instance.
 * TouchProvider uses a call-based API (no window listeners) — components
 * call its methods directly. A module-level singleton is created once.
 */
const touchProvider = new TouchProvider();

/** Exposes the shared TouchProvider for registration in InputManager at app init. */
export { touchProvider as touchLookZoneProvider };

// ── Props ─────────────────────────────────────────────────────────────────────

export interface TouchLookZoneProps {
  /**
   * Override the TouchProvider instance for testing.
   * Production code leaves this undefined and the module-level instance is used.
   */
  providerOverride?: LookZoneProvider;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function TouchLookZone({ providerOverride }: TouchLookZoneProps = {}) {
  const provider = providerOverride ?? touchProvider;

  // Mutable refs for handler state (no re-render on change)
  const activeTouchIdRef = useRef<number | null>(null);
  const prevPosRef = useRef({ x: 0, y: 0 });

  const panResponder = useMemo(
    () =>
      PanResponder.create(
        buildLookZoneHandlers(
          { activeTouchId: activeTouchIdRef, prevPos: prevPosRef },
          provider,
        ),
      ),
    // provider reference is stable (module singleton or test override passed once)
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  return (
    <View
      style={styles.zone}
      pointerEvents="box-only"
      {...panResponder.panHandlers}
    />
  );
}

const styles = StyleSheet.create({
  zone: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    // Cover the right 50% of the screen
    width: "50%",
    // Fully transparent — purely a touch capture surface
    backgroundColor: "transparent",
  },
});
