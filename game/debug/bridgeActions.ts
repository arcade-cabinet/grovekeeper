/**
 * bridgeActions — Side-effecting control methods for the Grovekeeper debug bridge.
 *
 * These are intentionally impure (they mutate physics state, game store, and
 * camera refs). They are debug-only; production builds never import this file.
 *
 * Spec: §D.1 (Debug Bridge)
 */

import type { RapierRigidBody } from "@react-three/rapier";
import { dispatchAction } from "@/game/actions/actionDispatcher";
import { setPitch, setYaw } from "@/game/hooks/useMouseLook";
import { gameState$ } from "@/game/stores/core";
import { hourToMicroseconds } from "./bridgeQueries.ts";

// ── Module-level player rigid body handle ────────────────────────────────────
//
// PlayerCapsule.tsx calls registerPlayerRigidBody() on mount and
// unregisterPlayerRigidBody() on unmount. The bridge reads it here.

let _playerRigidBody: RapierRigidBody | null = null;

/** Called by PlayerCapsule on mount to register the physics body handle. */
export function registerPlayerRigidBody(body: RapierRigidBody): void {
  _playerRigidBody = body;
}

/** Called by PlayerCapsule on unmount. */
export function unregisterPlayerRigidBody(): void {
  _playerRigidBody = null;
}

// ── Control actions ───────────────────────────────────────────────────────────

/**
 * Teleport the player to world coordinates (x, y, z).
 * Sets position and zeros linear velocity to prevent carry-over momentum.
 * No-ops if the physics body has not been registered yet.
 */
export function teleport(x: number, y: number, z: number): void {
  if (!_playerRigidBody) {
    console.warn("[DebugBridge] teleport() called before PlayerCapsule mounted");
    return;
  }
  _playerRigidBody.setTranslation({ x, y, z }, true);
  _playerRigidBody.setLinvel({ x: 0, y: 0, z: 0 }, true);
}

/**
 * Set game time to the given hour (0–24).
 * Converts to microseconds using the compressed game day formula (600 s/day).
 */
export function setTime(hour: number): void {
  const clamped = Math.max(0, Math.min(24, hour));
  gameState$.gameTimeMicroseconds.set(hourToMicroseconds(clamped));
}

/**
 * Control camera yaw (horizontal, radians) and pitch (vertical, radians)
 * without requiring pointer lock. Writes directly to the useMouseLook refs.
 */
export function lookAt(yaw: number, pitch: number): void {
  setYaw(yaw);
  setPitch(pitch);
}

/**
 * Trigger a game action by name. Builds a minimal DispatchContext so
 * simple crafting-station and grove-verb actions can fire from the console
 * or Playwright without needing a full raycast hit.
 *
 * Recognised action strings (case-insensitive): CHOP, WATER, PRUNE,
 * PLANT, DIG, COOK, FORGE, MINE, FISH, PLACE_TRAP, CHECK_TRAP, BUILD.
 *
 * Returns without error for unrecognised strings.
 */
export function executeAction(action: string): void {
  // Map the debug action string to a minimal DispatchContext.
  // For actions that require an entity or grid coords we pass undefined —
  // dispatchAction() will return false cleanly rather than throw.
  dispatchAction({
    toolId: actionToTool(action.toUpperCase()),
    targetType: actionToTarget(action.toUpperCase()),
  });
}

// ── Helpers (not exported from bridge) ───────────────────────────────────────

function actionToTool(action: string): string {
  switch (action) {
    case "CHOP":
      return "axe";
    case "WATER":
      return "watering-can";
    case "PRUNE":
      return "pruning-shears";
    case "PLANT":
    case "DIG":
      return "trowel";
    case "MINE":
      return "pick";
    case "FISH":
      return "fishing-rod";
    case "PLACE_TRAP":
      return "trap";
    case "BUILD":
      return "hammer";
    default:
      return "trowel";
  }
}

function actionToTarget(
  action: string,
): import("@/game/actions/actionDispatcher").TargetEntityType | null {
  switch (action) {
    case "CHOP":
    case "WATER":
    case "PRUNE":
      return "tree";
    case "DIG":
      return "rock";
    case "COOK":
      return "campfire";
    case "FORGE":
      return "forge";
    case "MINE":
      return "rock";
    case "FISH":
      return "water";
    case "CHECK_TRAP":
      return "trap";
    default:
      return null;
  }
}
