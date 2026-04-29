import type { Actor } from "@jolly-pixel/engine";
import type { Object3D } from "three";

export function actorObject3D(actor: Actor): Object3D | undefined {
  return (actor as unknown as { object3D?: Object3D }).object3D;
}
