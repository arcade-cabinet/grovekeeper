/**
 * joystickHandlers.ts -- Pure helpers for VirtualJoystick -> TouchProvider wiring (Spec §23).
 *
 * No React Native imports — Animated values are abstracted via a duck-typed
 * interface so this module is fully testable without a React Native runtime.
 *
 * Mirrors the buildLookZoneHandlers pattern in components/player/TouchLookZone.tsx.
 */

/** Minimal TouchProvider interface required by joystick gesture handlers. */
export interface JoystickProvider {
  onTouchStart(
    touch: { identifier: number; clientX: number; clientY: number },
    zone: { left: number; top: number; width: number; height: number },
  ): void;
  onTouchMove(touch: { identifier: number; clientX: number; clientY: number }): void;
  onTouchEnd(): void;
}

/**
 * Compute the joystick zone rect from a grant event's page / location coordinates.
 *
 * The component's top-left corner is at (pageX - locationX, pageY - locationY).
 * The rect size is fixed at BASE_SIZE x BASE_SIZE.
 *
 * Exported as a pure function so tests can verify coordinate math without
 * any React Native context.
 */
export function computeJoystickZoneRect(
  pageX: number,
  pageY: number,
  locationX: number,
  locationY: number,
  baseSize: number,
): { left: number; top: number; width: number; height: number } {
  return {
    left: pageX - locationX,
    top: pageY - locationY,
    width: baseSize,
    height: baseSize,
  };
}
