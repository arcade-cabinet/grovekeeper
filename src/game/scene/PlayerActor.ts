/**
 * PlayerActor — Beekeeper character actor.
 *
 * Renders the Gardener (Beekeeper) GLTF model at the spawn position
 * with the `Idle 01` animation looping. The Actor exposes a `position`
 * field that `CameraFollowBehavior` reads each tick to lerp the
 * follow camera. Input + character controller arrive in a later wave;
 * for now the model stands still and idles.
 *
 * Animation pattern adapted from voxel-realms' `route-behavior.ts`,
 * which spawns child actors with a JP `ModelRenderer` pointing at a
 * runtime-promoted GLB. We mirror that, scaled to a single player
 * actor, and additionally request a default clip via the engine's
 * `animations.default` option (voxel-realms' anomaly meshes don't
 * play clips — Grovekeeper's player does).
 *
 * --- Available animation clips (gardener.gltf, 198 total) ---
 * Wave 11a only wires `Idle 01`. Future input/combat waves should
 * play these:
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
 * Run `node scripts/sample-animations.mjs` (with the planned .glb
 * variant) for the full list, or parse `gardener.gltf`'s
 * `animations[]` array directly.
 *
 * --- Caveat: assimp-converted asset has no glTF skin block ---
 * The Gardener was converted from DAE via assimp, which emits per-node
 * TRS animation channels rather than a `skin` block. `THREE.GLTFLoader`
 * + `THREE.AnimationMixer` (which the engine's ModelRenderer wraps)
 * handles this natively, so the idle animation plays correctly. Code
 * that reads `mesh.skeleton` directly will get null — but we don't,
 * and neither does ModelRenderer.
 */

import { type Actor, ActorComponent, ModelRenderer } from "@jolly-pixel/engine";

export interface PlayerSpawn {
  x: number;
  y: number;
  z: number;
}

export interface PlayerActorOptions {
  spawn: PlayerSpawn;
}

/** Default idle clip name in `gardener.gltf`. */
export const PLAYER_IDLE_CLIP = "Idle 01";

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

export class PlayerActor extends ActorComponent {
  private spawn: PlayerSpawn;
  private renderer: ModelRenderer;

  /** Approx. character height in world units; used by camera + later collision. */
  static readonly PLAYER_HEIGHT = 1.6;

  constructor(actor: Actor, options: PlayerActorOptions) {
    super({ actor, typeName: "PlayerActor" });
    this.spawn = options.spawn;

    // Place the actor's root at the spawn point. The model's feet sit
    // at the actor origin (the Gardener GLTF is authored y-up,
    // origin-at-feet), so no Y-half-height offset is needed — that was
    // a quirk of the placeholder cube which centered on its own
    // origin.
    this.actor.object3D.position.set(this.spawn.x, this.spawn.y, this.spawn.z);

    // Add the ModelRenderer. The engine's loader resolves `.gltf` via
    // `THREE.GLTFLoader` and wires a `THREE.AnimationMixer` over the
    // returned scene. `animations.default` schedules the idle clip to
    // play once the asset finishes loading; the engine's start()
    // hook flushes any queued play-call after `setMixer` + `setClips`.
    this.renderer = this.actor.addComponentAndGet(ModelRenderer, {
      path: gardenerModelPath(),
      animations: {
        default: PLAYER_IDLE_CLIP,
      },
    });
  }

  awake(): void {
    // ModelRenderer drives its own update for the AnimationMixer.
    // PlayerActor itself has nothing per-frame yet — input + movement
    // arrive in the controller wave.
    this.needUpdate = false;
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
}
