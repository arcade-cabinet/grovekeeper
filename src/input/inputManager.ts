/**
 * InputManager — thin action-mapping layer over the Jolly Pixel
 * engine's `Input` (`world.input`). Action names (`move`, `interact`,
 * `swing`, …) decouple gameplay code from key codes / touch indices.
 *
 * Pattern lifted from voxel-realms' `src/scene/player-behavior.ts`
 * which calls `world.input.isKeyDown("KeyW") || isKeyDown("ArrowUp")`
 * inline; here we hoist that into a named action so the player
 * controller, NPC interaction prompts, build menu, etc. all read the
 * same enum-keyed shape.
 *
 * What this class is NOT:
 *   - It does not own any DOM listeners. The engine's `Input` already
 *     wires `keydown` / `keyup` / `touchstart` / pointer events on the
 *     canvas. We just sample its state.
 *   - It does not own the joystick DOM. `nipplejsAdapter.ts` mounts
 *     the joystick over the canvas and pushes its vector into the
 *     manager via `setJoystickVector`.
 *   - It does not run a per-frame tick. Callers that need rising-edge
 *     detection call `endFrame()` after they consume input for the
 *     frame, which copies `prevKeysHeld` → snapshot for the next
 *     frame's `justPressed` checks.
 *
 * Coordinate convention (matches voxel-realms' player controller):
 *   - +X is world-right, +Z is world-forward (camera looks down +Z).
 *   - "Forward" key (W / ArrowUp) emits `z = -1` because the camera
 *     sits behind the player at positive Z; pressing W moves the
 *     player toward the camera's -Z which feels like "forward" on
 *     screen.
 */

import type { Input } from "@jolly-pixel/engine";
import {
  type Action,
  type ActionState,
  BUTTON_ACTIONS,
  type ButtonAction,
  type ButtonState,
  DEFAULT_KEY_BINDINGS,
  type KeyboardBindings,
  type MoveVector,
  RELEASED_BUTTON,
  ZERO_MOVE,
} from "./actions";

/** Subset of the engine's `Input` we depend on, stubbable in tests. */
export interface InputSource {
  isKeyDown(key: string): boolean;
}

/** Active joystick reading, normalized to magnitude ≤ 1. */
export interface JoystickVector {
  /** Strafe (-1 … +1). */
  x: number;
  /** Forward / back (-1 … +1). +Z = back, -Z = forward (see file header). */
  z: number;
}

export interface InputManagerOptions {
  /** Engine input source. Pass `runtime.world.input`. */
  input: InputSource;
  /** Override default WASD bindings. */
  bindings?: KeyboardBindings;
}

export class InputManager {
  private readonly input: InputSource;
  private readonly bindings: KeyboardBindings;

  /** Latest joystick reading, or null if no joystick is active. */
  private joystick: JoystickVector | null = null;

  /** Held-state of each button this frame. Updated lazily on read. */
  private buttonsHeld: Record<ButtonAction, boolean> = {
    interact: false,
    swing: false,
    place: false,
    "open-craft": false,
  };
  /** Held-state from the previous frame, used for rising-edge detect. */
  private buttonsHeldPrev: Record<ButtonAction, boolean> = {
    interact: false,
    swing: false,
    place: false,
    "open-craft": false,
  };

  constructor(options: InputManagerOptions) {
    this.input = options.input;
    this.bindings = options.bindings ?? DEFAULT_KEY_BINDINGS;
  }

  /**
   * Joystick adapters call this when the stick moves. Pass `null`
   * (or all-zero) to release. Kept separate from keyboard so the two
   * input modes can stack additively (e.g. WASD + thumbstick on a
   * laptop with a touchscreen).
   */
  setJoystickVector(vector: JoystickVector | null): void {
    if (vector === null) {
      this.joystick = null;
      return;
    }
    // Clamp magnitude to 1 so a too-long joystick handle can't outrun
    // keyboard input. Zero-length stays null so we don't accidentally
    // emit a near-zero direction.
    const len = Math.hypot(vector.x, vector.z);
    if (len < 1e-4) {
      this.joystick = null;
      return;
    }
    if (len > 1) {
      this.joystick = { x: vector.x / len, z: vector.z / len };
    } else {
      this.joystick = { x: vector.x, z: vector.z };
    }
  }

  /**
   * Read the current state for an action. Return shape depends on the
   * action: `move` → `MoveVector`, all buttons → `ButtonState`.
   */
  getActionState<A extends Action>(action: A): ActionState<A> {
    if (action === "move") {
      return this.readMove() as ActionState<A>;
    }
    return this.readButton(action as ButtonAction) as ActionState<A>;
  }

  /**
   * Bookkeeping for rising-edge detection. Call once per frame *after*
   * gameplay consumed `getActionState` for that frame. Cheap (O(1)).
   */
  endFrame(): void {
    for (const a of BUTTON_ACTIONS) {
      this.buttonsHeldPrev[a] = this.buttonsHeld[a];
    }
  }

  // ---- internals ----

  private readMove(): MoveVector {
    const { input, bindings } = this;
    let x = 0;
    let z = 0;

    for (const k of bindings.moveForward) if (input.isKeyDown(k)) z -= 1;
    for (const k of bindings.moveBack) if (input.isKeyDown(k)) z += 1;
    for (const k of bindings.moveLeft) if (input.isKeyDown(k)) x -= 1;
    for (const k of bindings.moveRight) if (input.isKeyDown(k)) x += 1;

    // Joystick overrides keyboard when active. We don't *add* them so
    // the analog magnitude is preserved; if both are pushed at once,
    // the joystick wins. (Keyboard stays at unit length, which would
    // dominate any partial joystick deflection if we added.)
    if (this.joystick) {
      return this.joystick;
    }

    if (x === 0 && z === 0) return ZERO_MOVE;

    // Normalise diagonal keyboard input so W+D doesn't run faster than
    // straight W. Single-axis input length is already 1.
    const len = Math.hypot(x, z);
    return { x: x / len, z: z / len };
  }

  private readButton(action: ButtonAction): ButtonState {
    const keys = this.keysFor(action);
    let held = false;
    for (const k of keys) {
      if (this.input.isKeyDown(k)) {
        held = true;
        break;
      }
    }
    this.buttonsHeld[action] = held;
    if (!held) return RELEASED_BUTTON;
    const justPressed = !this.buttonsHeldPrev[action];
    return { pressed: true, justPressed };
  }

  private keysFor(action: ButtonAction): readonly string[] {
    switch (action) {
      case "interact":
        return this.bindings.interact;
      case "swing":
        return this.bindings.swing;
      case "place":
        return this.bindings.place;
      case "open-craft":
        return this.bindings.openCraft;
    }
  }
}

/**
 * Narrowed type alias for code that only needs the engine's `Input`
 * shape — keeps imports tidy at call sites.
 */
export type EngineInput = Pick<Input, "isKeyDown">;
