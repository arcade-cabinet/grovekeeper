/**
 * Input module barrel — action-mapped input wrapper over the Jolly
 * Pixel engine's `Input`, plus a nipplejs adapter for touchscreens.
 *
 * Other modules import from `@/input` rather than reaching into
 * individual files. See `actions.ts` for the action enum,
 * `inputManager.ts` for the engine bridge, and `nipplejsAdapter.ts`
 * for the on-screen virtual joystick.
 */

export {
  ACTIONS,
  BUTTON_ACTIONS,
  DEFAULT_KEY_BINDINGS,
  RELEASED_BUTTON,
  ZERO_MOVE,
} from "./actions";
export type {
  Action,
  ActionState,
  ButtonAction,
  ButtonState,
  KeyboardBindings,
  MoveVector,
} from "./actions";

export { InputManager } from "./inputManager";
export type {
  EngineInput,
  InputManagerOptions,
  InputSource,
  JoystickVector,
} from "./inputManager";

export { isTouchscreen, mountNipplejsAdapter } from "./nipplejsAdapter";
export type {
  NipplejsAdapterHandle,
  NipplejsAdapterOptions,
} from "./nipplejsAdapter";
