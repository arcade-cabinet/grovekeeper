/**
 * Yuka GameEntity wrapper for NPC AI.
 */

import { GameEntity, Think } from "yuka";
import type { NpcBrainContext } from "./types.ts";

export class NpcEntity extends GameEntity {
  brain: Think<NpcEntity>;
  /** Transient context set each frame before evaluation. */
  ctx: NpcBrainContext | null = null;
  /** Seconds remaining until next wander attempt. */
  wanderTimer = 0;

  constructor() {
    super();
    this.brain = new Think<NpcEntity>(this);
  }
}
