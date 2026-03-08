/**
 * Yuka GameEntity wrapper for the PlayerGovernor AI.
 */

import { GameEntity, Think } from "yuka";

export class GovernorEntity extends GameEntity {
  brain: Think<GovernorEntity>;
  constructor() {
    super();
    this.brain = new Think<GovernorEntity>(this);
  }
}
