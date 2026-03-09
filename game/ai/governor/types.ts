/**
 * Types and constants for the PlayerGovernor visual AI.
 */

// ──────────────────────────────────────────────
// State machine + action types
// ──────────────────────────────────────────────

export type GovernorState = "idle" | "navigating" | "acting";
export type ActionType = "plant" | "water" | "harvest" | "prune" | "trade" | "explore";

// ──────────────────────────────────────────────
// Configuration interfaces
// ──────────────────────────────────────────────

export interface PlayerGovernorConfig {
  /** Reference to the shared movement vector (same one InputManager writes to). */
  movementRef: { current: { x: number; z: number } };
  /** Get the world bounds for pathfinding. */
  getWorldBounds: () => {
    minX: number;
    minZ: number;
    maxX: number;
    maxZ: number;
  };
}

export interface ActionTarget {
  action: ActionType;
  /** Grid tile to walk to. */
  tileX: number;
  tileZ: number;
  /** Entity ID for tree actions. */
  entityId?: string;
  /** Species ID for planting. */
  speciesId?: string;
}

export interface GovernorProfile {
  plantWeight: number;
  waterWeight: number;
  harvestWeight: number;
  exploreWeight: number;
  pruneWeight: number;
  tradeWeight: number;
  preferredSpecies?: string[];
  /** Seconds between decision re-evaluations. */
  decisionInterval: number;
}

export const DEFAULT_PROFILE: GovernorProfile = {
  plantWeight: 0.8,
  waterWeight: 0.6,
  harvestWeight: 0.9,
  exploreWeight: 0.1,
  pruneWeight: 0.4,
  tradeWeight: 0.6,
  decisionInterval: 0.5,
};

/** Pause between actions (seconds) -- so the character doesn't instantly chain. */
export const ACTION_PAUSE = 0.3;
