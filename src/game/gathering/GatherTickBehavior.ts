/**
 * GatherTickBehavior — Wave 16.
 *
 * Trivial JP `ActorComponent` shim that drives `GatherSystem.tick()`
 * from the engine's per-frame loop. Same pattern as
 * `InteractionTickBehavior` (Wave 11b) and `GroveTickBehavior` (Wave
 * 10) — small adapter classes so the runtime stays composable and
 * the system itself never imports the engine.
 */

import { type Actor, ActorComponent } from "@jolly-pixel/engine";

export interface GatherTickBehaviorOptions {
  onTick: () => void;
}

export class GatherTickBehavior extends ActorComponent {
  private readonly onTick: () => void;

  constructor(actor: Actor, options: GatherTickBehaviorOptions) {
    super({ actor, typeName: "GatherTickBehavior" });
    this.onTick = options.onTick;
  }

  awake(): void {
    this.needUpdate = true;
  }

  update(_deltaMs: number): void {
    this.onTick();
  }
}
