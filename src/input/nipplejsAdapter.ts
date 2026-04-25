/**
 * nipplejsAdapter — mounts a virtual joystick on the bottom-left of a
 * host element and forwards its analog vector into an `InputManager`
 * via `setJoystickVector`.
 *
 * Only mounted on touchscreens (detected at construct time). On a
 * desktop browser this returns a no-op handle so the same boot code
 * works on both targets without special-casing in `runtime.ts`.
 *
 * The spec calls out nipplejs explicitly:
 *   "Mobile virtual joystick uses `nipplejs` (already a project dep)
 *    on top of engine touch polling."
 *
 * voxel-realms shipped a hand-rolled `FloatingJoystick` React atom
 * (see `voxel-realms/app/atoms/floating-joystick.tsx`); for Grovekeeper
 * we lean on nipplejs directly so we don't have to reimplement the
 * pointer maths or have a Solid component to mount.
 *
 * The adapter does NOT touch the engine itself — it pumps a
 * dependency-inverted callback so tests can drive it without any
 * DOM or canvas.
 *
 * Type note: nipplejs@1.0.1 only exports `create`, `factory`,
 * `setLogLevel`, `getLogLevel` and the default object — its internal
 * types (`Collection`, `JoystickEventData`, `InternalEvent`) are not
 * named in the package's public surface. We define the shape we read
 * inline as `JoystickMoveEvent` and trust the runtime payload.
 */

import nipplejs from "nipplejs";
import type { InputManager, JoystickVector } from "./inputManager";

/**
 * Subset of nipplejs' `InternalEvent<JoystickEventData>` that we read
 * in `move` handlers. Inlined because nipplejs 1.x doesn't export the
 * type. Field shapes match `JoystickEventData` in the package's
 * `dist/index.d.ts`.
 */
interface JoystickMoveEvent {
  data?: { vector?: { x: number; y: number } };
}

/**
 * Public surface of the nipplejs `Collection` we depend on. Same
 * inline-type rationale as `JoystickMoveEvent`.
 */
interface JoystickCollection {
  // biome-ignore lint/suspicious/noExplicitAny: nipplejs event signatures are wide
  on(event: "move", cb: (evt: any, data: any) => void): void;
  // biome-ignore lint/suspicious/noExplicitAny: same
  on(event: "end", cb: (evt: any) => void): void;
  // biome-ignore lint/suspicious/noExplicitAny: same
  off(event: "move", cb: (evt: any, data: any) => void): void;
  // biome-ignore lint/suspicious/noExplicitAny: same
  off(event: "end", cb: (evt: any) => void): void;
  destroy(): void;
}

export interface NipplejsAdapterOptions {
  /** Where to mount the joystick zone (typically the canvas's parent). */
  zone: HTMLElement;
  /** Manager that should receive joystick vectors. */
  inputManager: InputManager;
  /**
   * Force-enable on non-touch devices. Defaults to false. Useful for
   * dev / demo builds where you want a thumbstick on a laptop.
   */
  forceEnable?: boolean;
}

export interface NipplejsAdapterHandle {
  /** True once the joystick DOM is live. False on desktop / disabled. */
  readonly active: boolean;
  /** Tear down listeners + remove DOM. Idempotent. */
  destroy(): void;
}

/** Detect a touchscreen at construct time. */
export function isTouchscreen(): boolean {
  if (typeof window === "undefined") return false;
  // `ontouchstart` is the canonical sniff; `maxTouchPoints` covers
  // hybrid devices (Surface, iPad with mouse, etc.). We only need one
  // signal to flip.
  if ("ontouchstart" in window) return true;
  if (
    typeof navigator !== "undefined" &&
    typeof navigator.maxTouchPoints === "number" &&
    navigator.maxTouchPoints > 0
  ) {
    return true;
  }
  return false;
}

/**
 * Mount a joystick on `zone` (only if touchscreen, unless forced) and
 * wire its move/end events into `inputManager`.
 *
 * Returns a no-op handle when the device isn't a touchscreen, so the
 * caller can unconditionally store + dispose.
 */
export function mountNipplejsAdapter(
  options: NipplejsAdapterOptions,
): NipplejsAdapterHandle {
  const enabled = options.forceEnable === true || isTouchscreen();
  if (!enabled) {
    return { active: false, destroy() {} };
  }

  // nipplejs' published `CollectionOptions` is restrictive about
  // arbitrary positions / sizes; our cast routes through `unknown`
  // so we don't pull `any` into the local scope.
  const createOptions: unknown = {
    zone: options.zone,
    mode: "dynamic",
    color: "#bdf472",
    size: 120,
    // Bottom-left half of the host. nipplejs draws the stick where the
    // user touches inside this zone — `dynamic` mode means the
    // joystick base appears at finger-down, not at a fixed point.
    position: { left: "25%", bottom: "25%" },
    restJoystick: true,
  };
  const manager = nipplejs.create(
    createOptions as Parameters<typeof nipplejs.create>[0],
  ) as unknown as JoystickCollection;

  const onMove = (_evt: unknown, data: JoystickMoveEvent["data"]) => {
    if (!data?.vector) return;
    // nipplejs `vector.y` is +1 when the stick is pushed up. In our
    // world coords, "up on screen" means -Z (forward). Flip it here so
    // gameplay never has to care about nipplejs' axis convention.
    const v: JoystickVector = {
      x: data.vector.x,
      z: -data.vector.y,
    };
    options.inputManager.setJoystickVector(v);
  };

  const onEnd = () => {
    options.inputManager.setJoystickVector(null);
  };

  manager.on("move", onMove);
  manager.on("end", onEnd);

  let destroyed = false;
  return {
    active: true,
    destroy() {
      if (destroyed) return;
      destroyed = true;
      try {
        manager.off("move", onMove);
        manager.off("end", onEnd);
      } catch {
        /* nipplejs already torn down */
      }
      try {
        manager.destroy();
      } catch {
        /* idempotent */
      }
      // Clear any latched joystick state so the player doesn't keep
      // walking after the joystick is gone.
      options.inputManager.setJoystickVector(null);
    },
  };
}
