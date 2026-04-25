/**
 * GroveTickBehavior — Wave 10.
 *
 * Engine-level glue that drives the grove visual + discovery layers
 * every frame. Sits alongside `ChunkStreamerBehavior` in the runtime
 * actor graph so the JP engine ticks it like any other component.
 *
 * Single responsibility: read the player's position and a list of
 * live grove glow handles, then call:
 *   - `updateGroveEmissivePulse` per handle (material breathing).
 *   - `updateGroveFireflies` per handle (firefly bob).
 *   - `groveDiscovery.update(playerPos)` for chunk-transition state.
 */

import { type Actor, ActorComponent } from "@jolly-pixel/engine";
import * as THREE from "three";
import type { GroveDiscoverySystem } from "./groveDiscovery";
import {
  type GroveGlowHandle,
  updateGroveEmissivePulse,
  updateGroveFireflies,
} from "./groveGlow";

export interface GroveTickBehaviorOptions {
  /** Map of chunkKey -> glow handle. Manager owns; we read each tick. */
  groveGlows: ReadonlyMap<string, GroveGlowHandle>;
  /**
   * Optional discovery system. `null` means the DB layer never
   * initialized — discovery becomes a no-op without crashing the scene.
   */
  discovery: GroveDiscoverySystem | null;
  /** Read each frame to compute the chunk transition. */
  playerPosition: { readonly x: number; readonly z: number };
}

export class GroveTickBehavior extends ActorComponent {
  private readonly groveGlows: ReadonlyMap<string, GroveGlowHandle>;
  private readonly discovery: GroveDiscoverySystem | null;
  private readonly playerPosition: { readonly x: number; readonly z: number };
  private readonly clock = new THREE.Clock();

  constructor(actor: Actor, options: GroveTickBehaviorOptions) {
    super({ actor, typeName: "GroveTickBehavior" });
    this.groveGlows = options.groveGlows;
    this.discovery = options.discovery;
    this.playerPosition = options.playerPosition;
  }

  awake(): void {
    this.needUpdate = true;
    this.clock.start();
  }

  update(_deltaMs: number): void {
    const t = this.clock.getElapsedTime();
    for (const handle of this.groveGlows.values()) {
      updateGroveEmissivePulse(handle.materials, t);
      if (handle.fireflies) {
        updateGroveFireflies(
          handle.fireflies,
          handle.fireflyBaseY,
          handle.fireflyPhase,
          t,
        );
      }
    }
    if (this.discovery) {
      this.discovery.update({
        x: this.playerPosition.x,
        z: this.playerPosition.z,
      });
    }
  }
}
