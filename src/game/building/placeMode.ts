/**
 * placeMode — pure state machine for the building/placement loop.
 *
 * Building is "place a blueprint into the live chunk grid". The state
 * machine has two states:
 *   - `idle`     — no blueprint is held, no ghost preview.
 *   - `placing`  — a blueprint is held, ghost preview at the anchor.
 *
 * Transitions:
 *   - `enterPlacing(state, blueprintId, anchor)` → idle → placing
 *   - `updateAnchor(state, anchor)`              → placing → placing (move ghost)
 *   - `cancelPlacing(state)`                    → placing → idle (no commit)
 *   - `commitPlacing(state, ...)`               → placing → idle (commit + persist)
 *
 * Pure: returns the next state, never mutates the input. Side effects
 * (chunk mods, audio, animation) live in the caller. This is the
 * Wave-12 trick that mirrors `craft.ts` — testable without a runtime.
 */

import type { Blueprint, PlaceModeState, VoxelCoord } from "./types";

/** Initial state — no blueprint held. */
export const IDLE_STATE: PlaceModeState = { kind: "idle" };

/**
 * Enter place mode with a specific blueprint at a specific anchor.
 *
 * The previous state is intentionally ignored — switching blueprints
 * mid-placement is allowed (idle → placing OR placing → placing) so
 * the prior state doesn't gate the transition. The parameter is kept
 * on the signature so the function reads as the pure transition
 * `(state, ...args) → state` like the others.
 */
export function enterPlacing(
  _state: PlaceModeState,
  blueprintId: string,
  anchor: VoxelCoord,
): PlaceModeState {
  return { kind: "placing", blueprintId, anchor: { ...anchor } };
}

/**
 * Move the ghost preview's anchor. No-op if not currently placing.
 */
export function updateAnchor(
  state: PlaceModeState,
  anchor: VoxelCoord,
): PlaceModeState {
  if (state.kind !== "placing") return state;
  if (
    state.anchor.x === anchor.x &&
    state.anchor.y === anchor.y &&
    state.anchor.z === anchor.z
  ) {
    return state;
  }
  return { ...state, anchor: { ...anchor } };
}

/** Drop placement without committing. */
export function cancelPlacing(state: PlaceModeState): PlaceModeState {
  if (state.kind !== "placing") return state;
  return IDLE_STATE;
}

/**
 * Commit the placement. Returns the next state (always idle on success).
 * Returns the same state if not currently placing.
 *
 * The actual side effect (writing voxels to the chunk + persisting via
 * `chunksRepo` / `structuresRepo` / consuming the inventory item) is
 * the caller's job — this function only manages the state machine.
 */
export function commitPlacing(state: PlaceModeState): PlaceModeState {
  if (state.kind !== "placing") return state;
  return IDLE_STATE;
}

/**
 * Compute the world-space voxel coordinates a blueprint will write,
 * given the current anchor. Pure helper used by both the ghost
 * renderer and the commit path so they agree on which voxels are
 * affected.
 */
export function blueprintFootprint(
  blueprint: Blueprint,
  anchor: VoxelCoord,
): VoxelCoord[] {
  return blueprint.blocks.map((block) => ({
    x: anchor.x + block.dx,
    y: anchor.y + block.dy,
    z: anchor.z + block.dz,
  }));
}

/**
 * Compute a placement anchor in front of a player at a given position
 * + facing yaw, snapped to the voxel grid.
 *
 * - Player faces +Z by default; yaw is the rotation around Y.
 * - Anchor sits `forwardDistance` voxels ahead of the player at
 *   `groundY` (the surface above the chunk's bedrock). This keeps the
 *   blueprint flat on the ground for RC; multi-storey building lands
 *   later.
 */
export function anchorInFrontOfPlayer(
  player: { x: number; z: number; yaw: number },
  groundY: number,
  forwardDistance = 1.5,
): VoxelCoord {
  const fx = Math.sin(player.yaw);
  const fz = Math.cos(player.yaw);
  return {
    x: Math.round(player.x + fx * forwardDistance),
    y: groundY,
    z: Math.round(player.z + fz * forwardDistance),
  };
}
