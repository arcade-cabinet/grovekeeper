/**
 * PlayerActor — proof-of-life player stub.
 *
 * Currently renders a small green cube at the spawn position so the
 * camera follow has something to track. Holds no input, no physics, no
 * gameplay logic; those land in:
 *   - Wave 7+ (input + character controller)
 *   - Wave 8+ (Rapier collision)
 *   - Asset wave (replaces the cube with the Gardener GLB via
 *     `ModelRenderer`)
 *
 * Exposes `position` so the camera follow behavior can lerp without
 * coupling to the underlying mesh.
 */

import { type Actor, ActorComponent } from "@jolly-pixel/engine";
import * as THREE from "three";

export interface PlayerSpawn {
  x: number;
  y: number;
  z: number;
}

export interface PlayerActorOptions {
  spawn: PlayerSpawn;
}

export class PlayerActor extends ActorComponent {
  private body: THREE.Mesh;
  private spawn: PlayerSpawn;

  static readonly PLACEHOLDER_HEIGHT = 1.6;

  constructor(actor: Actor, options: PlayerActorOptions) {
    super({ actor, typeName: "PlayerActor" });
    this.spawn = options.spawn;

    const geometry = new THREE.BoxGeometry(
      0.8,
      PlayerActor.PLACEHOLDER_HEIGHT,
      0.8,
    );
    const material = new THREE.MeshStandardMaterial({
      color: new THREE.Color("#7cd17c"),
      roughness: 0.55,
      metalness: 0.05,
    });
    this.body = new THREE.Mesh(geometry, material);
    this.body.position.set(
      this.spawn.x,
      this.spawn.y + PlayerActor.PLACEHOLDER_HEIGHT / 2,
      this.spawn.z,
    );
    this.actor.object3D.add(this.body);
  }

  awake(): void {
    // No per-frame updates yet — the cube is static. Input + movement
    // arrive in the input/controller wave.
    this.needUpdate = false;
  }

  /** World-space position the camera should track. */
  get position(): { x: number; y: number; z: number } {
    return {
      x: this.body.position.x,
      y: this.body.position.y,
      z: this.body.position.z,
    };
  }
}
