/**
 * PlayerActor — Beekeeper character actor.
 *
 * Renders the Gardener (Beekeeper) GLTF model at the spawn position,
 * reads `move` from the wave-input `InputManager`, and walks the actor
 * around the chunk while swapping its animation clip between idle and
 * walk. The Actor's position drives `CameraFollowBehavior` each tick.
 *
 * Animation pattern adapted from voxel-realms' `route-behavior.ts`,
 * which spawns child actors with a JP `ModelRenderer` pointing at a
 * runtime-promoted GLB. We mirror that, scaled to a single player
 * actor, and additionally call into `ModelRenderer.animation.play(...)`
 * with cross-fade so idle/walk transitions are not jarring.
 *
 * Movement model — kinematic, no Rapier (matches voxel-realms'
 * `src/scene/player-behavior.ts`):
 *   - WASD / virtual joystick → 2D move vector via `InputManager`.
 *   - `position += move * speed * dt` per frame.
 *   - XZ are unbounded — Wave 9's chunk streamer guarantees there's
 *     always a chunk underfoot, so the player walks freely across the
 *     infinite biome patchwork. Y is snapped to the shared surface
 *     value. Real per-voxel collision is a future wave; until then,
 *     all biomes share `world.config.json#groundY` so this single
 *     `surfaceY` is correct everywhere.
 *   - Model rotates to face the move direction with a per-frame yaw
 *     lerp so the turn isn't instantaneous.
 *
 * --- Available animation clips (gardener.gltf, 198 total) ---
 *   - Idle:    "Idle 01" (default), "Idle 02", "IdleBreak 01..03",
 *              "Idle Combat 01"
 *   - Walk:    "Walk 01", "Walk 02", "WalkUp 01", "Crouch Walk 01"
 *   - Run:     "Run 01", "Run 02", "Combat Run 01", "Run To Idle 01"
 *   - Jump:    "Jump 01", "Jump Rise 01", "Jump Fall 01",
 *              "JumpForward Rise 01", "JumpForward Fall 01"
 *   - Attack:  "Attack 01..04", "Combo Attack 01", "Heavy Attack ..."
 *   - Pickup:  "Pick Up 01"
 *   - Interact:"Interact 01"
 *   - Death:   "Death 01", "Death Pose 01"
 *
 * --- Caveat: assimp-converted asset has no glTF skin block ---
 * The Gardener was converted from DAE via assimp, which emits per-node
 * TRS animation channels rather than a `skin` block. `THREE.GLTFLoader`
 * + `THREE.AnimationMixer` (which the engine's ModelRenderer wraps)
 * handles this natively. Code that reads `mesh.skeleton` directly will
 * get null — but we don't, and neither does ModelRenderer.
 */

import { type Actor, ActorComponent, ModelRenderer } from "@jolly-pixel/engine";
import type { InputManager } from "@/input";
import playerConfig from "./player.config.json";

export interface PlayerSpawn {
  x: number;
  y: number;
  z: number;
}

/**
 * Wave 9 removed the XZ axis-aligned-box clamp; the player roams the
 * streamed grid freely. The bounds interface is kept exported as a
 * deprecated stub for any out-of-tree caller that still references it,
 * but `PlayerActor` no longer reads from it.
 *
 * @deprecated Removed in Wave 9. Use `PlayerActorOptions.surfaceY`
 * to pin the Y axis; XZ is unbounded.
 */
export interface PlayerBounds {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  /** Y to snap the actor to (top-of-grass surface). */
  groundY: number;
}

export interface PlayerActorOptions {
  spawn: PlayerSpawn;
  /** Optional — falls back to standing still + idle if omitted. */
  inputManager?: InputManager;
  /**
   * Y to snap the actor's feet to every frame the player is moving.
   * Wave 9's biomes all share `world.config.json#groundY` so a single
   * value is correct everywhere; future waves with elevation variation
   * will replace this with a chunk-aware lookup.
   */
  surfaceY?: number;
}

/** Default idle clip name in `gardener.gltf`. */
export const PLAYER_IDLE_CLIP = playerConfig.idleClip;
/** Walk clip used while `move` magnitude > epsilon. */
export const PLAYER_WALK_CLIP = playerConfig.walkClip;
/** Movement speed in world units / second. */
export const PLAYER_MOVE_SPEED = playerConfig.moveSpeed;

/**
 * Asset path the engine's `Systems.Assets` pipeline loads. Routed
 * through Vite's BASE_URL so the build deploys cleanly under
 * `/grovekeeper/` on GitHub Pages while serving `/` in dev.
 *
 * Pattern lifted from voxel-realms' `route-behavior.ts:publicAssetUrl`.
 */
export function gardenerModelPath(): string {
  const base =
    typeof import.meta !== "undefined" && import.meta.env?.BASE_URL
      ? import.meta.env.BASE_URL
      : "/";
  const baseTrimmed = base.endsWith("/") ? base.slice(0, -1) : base;
  return `${baseTrimmed}/assets/models/characters/gardener/gardener.gltf`;
}

