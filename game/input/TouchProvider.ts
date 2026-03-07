/**
 * TouchProvider -- Mobile touch input: virtual joystick + viewport swipe-to-look + action buttons (Spec §23)
 *
 * Unlike KeyboardMouseProvider, this provider exposes a call-based API that
 * React overlay components (VirtualJoystick, TouchOverlay) invoke directly via
 * refs. No window event listeners are registered -- React elements own the DOM
 * events. This makes dispose() trivially simple and keeps the provider testable
 * without event simulation.
 *
 * Maps:
 *   Joystick drag (left zone)   -> moveX / moveZ (held; resets on onTouchEnd)
 *   Viewport swipe (right half)  -> lookDeltaX / lookDeltaY (accumulated per frame)
 *   USE button (onInteractStart) -> interact (edge-triggered, resets each postFrame)
 *   CYCLE button (onToolCycleStart) -> toolSwap = 1 (edge-triggered, resets each postFrame)
 *
 * See docs/architecture/touch-controls.md for layout and sensitivity constants.
 */

import type { IInputProvider, InputFrame } from "@/game/input/InputManager";

/** Radians per pixel of viewport swipe for look control. */
const LOOK_SENSITIVITY = 0.003;

/** Pixels from joystick zone center at which movement reaches full magnitude. */
const JOYSTICK_MAX_RADIUS = 40;

/** Minimal touch point shape -- subset of the browser Touch interface. */
interface TouchPoint {
  readonly identifier: number;
  readonly clientX: number;
  readonly clientY: number;
}

/** Minimal zone rect shape -- subset of DOMRect. */
interface ZoneRect {
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
}

export class TouchProvider implements IInputProvider {
  readonly type = "touch";
  enabled = true;

  // ── Joystick state ────────────────────────────────
  private joystickCenter = { x: 0, y: 0 };
  private isDragging = false;
  private moveX = 0;
  private moveZ = 0;

  // ── Viewport look state ───────────────────────────
  private lookTouchId: number | null = null;
  private lastLookPos = { x: 0, y: 0 };
  private lookDeltaX = 0;
  private lookDeltaY = 0;

  // ── Action button state (edge-triggered) ─────────
  private interactPressed = false;
  private toolSwapAccum = 0;

  // ── Joystick public API ───────────────────────────

  /** Called by the joystick zone's touchstart handler. */
  onTouchStart(touch: TouchPoint, zoneRect: ZoneRect): void {
    this.isDragging = true;
    this.joystickCenter.x = zoneRect.left + zoneRect.width / 2;
    this.joystickCenter.y = zoneRect.top + zoneRect.height / 2;
    this.updateFromTouch(touch);
  }

  /** Called by the joystick zone's touchmove handler. */
  onTouchMove(touch: TouchPoint): void {
    if (!this.isDragging) return;
    this.updateFromTouch(touch);
  }

  /** Called by the joystick zone's touchend/touchcancel handler. */
  onTouchEnd(): void {
    this.isDragging = false;
    this.moveX = 0;
    this.moveZ = 0;
  }

  private updateFromTouch(touch: TouchPoint): void {
    let dx = touch.clientX - this.joystickCenter.x;
    let dy = touch.clientY - this.joystickCenter.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // Clamp displacement to maxRadius so normalized output stays within [-1, 1]
    if (dist > JOYSTICK_MAX_RADIUS) {
      dx = (dx / dist) * JOYSTICK_MAX_RADIUS;
      dy = (dy / dist) * JOYSTICK_MAX_RADIUS;
    }

    this.moveX = dx / JOYSTICK_MAX_RADIUS;
    // Screen Y-down maps to world Z-backward; invert so up = forward
    this.moveZ = -(dy / JOYSTICK_MAX_RADIUS);
  }

  // ── Viewport look public API ──────────────────────

  /** Called by the viewport overlay's touchstart handler (right-half swipe zone). */
  onViewportTouchStart(touch: TouchPoint): void {
    this.lookTouchId = touch.identifier;
    this.lastLookPos.x = touch.clientX;
    this.lastLookPos.y = touch.clientY;
  }

  /** Called by the viewport overlay's touchmove handler. Accumulates look deltas. */
  onViewportTouchMove(touch: TouchPoint): void {
    if (touch.identifier !== this.lookTouchId) return;
    this.lookDeltaX += (touch.clientX - this.lastLookPos.x) * LOOK_SENSITIVITY;
    this.lookDeltaY += (touch.clientY - this.lastLookPos.y) * LOOK_SENSITIVITY;
    this.lastLookPos.x = touch.clientX;
    this.lastLookPos.y = touch.clientY;
  }

  /** Called by the viewport overlay's touchend/touchcancel handler. */
  onViewportTouchEnd(touch: Pick<TouchPoint, "identifier">): void {
    if (touch.identifier !== this.lookTouchId) return;
    this.lookTouchId = null;
    this.lookDeltaX = 0;
    this.lookDeltaY = 0;
  }

  // ── Action button public API ──────────────────────

  /** Called by the USE button's touchstart handler. Edge-triggered. */
  onInteractStart(): void {
    this.interactPressed = true;
  }

  /** Called by the CYCLE button's touchstart handler. Edge-triggered. */
  onToolCycleStart(): void {
    this.toolSwapAccum += 1;
  }

  // ── IInputProvider ────────────────────────────────

  poll(_dt: number): Partial<InputFrame> {
    return {
      moveX: this.moveX,
      moveZ: this.moveZ,
      lookDeltaX: this.lookDeltaX,
      lookDeltaY: this.lookDeltaY,
      interact: this.interactPressed,
      toolSwap: this.toolSwapAccum > 0 ? 1 : this.toolSwapAccum < 0 ? -1 : 0,
    };
  }

  /** Reset per-frame accumulators after InputManager has consumed this frame. */
  postFrame(): void {
    this.lookDeltaX = 0;
    this.lookDeltaY = 0;
    this.interactPressed = false;
    this.toolSwapAccum = 0;
    // moveX / moveZ are NOT reset here -- they are held state (like held keys)
  }

  isAvailable(): boolean {
    return (
      typeof window !== "undefined" && ("ontouchstart" in window || navigator.maxTouchPoints > 0)
    );
  }

  /** Zeros all state. No event listeners to remove. */
  dispose(): void {
    this.isDragging = false;
    this.moveX = 0;
    this.moveZ = 0;
    this.lookTouchId = null;
    this.lookDeltaX = 0;
    this.lookDeltaY = 0;
    this.interactPressed = false;
    this.toolSwapAccum = 0;
  }
}
