/**
 * Scene module — Jolly Pixel runtime + Solid mount point + first-class
 * Actor behaviors. Other modules should import from `@/game/scene`
 * rather than reaching into individual files.
 */

export { CameraFollowBehavior } from "./CameraFollowBehavior";
export type { CameraFollowOptions } from "./CameraFollowBehavior";
export { GameScene } from "./GameScene";
export { PlayerActor } from "./PlayerActor";
export type { PlayerActorOptions, PlayerSpawn } from "./PlayerActor";
export { createRuntime } from "./runtime";
export type { CreateRuntimeOptions, SceneHandle } from "./runtime";