/** Smallest non-zero squared magnitude treated as "moving". */
const MOVE_EPS = playerConfig.moveEpsilon;
/** Crossfade duration when swapping idle ↔ walk clips. */
const ANIM_FADE = playerConfig.animationFadeDuration;
/** Per-frame yaw lerp factor; 1 = snap, low = slow turn. */
const FACING_LERP = playerConfig.facingLerp;

export class PlayerActor extends ActorComponent {
  private spawn: PlayerSpawn;
  private renderer: ModelRenderer;
  private input: InputManager | null;
  private surfaceY: number | null;

  /**
   * Tracks the currently *requested* clip so we don't spam
   * `animation.play(...)` every frame with the same clip name.
   */
  private currentClip: string = PLAYER_IDLE_CLIP;

  /** Approx. character height in world units; used by camera + later collision. */
  static readonly PLAYER_HEIGHT = 1.6;

  constructor(actor: Actor, options: PlayerActorOptions) {
    super({ actor, typeName: "PlayerActor" });
    this.spawn = options.spawn;
    this.input = options.inputManager ?? null;
    this.surfaceY = options.surfaceY ?? null;

    // Place the actor's root at the spawn point. The model's feet sit
    // at the actor origin (the Gardener GLTF is authored y-up,
    // origin-at-feet), so no Y-half-height offset is needed.
    this.actor.object3D.position.set(this.spawn.x, this.spawn.y, this.spawn.z);

    // Add the ModelRenderer. The engine's loader resolves `.gltf` via
    // `THREE.GLTFLoader` and wires a `THREE.AnimationMixer` over the
    // returned scene. `animations.default` schedules the idle clip to
    // play once the asset finishes loading.
    this.renderer = this.actor.addComponentAndGet(ModelRenderer, {
      path: gardenerModelPath(),
      animations: {
        default: PLAYER_IDLE_CLIP,
        fadeDuration: ANIM_FADE,
      },
    });
  }

  awake(): void {
    // We need a per-frame update only when an InputManager is wired —
    // otherwise the actor is decorative (default idle clip handles
    // animation).
    this.needUpdate = this.input !== null;
  }

  update(deltaMs: number): void {
    if (!this.input) return;
    const dt = Math.min(deltaMs, 50) / 1000;

    const move = this.input.getActionState("move");
    const speedSq = move.x * move.x + move.z * move.z;
    const moving = speedSq > MOVE_EPS;

    if (moving) {
      // Translate kinematically. Magnitude carried through so analog
      // joystick deflection translates to slower walk. XZ is
      // unbounded — Wave 9's chunk streamer keeps the world filled
      // wherever the player goes.
      const pos = this.actor.object3D.position;
      pos.x += move.x * PLAYER_MOVE_SPEED * dt;
      pos.z += move.z * PLAYER_MOVE_SPEED * dt;
      this.applySurfaceY();

      // Lerp yaw toward move direction. atan2(x, z) because our model
      // faces +Z by default and we measure rotation around Y.
      this.lerpFacing(move.x, move.z);
      this.requestClip(PLAYER_WALK_CLIP);
    } else {
      this.requestClip(PLAYER_IDLE_CLIP);
    }

    // Tell the input manager this frame is consumed so rising-edge
    // detection works on the next call.
    this.input.endFrame();
  }

  /** World-space position the camera should track. */
  get position(): { x: number; y: number; z: number } {
    const p = this.actor.object3D.position;
    return { x: p.x, y: p.y, z: p.z };
  }

  /** Exposed for tests + future controller waves. */
  get modelRenderer(): ModelRenderer {
    return this.renderer;
  }

  /** Currently requested animation clip ('Idle 01' or 'Walk 01'). */
  get clip(): string {
    return this.currentClip;
  }

  // ---- internals ----

  private applySurfaceY(): void {
    if (this.surfaceY === null) return;
    this.actor.object3D.position.y = this.surfaceY;
  }

  private lerpFacing(mx: number, mz: number): void {
    const target = Math.atan2(mx, mz);
    const obj = this.actor.object3D;
    const current = obj.rotation.y;
    // Shortest-path angle delta in [-pi, pi].
    let delta = target - current;
    while (delta > Math.PI) delta -= 2 * Math.PI;
    while (delta < -Math.PI) delta += 2 * Math.PI;
    obj.rotation.y = current + delta * FACING_LERP;
  }

  private requestClip(clip: string): void {
    if (clip === this.currentClip) return;
    this.currentClip = clip;
    // The mixer may not have loaded yet (GLTF still streaming). play()
    // is a no-op in that case; ModelRenderer flushes the pending
    // request once `setMixer` + `setClips` have run.
    try {
      this.renderer.animation.play(clip, {
        loop: true,
        fadeInDuration: ANIM_FADE,
        fadeOutDuration: ANIM_FADE,
      });
    } catch {
      /* mixer not ready; default clip will engage once loaded */
    }
  }
}
