/**
 * GamepadProvider -- Web Gamepad API input source (Spec §23)
 *
 * Implements IInputProvider by polling navigator.getGamepads() each frame.
 * Registers gamepadconnected / gamepaddisconnected event listeners to track
 * which gamepad index to read.
 *
 * Standard gamepad layout (Gamepad.mapping === "standard"):
 *   Axes 0,1  — left stick  → moveX / moveZ
 *   Axes 2,3  — right stick → lookDeltaX / lookDeltaY
 *   Button 0  — A           → jump
 *   Button 2  — X           → interact / use tool
 *   Button 4  — LB          → toolSwap -1 (previous tool)
 *   Button 5  — RB          → toolSwap +1 (next tool)
 *
 * Look sensitivity: radians-per-second applied to stick deflection × dt.
 * Axis dead-zone: sticks below DEAD_ZONE magnitude are treated as zero.
 *
 * See docs/architecture/input-system.md for full spec.
 */

import { type IInputProvider, type InputFrame } from "@/game/input/InputManager";

/** Minimum stick deflection magnitude before input is registered. */
const DEAD_ZONE = 0.12;

/** Radians per second for full right-stick deflection. */
const LOOK_SENSITIVITY = 2.5;

/** Standard gamepad button indices. */
const BTN_A = 0;
const BTN_X = 2;
const BTN_LB = 4;
const BTN_RB = 5;

export class GamepadProvider implements IInputProvider {
  readonly type = "gamepad";
  enabled = true;

  /** Index of the connected gamepad in navigator.getGamepads(). -1 if none. */
  private gamepadIndex = -1;

  /** Bound listener refs for cleanup. */
  private onConnected: (e: GamepadEvent) => void;
  private onDisconnected: (e: GamepadEvent) => void;

  constructor() {
    this.onConnected = (e: GamepadEvent) => {
      // Accept first connected gamepad if none tracked yet.
      if (this.gamepadIndex === -1) {
        this.gamepadIndex = e.gamepad.index;
      }
    };

    this.onDisconnected = (e: GamepadEvent) => {
      if (this.gamepadIndex === e.gamepad.index) {
        this.gamepadIndex = -1;
      }
    };

    if (typeof window !== "undefined") {
      window.addEventListener("gamepadconnected", this.onConnected);
      window.addEventListener("gamepaddisconnected", this.onDisconnected);

      // Pick up a gamepad that was already connected before this provider
      // was instantiated (browsers require a button press to expose it).
      const pads = navigator.getGamepads?.() ?? [];
      for (let i = 0; i < pads.length; i++) {
        const pad = pads[i];
        if (pad) {
          this.gamepadIndex = pad.index;
          break;
        }
      }
    }
  }

  /** Returns the active Gamepad object, or null if unavailable. */
  private getGamepad(): Gamepad | null {
    if (this.gamepadIndex === -1) return null;
    const pads = navigator.getGamepads?.() ?? [];
    return pads[this.gamepadIndex] ?? null;
  }

  /** Apply dead-zone: returns 0 when |value| <= DEAD_ZONE, else the value unchanged. */
  private applyDeadZone(value: number): number {
    return Math.abs(value) <= DEAD_ZONE ? 0 : value;
  }

  /** Returns true if a button is considered pressed (digital or analog >= 0.5). */
  private isPressed(gamepad: Gamepad, index: number): boolean {
    const button = gamepad.buttons[index];
    if (!button) return false;
    return typeof button === "object" ? button.pressed || button.value >= 0.5 : button;
  }

  poll(dt: number): Partial<InputFrame> {
    const gamepad = this.getGamepad();
    if (!gamepad) return {};

    // Left stick → movement
    const moveX = this.applyDeadZone(gamepad.axes[0] ?? 0);
    const moveZ = this.applyDeadZone(gamepad.axes[1] ?? 0);
    // Note: axes[1] is Y-down on left stick; invert so up-stick = forward (positive Z).
    // The InputManager clamps combined movement to unit circle.

    // Right stick → look (scale by sensitivity and dt for frame-rate independence)
    const lookDeltaX = this.applyDeadZone(gamepad.axes[2] ?? 0) * LOOK_SENSITIVITY * dt;
    const lookDeltaY = this.applyDeadZone(gamepad.axes[3] ?? 0) * LOOK_SENSITIVITY * dt;

    const jump = this.isPressed(gamepad, BTN_A);
    const interact = this.isPressed(gamepad, BTN_X);

    const nextTool = this.isPressed(gamepad, BTN_RB);
    const prevTool = this.isPressed(gamepad, BTN_LB);
    const toolSwap = nextTool ? 1 : prevTool ? -1 : 0;

    return {
      moveX,
      // Invert Y axis: stick forward (negative) → positive Z (forward in game).
      // Add 0 to coerce -0 to 0 (avoids Object.is(-0, 0) === false in tests).
      moveZ: -moveZ + 0,
      lookDeltaX,
      lookDeltaY,
      jump,
      interact,
      toolSwap,
    };
  }

  /** Gamepad state is fully polled each frame — no per-frame accumulators to reset. */
  postFrame(): void {
    // No accumulators to reset; all state is read fresh from navigator.getGamepads() each poll.
  }

  isAvailable(): boolean {
    if (typeof navigator === "undefined" || !navigator.getGamepads) return false;
    return this.gamepadIndex !== -1 && this.getGamepad() !== null;
  }

  dispose(): void {
    if (typeof window !== "undefined") {
      window.removeEventListener("gamepadconnected", this.onConnected);
      window.removeEventListener("gamepaddisconnected", this.onDisconnected);
    }
    this.gamepadIndex = -1;
  }
}
