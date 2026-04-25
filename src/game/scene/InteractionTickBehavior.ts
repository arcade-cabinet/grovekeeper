/**
 * InteractionTickBehavior — Wave 11b.
 *
 * Trivial JP `ActorComponent` shim that calls a host-supplied
 * callback every frame. Used to drive the `InteractionSystem` off the
 * engine's actor graph without dragging the system into the engine's
 * lifecycle types directly.
 *
 * The same pattern is used by `GroveTickBehavior` (Wave 10) — small
 * adapter classes are cheaper than weaving every system into the
 * runtime tick directly, and they keep the runtime constructor easy
 * to skim.
 */

import { type Actor, ActorComponent } from "@jolly-pixel/engine";

export interface InteractionTickBehaviorOptions {
  onTick: () => void;
}

export class InteractionTickBehavior extends ActorComponent {
  private readonly onTick: () => void;

  constructor(actor: Actor, options: InteractionTickBehaviorOptions) {
    super({ actor, typeName: "InteractionTickBehavior" });
    this.onTick = options.onTick;
  }

  awake(): void {
    this.needUpdate = true;
  }

  update(_deltaMs: number): void {
    this.onTick();
  }
}
