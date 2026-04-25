/**
 * Scene module — Jolly Pixel runtime + Solid mount point + first-class
 * Actor behaviors. Other modules should import from `@/game/scene`
 * rather than reaching into individual files.
 */

export type { CameraFollowOptions } from "./CameraFollowBehavior";
export { CameraFollowBehavior } from "./CameraFollowBehavior";
export { GameScene } from "./GameScene";
export type {
  PlayerActorOptions,
  PlayerBounds,
  PlayerSpawn,
} from "./PlayerActor";
export {
  PLAYER_IDLE_CLIP,
  PLAYER_MOVE_SPEED,
  PLAYER_WALK_CLIP,
  PlayerActor,
} from "./PlayerActor";
export type { CreateRuntimeOptions, SceneHandle } from "./runtime";
export { createRuntime } from "./runtime";
