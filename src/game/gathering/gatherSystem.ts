/**
 * gatherSystem — Wave 16.
 *
 * Per-frame system that turns `swing` action presses into voxel breaks.
 *
 * Flow per `tick()`:
 *   1. Read `swing.justPressed`. If nothing, early-out (cheap path).
 *   2. Compute the target voxel: 1 voxel ahead of the player in the
 *      facing direction, at the surface row. Reach is `reachVoxels`
 *      (default 1.5 voxels in spec — we round to the integer cell).
 *   3. Resolve the block at that cell via the chunk lookup callback.
 *      If air or unknown, no-op.
 *   4. If `BLOCK_DROPS` says the block is unbreakable (grove tiles),
 *      no-op with an `unbreakable` event.
 *   5. Otherwise increment the hit count for that target. Play the
 *      `Attack 01` animation + `tool.axe.swing` SFX. If the hit count
 *      reaches `hitsToBreak`, remove the voxel: persist via
 *      `chunksRepo.applyBlockMod`, mutate the live mesh via
 *      `ChunkActor.applyMod`, and drop materials via `inventoryRepo.addItem`
 *      (cap-checked).
 *   6. Reset hit count when the player switches to a different
 *      target or moves out of reach.
 *
 * The system never imports the engine, the renderer, the database
 * client, or the audio module directly — every side effect routes
 * through a callback supplied by the runtime. This keeps the unit
 * tests pure (no THREE / no SQLite) and the file under 350 lines.
 *
 * Spec invariant: **Grove biome voxels are unbreakable.** Enforced via
 * `blockDrops.ts`; the system honors the flag without special-casing
 * the biome id, so a future biome that ships unbreakable shrines gets
 * the same protection automatically.
 */

import {
  type BlockDrop,
  type BlockDropEntry,
  getBlockDrop,
  isUnbreakable,
} from "@/game/world/blockDrops";
import type { GatheringTarget, GatherTickEvent } from "./types";

/**
 * What the system needs to read player state. Deliberately narrow —
 * `PlayerActor` exposes `position` + drives `actor.object3D.rotation.y`
 * via its facing-lerp helper.
 */
export interface GatherPlayerRef {
  /** Player world-space position. */
  readonly position: { x: number; y: number; z: number };
  /** Yaw around Y, in radians. atan2(x, z) convention (matches PlayerActor). */
  readonly facingYaw: number;
}

/** What the system needs to read the swing action's rising edge. */
export interface GatherInputRef {
  getActionState(action: "swing"): { pressed: boolean; justPressed: boolean };
}

/**
 * Returns the biome-prefixed block name at the given world voxel
 * coordinates, or `null` if the voxel is air / no chunk is loaded
 * there.
 */
export type BlockAtFn = (x: number, y: number, z: number) => string | null;

/**
 * Persist + mutate a block removal. The runtime adapter:
 *   - Calls `chunksRepo.applyBlockMod(...)` so the change survives reload.
 *   - Calls the live `ChunkActor.applyMod(...)` so the mesh updates immediately.
 *   - Returns true when both succeeded; false skips the drop.
 */
export type RemoveBlockFn = (x: number, y: number, z: number) => boolean;

/**
 * Add `count` of `itemId` to the player's inventory. Implementations
 * should consult `inventory.config.json` and return:
 *   - `accepted` — number actually added (0 when capped).
 *   - `capped`   — true if the cap rejected some / all of the drop.
 * The caller plays the corresponding SFX.
 */
export type AddInventoryFn = (
  itemId: string,
  count: number,
) => { accepted: number; capped: boolean };

/** Sound bus the system uses. Routes to `playSound` in the runtime. */
export interface GatherAudio {
  swingHit(): void;
  break_(): void;
  inventoryAdd(): void;
  inventoryFull(): void;
}

/** Animation hook — runtime forwards to `PlayerActor.requestClip`. */
export interface GatherAnimation {
  /** Play a clip once. Default impl in runtime: `Attack 01`. */
  playSwing(): void;
}

export interface GatherSystemOptions {
  player: GatherPlayerRef;
  input: GatherInputRef;
  blockAt: BlockAtFn;
  removeBlock: RemoveBlockFn;
  addInventory: AddInventoryFn;
  audio?: Partial<GatherAudio>;
  animation?: Partial<GatherAnimation>;
  /**
   * How many voxels ahead of the player counts as "in reach". The spec
   * calls for ~1.5 voxels; we round to the integer cell during target
   * resolution so the gameplay feel is "the cell directly in front".
   */
  reachVoxels?: number;
  /** Optional callback for tests / UI — fires once per tick with the outcome. */
  onEvent?: (event: GatherTickEvent) => void;
  /**
   * Stamina gate — Wave 14/15. Returns true if the player has the
   * stamina cost available (default: always true).
   */
  canSwing?: () => boolean;
  /**
   * Stamina deduction — Wave 14/15. Called once per swing that fires
   * (after `canSwing` allowed it). Default: no-op.
   */
  consumeSwingStamina?: () => void;
  /**
   * Combat hook — Wave 14/15. Fired AFTER the swing animation/SFX
   * play so the runtime can apply damage to nearby hostiles. Default:
   * no-op (gathering-only build path keeps unit tests pure).
   */
  onSwing?: () => void;
}

const DEFAULT_REACH = 1.5;

/**
 * The system. Stateless across `tick()` calls except for `currentHit`,
 * which is the running progress against the most-recently-targeted
 * voxel. Resets when the player aims somewhere else.
 */
export class GatherSystem {
  private readonly opts: GatherSystemOptions;
  private currentHit: { target: GatheringTarget; hits: number } | null = null;

  constructor(options: GatherSystemOptions) {
    this.opts = options;
  }

