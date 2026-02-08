/**
 * CameraManager — Over-the-shoulder 3rd-person camera.
 *
 * Uses ArcRotateCamera in perspective mode positioned close behind
 * and slightly above the player, looking forward. Similar to
 * Animal Crossing but lower and closer for immersion.
 * Scene fog blends the horizon into the sky.
 */

import { ArcRotateCamera } from "@babylonjs/core/Cameras/arcRotateCamera";
import type { Engine } from "@babylonjs/core/Engines/engine";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import type { Scene } from "@babylonjs/core/scene";

/** Camera tilt from vertical (radians). ~77° — over-the-shoulder, looking forward. */
const CAMERA_BETA = 1.35;
/** Camera rotation (radians). -PI/2 = camera from south looking north. */
const CAMERA_ALPHA = -Math.PI / 2;
/** Base distance from target — tight behind the player. */
const BASE_RADIUS = 6;
/** Field of view (radians). ~55° — wider for immersive feel. */
const CAMERA_FOV = 0.95;
/** Smooth camera tracking speed. */
const LERP_SPEED = 3;
/** Camera target height — focus on character torso, not ground. */
const TARGET_Y = 1.5;

/** Cache reduced-motion preference (checked once at construction). */
const prefersReducedMotion =
  typeof window !== "undefined" &&
  window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;

export class CameraManager {
  camera: ArcRotateCamera | null = null;
  private engine: Engine | null = null;

  init(
    scene: Scene,
    initialTarget?: { x: number; z: number },
  ): ArcRotateCamera {
    const target = initialTarget
      ? new Vector3(initialTarget.x, TARGET_Y, initialTarget.z)
      : new Vector3(5.5, TARGET_Y, 5.5);

    const camera = new ArcRotateCamera(
      "camera",
      CAMERA_ALPHA,
      CAMERA_BETA,
      BASE_RADIUS,
      target,
      scene,
    );

    // Lock camera — no user interaction
    camera.inputs.clear();
    camera.lowerRadiusLimit = BASE_RADIUS * 0.9;
    camera.upperRadiusLimit = BASE_RADIUS * 1.15;
    camera.lowerBetaLimit = CAMERA_BETA;
    camera.upperBetaLimit = CAMERA_BETA;

    // Perspective settings
    camera.fov = CAMERA_FOV;
    camera.minZ = 0.5;
    camera.maxZ = 100;

    this.camera = camera;
    this.engine = scene.getEngine() as Engine;

    // Set initial viewport
    this.updateViewport();

    return camera;
  }

  /**
   * Adjust camera radius based on viewport aspect ratio.
   * Perspective FOV naturally adapts to any viewport size, but we
   * fine-tune the radius to prevent tunnel vision on ultra-wide or
   * overly zoomed-in feel on narrow mobile.
   */
  updateViewport(): void {
    if (!this.camera || !this.engine) return;

    const aspect = this.engine.getAspectRatio(this.camera);

    if (aspect > 2.0) {
      // Ultra-wide: pull out slightly
      this.camera.radius = BASE_RADIUS * 1.15;
    } else if (aspect < 0.7) {
      // Narrow portrait mobile: push in slightly
      this.camera.radius = BASE_RADIUS * 0.9;
    } else {
      this.camera.radius = BASE_RADIUS;
    }
  }

  /** Smoothly track a world position (e.g. the player). */
  trackTarget(worldX: number, worldZ: number, dt: number): void {
    if (!this.camera) return;
    const target = new Vector3(worldX, TARGET_Y, worldZ);
    if (prefersReducedMotion) {
      this.camera.target = target;
    } else {
      const factor = Math.min(1, dt * LERP_SPEED);
      this.camera.target = Vector3.Lerp(this.camera.target, target, factor);
    }
  }

  dispose(): void {
    this.camera?.dispose();
    this.camera = null;
    this.engine = null;
  }
}
