/**
 * Types for the NpcBrain AI.
 */

import type { GameEntity, GoalEvaluator } from "yuka";
import type { WalkabilityGrid } from "@/game/systems/pathfinding";

export type NpcBehavior = "idle" | "wandering" | "approaching" | "returning" | "tutorial_guide";

export interface NpcBrainContext {
  /** Pre-built walkability grid for pathfinding. */
  grid: WalkabilityGrid;
  /** Player's current world position. */
  playerX: number;
  playerZ: number;
  /** NPC's current world position (from ECS). */
  npcX: number;
  npcZ: number;
  /** NPC's home position (spawn point). */
  homeX: number;
  homeZ: number;
  /** Chebyshev distance to player. */
  distToPlayer: number;
}

export type EvaluatorTag = "idle" | "wander" | "approach" | "return";

export interface TaggedEvaluator<TEntity extends GameEntity> {
  tag: EvaluatorTag;
  evaluator: GoalEvaluator<TEntity>;
}