  /** Per-frame tick. Cheap when `swing` is not pressed. */
  tick(): void {
    const { input, onEvent } = this.opts;
    const swing = input.getActionState("swing");
    if (!swing.justPressed) {
      // Holding does not auto-swing in cozy-tier — each break requires
      // discrete presses. So if the player isn't pressing this frame,
      // nothing happens, but we DO NOT reset `currentHit` — the player
      // can pause between swings and pick up where they left off.
      return;
    }

    // Wave 14/15: stamina gate. If the player is too tired, the swing
    // is suppressed entirely — no animation, no SFX, no progress tick.
    if (this.opts.canSwing && !this.opts.canSwing()) {
      onEvent?.({ kind: "none" });
      return;
    }

    // Wave 14/15: combat broadcast — runtime hooks this to apply
    // damage to nearby hostiles. Even if the gather target resolves
    // to nothing, swinging at a wolf still hits the wolf.
    this.opts.onSwing?.();
    // Wave 14/15: deduct stamina now that the swing is committed.
    this.opts.consumeSwingStamina?.();

    const target = this.computeTarget();
    if (!target) {
      // Nothing in reach. Drop any in-flight progress so the next swing
      // starts fresh on whatever the player faces next.
      this.currentHit = null;
      onEvent?.({ kind: "none" });
      return;
    }

    const drop = getBlockDrop(target.blockName);
    if (drop && isUnbreakable(drop)) {
      // Grove tile or other invariant-protected block. Reset progress
      // (the player is committed to a wasted swing), play swing SFX
      // for feedback, but do NOT advance hit count or remove anything.
      this.currentHit = null;
      this.opts.audio?.swingHit?.();
      this.opts.animation?.playSwing?.();
      onEvent?.({ kind: "unbreakable", target });
      return;
    }

    if (!drop) {
      // Unknown block — defensive. Reset progress, no SFX (silently
      // ignore so a missing entry surfaces as "no feedback" not "crash").
      this.currentHit = null;
      onEvent?.({ kind: "none" });
      return;
    }

    // We have a valid breakable target. Are we continuing on the same
    // voxel, or did the player switch?
    if (this.currentHit && !sameVoxel(this.currentHit.target, target)) {
      this.currentHit = null;
    }

    const breakable = drop as BlockDrop;
    this.opts.animation?.playSwing?.();
    this.opts.audio?.swingHit?.();

    const nextHits = (this.currentHit?.hits ?? 0) + 1;
    if (nextHits < breakable.hitsToBreak) {
      this.currentHit = { target, hits: nextHits };
      onEvent?.({
        kind: "hit",
        target,
        hits: nextHits,
        hitsToBreak: breakable.hitsToBreak,
      });
      return;
    }

    // Final hit — break the voxel.
    const removed = this.opts.removeBlock(target.x, target.y, target.z);
    if (!removed) {
      // Renderer / persistence rejected the write. Treat as a missed
      // swing — don't drop materials, don't reset progress (the next
      // swing retries against the same voxel).
      onEvent?.({ kind: "none" });
      return;
    }

    this.currentHit = null;
    this.opts.audio?.break_?.();

    // Drop materials.
    const { itemId, count = 1 } = breakable;
    if (!itemId) {
      // Grass / tidy-only block — no drop, just clear.
      onEvent?.({
        kind: "break",
        target,
        itemId: null,
        count: 0,
        capped: false,
      });
      return;
    }

    const result = this.opts.addInventory(itemId, count);
    if (result.capped && result.accepted === 0) {
      this.opts.audio?.inventoryFull?.();
    } else {
      this.opts.audio?.inventoryAdd?.();
    }
    onEvent?.({
      kind: "break",
      target,
      itemId,
      count: result.accepted,
      capped: result.capped,
    });
  }

  /** Reset in-flight hit progress. Call when player teleports / dies / etc. */
  reset(): void {
    this.currentHit = null;
  }

  /** Currently in-progress target, or null. Public for tests + HUD reach hint. */
  getCurrentHit(): { target: GatheringTarget; hits: number } | null {
    return this.currentHit;
  }

  // ---- internals ----

  /**
   * Resolve the world-voxel cell the player is currently aiming at.
   * Approach: project a unit vector from the player along their yaw
   * direction by `reachVoxels`, floor to the nearest integer cell.
   * Y is the player's foot Y (the row their voxel-floor sits at).
   *
   * This is intentionally cheap — no raycast against the voxel mesh.
   * For RC the player walks on a flat shared surface, so "the cell
   * directly in front of you" is indistinguishable from a real
   * raycast result. Post-RC vertical terrain would swap this for a
   * proper voxel raycast against `VoxelWorld.getVoxelNeighbour(...)`.
   */
  private computeTarget(): GatheringTarget | null {
    const reach = this.opts.reachVoxels ?? DEFAULT_REACH;
    const { position, facingYaw } = this.opts.player;
    const dx = Math.sin(facingYaw);
    const dz = Math.cos(facingYaw);
    const tx = Math.floor(position.x + dx * reach);
    const tz = Math.floor(position.z + dz * reach);
    // The block we're harvesting sits one cell BELOW the player's foot
    // height — the player walks on the top of the surface row, so the
    // gatherable voxel is at floor(y) - 1 in world coordinates.
    const ty = Math.floor(position.y) - 1;
    const blockName = this.opts.blockAt(tx, ty, tz);
    if (!blockName) return null;
    return { x: tx, y: ty, z: tz, blockName };
  }
}

function sameVoxel(a: GatheringTarget, b: GatheringTarget): boolean {
  return a.x === b.x && a.y === b.y && a.z === b.z;
}

/** Re-exported so callers can resolve drop entries from outside the module. */
export type { BlockDropEntry };
