import { Matrix } from "@babylonjs/core/Maths/math.vector";
import type { Scene } from "@babylonjs/core/scene";

/**
 * Unproject a screen coordinate onto the world ground plane (y = 0).
 * Uses BabylonJS picking ray from the active camera.
 */
export function screenToGroundPlane(
  screenX: number,
  screenY: number,
  scene: Scene,
): { x: number; z: number } | null {
  const ray = scene.createPickingRay(
    screenX,
    screenY,
    Matrix.Identity(),
    scene.activeCamera ?? null,
  );
  // Ray parallel to ground — no intersection
  if (Math.abs(ray.direction.y) < 1e-8) return null;
  const t = -ray.origin.y / ray.direction.y;
  if (t < 0) return null;
  return {
    x: ray.origin.x + t * ray.direction.x,
    z: ray.origin.z + t * ray.direction.z,
  };
}
