/**
 * Input module barrel — action-mapped input wrapper over the Jolly
 * Pixel engine's `Input`, plus a nipplejs adapter for touchscreens.
 *
 * Other modules import from `@/input` rather than reaching into
 * individual files. See `actions.ts` for the action enum,
 * `inputManager.ts` for the engine bridge, and `nipplejsAdapter.ts`
 * for the on-screen virtual joystick.
 */

export type {
  Action,
  ActionState,
  ButtonAction,
  ButtonState,
  KeyboardBindings,
  MoveVector,
} from "./actions";
export {
  ACTIONS,
  BUTTON_ACTIONS,
  DEFAULT_KEY_BINDINGS,
  RELEASED_BUTTON,
  ZERO_MOVE,
} from "./actions";
export type {
  EngineInput,
  InputManagerOptions,
  InputSource,
  JoystickVector,
} from "./inputManager";
export { InputManager } from "./inputManager";
export type {
  NipplejsAdapterHandle,
  NipplejsAdapterOptions,
} from "./nipplejsAdapter";
export { isTouchscreen, mountNipplejsAdapter } from "./nipplejsAdapter";
