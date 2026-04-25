/**
 * ChunkStreamerBehavior — engine-level glue that calls
 * `ChunkManager.update()` once per frame.
 *
 * `ChunkManager` is an engine-agnostic POJO so tests can drive it
 * synchronously without a runtime. This thin ActorComponent wraps it
 * so the JP engine ticks the streamer alongside every other
 * `ActorComponent.update()` call. Mirrors voxel-realms' pattern of
 * "manager class + behavior shim that pumps it" (e.g. their
 * `terrain-behavior` + chunk pipeline).
 */

import { type Actor, ActorComponent } from "@jolly-pixel/engine";
import type { ChunkManager } from "./ChunkManager";

export interface ChunkStreamerBehaviorOptions {
  manager: ChunkManager;
}

export class ChunkStreamerBehavior extends ActorComponent {
  private readonly manager: ChunkManager;

  constructor(actor: Actor, options: ChunkStreamerBehaviorOptions) {
    super({ actor, typeName: "ChunkStreamerBehavior" });
    this.manager = options.manager;
  }

  awake(): void {
    this.needUpdate = true;
    // First tick eagerly so the player isn't standing on void for one
    // frame. Subsequent ticks come from the engine's update loop.
    this.manager.update();
  }

  update(_deltaMs: number): void {
    this.manager.update();
  }
}
