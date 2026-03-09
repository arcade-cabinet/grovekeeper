/**
 * KeyboardMouseProvider -- Desktop keyboard + pointer-locked mouse input (Spec §23)
 *
 * Maps:
 *   WASD / Arrow keys  -> moveX / moveZ
 *   Mouse move (locked) -> lookDeltaX / lookDeltaY
 *   Space              -> jump (edge-triggered, resets each postFrame)
 *   E                  -> interact (edge-triggered, resets each postFrame)
 *   Shift              -> sprint (held)
 *   Scroll wheel       -> toolSwap (-1 / 0 / +1, first non-zero wins)
 *   1-9                -> toolSelect (direct tool slot, edge-triggered)
 *
 * Registers on window events. Requires pointer lock for mouse look.
 */

import type { IInputProvider, InputFrame } from "@/game/input/InputManager";

/** Radians per pixel of mouse movement (pointer-locked). */
const LOOK_SENSITIVITY = 0.002;

export class KeyboardMouseProvider implements IInputProvider {
  readonly type = "keyboard-mouse";
  enabled = true;

  private readonly heldKeys = new Set<string>();
  private lookDeltaX = 0;
  private lookDeltaY = 0;
  private jumpPressed = false;
  private interactPressed = false;
  private toolSwapAccum = 0;
  private toolSelectSlot = 0;

  constructor() {
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
    window.addEventListener("mousemove", this.onMouseMove);
    window.addEventListener("wheel", this.onWheel, { passive: true });
  }

  // ── Event handlers ──────────────────────────────

  private readonly onKeyDown = (e: KeyboardEvent): void => {
    this.heldKeys.add(e.code);
    if (e.code === "Space") {
      e.preventDefault();
      this.jumpPressed = true;
    }
    if (e.code === "KeyE") {
      this.interactPressed = true;
    }
    // Number keys 1-9 for direct tool slot selection (Spec §11, §23)
    if (e.code >= "Digit1" && e.code <= "Digit9") {
      this.toolSelectSlot = Number.parseInt(e.code.charAt(5), 10);
    }
  };

  private readonly onKeyUp = (e: KeyboardEvent): void => {
    this.heldKeys.delete(e.code);
  };

  private readonly onMouseMove = (e: MouseEvent): void => {
    if (!document.pointerLockElement) return;
    this.lookDeltaX += e.movementX * LOOK_SENSITIVITY;
    this.lookDeltaY += e.movementY * LOOK_SENSITIVITY;
  };

  private readonly onWheel = (e: WheelEvent): void => {
    this.toolSwapAccum += e.deltaY > 0 ? 1 : -1;
  };

  // ── IInputProvider ───────────────────────────────

  poll(_dt: number): Partial<InputFrame> {
    const right = (this.heldKeys.has("KeyD") ? 1 : 0) + (this.heldKeys.has("ArrowRight") ? 1 : 0);
    const left = (this.heldKeys.has("KeyA") ? 1 : 0) + (this.heldKeys.has("ArrowLeft") ? 1 : 0);
    const forward = (this.heldKeys.has("KeyW") ? 1 : 0) + (this.heldKeys.has("ArrowUp") ? 1 : 0);
    const back = (this.heldKeys.has("KeyS") ? 1 : 0) + (this.heldKeys.has("ArrowDown") ? 1 : 0);

    return {
      moveX: Math.sign(right - left),
      moveZ: Math.sign(forward - back),
      lookDeltaX: this.lookDeltaX,
      lookDeltaY: this.lookDeltaY,
      jump: this.jumpPressed,
      interact: this.interactPressed,
      sprint: this.heldKeys.has("ShiftLeft") || this.heldKeys.has("ShiftRight"),
      toolSwap: this.toolSwapAccum > 0 ? 1 : this.toolSwapAccum < 0 ? -1 : 0,
      toolSelect: this.toolSelectSlot,
    };
  }

  /** Reset per-frame accumulators after the InputManager has consumed this frame. */
  postFrame(): void {
    this.lookDeltaX = 0;
    this.lookDeltaY = 0;
    this.jumpPressed = false;
    this.interactPressed = false;
    this.toolSwapAccum = 0;
    this.toolSelectSlot = 0;
  }

  isAvailable(): boolean {
    return true;
  }

  dispose(): void {
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
    window.removeEventListener("mousemove", this.onMouseMove);
    window.removeEventListener("wheel", this.onWheel);
    this.heldKeys.clear();
  }
}
