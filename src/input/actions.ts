/**
 * Action map — declarative names the gameplay layer reads, decoupled
 * from the underlying device (keyboard / touch / gamepad).
 *
 * Spec ref: `docs/superpowers/specs/2026-04-24-grovekeeper-rc-redesign-design.md`
 *   "Action-mapping is DIY thin layer over engine input — we name
 *    actions (`move`, `interact`, `swing`, `place`, `open-craft`)."
 *
 * `move` carries an analog 2D vector (XZ planar in world units, with
 * +Z forward). All other actions are momentary buttons exposing
 * `pressed` (held this frame) plus `justPressed` (rising edge).
 *
 * The input layer never reads `Math.random` and contains no DOM
 * handles itself — wiring lives in `inputManager.ts` (engine bridge)
 * and `nipplejsAdapter.ts` (touchscreen overlay).
 */

/** Vector2 result for the `move` action. Magnitude is in `[0, 1]`. */
export interface MoveVector {
  /** Strafe component: -1 left … +1 right. */
  x: number;
  /** Forward / back component: -1 forward … +1 back. */
  z: number;
}

/** Button result for momentary actions like `interact`, `swing`, … */
export interface ButtonState {
  /** True the entire time the button is held. */
  pressed: boolean;
  /** True only on the rising edge (frame the button went down). */
  justPressed: boolean;
}

/** All known action names. Add new entries here, never inline strings. */
export const ACTIONS = [
  "move",
  "interact",
  "swing",
  "place",
  "open-craft",
] as const;
export type Action = (typeof ACTIONS)[number];

/** The buttons subset of `Action`. `move` is the only analog. */
export type ButtonAction = Exclude<Action, "move">;
export const BUTTON_ACTIONS: readonly ButtonAction[] = [
  "interact",
  "swing",
  "place",
  "open-craft",
];

/**
 * Type-level dispatch from action name → return shape. Lets call sites
 * write `getActionState('move')` and pull `MoveVector`, while
 * `getActionState('swing')` resolves to `ButtonState`.
 */
export type ActionState<A extends Action> = A extends "move"
  ? MoveVector
  : ButtonState;

/** Default keyboard binding table. Not user-configurable yet. */
export interface KeyboardBindings {
  /** Forward (e.g. "KeyW", "ArrowUp"). */
  moveForward: readonly string[];
  /** Back. */
  moveBack: readonly string[];
  /** Strafe left. */
  moveLeft: readonly string[];
  /** Strafe right. */
  moveRight: readonly string[];
  /** Interact / talk / pick up. */
  interact: readonly string[];
  /** Tool swing / attack. */
  swing: readonly string[];
  /** Place block / structure. */
  place: readonly string[];
  /** Open craft menu. */
  openCraft: readonly string[];
}

export const DEFAULT_KEY_BINDINGS: KeyboardBindings = {
  moveForward: ["KeyW", "ArrowUp"],
  moveBack: ["KeyS", "ArrowDown"],
  moveLeft: ["KeyA", "ArrowLeft"],
  moveRight: ["KeyD", "ArrowRight"],
  interact: ["KeyE"],
  swing: ["Space"],
  place: ["KeyF"],
  openCraft: ["KeyC"],
};

export const ZERO_MOVE: MoveVector = Object.freeze({ x: 0, z: 0 });
export const RELEASED_BUTTON: ButtonState = Object.freeze({
  pressed: false,
  justPressed: false,
});
