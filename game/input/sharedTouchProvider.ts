/**
 * sharedTouchProvider -- Module-level singleton shared by all mobile touch UI components.
 *
 * VirtualJoystick, TouchLookZone, and MobileActionButtons all call methods on
 * this single instance so InputManager receives one unified contribution per frame.
 *
 * Register with inputManager at app init:
 *   inputManager.register(sharedTouchProvider)
 */

import { TouchProvider } from "@/game/input/TouchProvider";

export const sharedTouchProvider = new TouchProvider();
