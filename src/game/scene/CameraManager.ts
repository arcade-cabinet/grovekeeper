/**
 * CameraManager — Isometric ArcRotateCamera setup and player tracking.
 *
 * Camera is locked to a fixed isometric angle. Each frame, the camera target
 * lerps toward the player position for smooth following.
 */

import { ArcRotateCamera } from "@babylonjs/core/Cameras/arcRotateCamera";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import type { Scene } from "@babylonjs/core/scene";

const CAMERA_RADIUS = 18;
const CAMERA_ALPHA = -Math.PI / 4;     // 45 degree rotation
const CAMERA_BETA = Math.PI / 3.5;     // ~51 degree tilt
const LERP_SPEED = 3;

export class CameraManager {
  camera: ArcRotateCamera | null = null;

  init(scene: Scene, initialTarget?: { x: number; z: number }): ArcRotateCamera {
    const target = initialTarget
      ? new Vector3(initialTarget.x, 0, initialTarget.z)
      : new Vector3(5.5, 0, 5.5);
    const camera = new ArcRotateCamera(
      "camera",
      CAMERA_ALPHA,
      CAMERA_BETA,
      CAMERA_RADIUS,
      target,
      scene,
    );

    // Lock camera — no user interaction
    camera.inputs.clear();
    camera.lowerRadiusLimit = CAMERA_RADIUS;
    camera.upperRadiusLimit = CAMERA_RADIUS;
    camera.lowerBetaLimit = CAMERA_BETA;
    camera.upperBetaLimit = CAMERA_BETA;

    this.camera = camera;
    return camera;
  }

  /** Smoothly track a world position (e.g. the player). */
  trackTarget(worldX: number, worldZ: number, dt: number): void {
    if (!this.camera) return;
    const target = new Vector3(worldX, 0, worldZ);
    const factor = Math.min(1, dt * LERP_SPEED);
    this.camera.target = Vector3.Lerp(this.camera.target, target, factor);
  }

  dispose(): void {
    this.camera?.dispose();
    this.camera = null;
  }
}
