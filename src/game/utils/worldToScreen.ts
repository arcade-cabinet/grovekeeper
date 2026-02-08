import { Matrix, Vector3 } from "@babylonjs/core/Maths/math.vector";
import type { Scene } from "@babylonjs/core/scene";

/**
 * Project a 3D world position to CSS pixel coordinates.
 *
 * Uses BabylonJS `Vector3.Project()` through the view-projection
 * pipeline, then converts from engine pixels to CSS pixels using
 * the engine's hardware scaling level.
 *
 * Returns `null` if the point is behind the camera (z < 0 or z > 1).
 */
export function worldToScreen(
  worldX: number,
  worldY: number,
  worldZ: number,
  scene: Scene,
): { x: number; y: number } | null {
  const camera = scene.activeCamera;
  if (!camera) return null;

  const engine = scene.getEngine();
  const width = engine.getRenderWidth();
  const height = engine.getRenderHeight();

  const worldPos = new Vector3(worldX, worldY, worldZ);
  const transform = scene.getTransformMatrix();
  const viewport = camera.viewport.toGlobal(width, height);

  // arg1 = world (model) matrix — Identity since coordinates are already in world space
  // arg2 = view-projection transform matrix
  const projected = Vector3.Project(
    worldPos,
    Matrix.Identity(),
    transform,
    viewport,
  );

  // Behind camera check
  if (projected.z < 0 || projected.z > 1) return null;

  // BabylonJS gives engine-pixel coordinates — convert to CSS pixels
  // using the engine's hardware scaling level (accounts for custom scaling)
  const scaling = engine.getHardwareScalingLevel();
  return {
    x: projected.x * scaling,
    y: projected.y * scaling,
  };
}
