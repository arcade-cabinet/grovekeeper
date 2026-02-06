/**
 * CameraManager — Top-down orthographic camera that scales with viewport.
 *
 * Uses ArcRotateCamera in orthographic mode. The view always centers on
 * the player and scales out to show surrounding biomes on larger screens.
 * A slight tilt angle (~15°) reveals building faces and terrain depth
 * without the "tilted diorama" effect of isometric views.
 */

import { ArcRotateCamera } from "@babylonjs/core/Cameras/arcRotateCamera";
import { Camera } from "@babylonjs/core/Cameras/camera";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import type { Engine } from "@babylonjs/core/Engines/engine";
import type { Scene } from "@babylonjs/core/scene";

/** Minimum vertical view in world tiles — guarantees immediate area visible. */
const MIN_VIEW = 14;
/** Maximum vertical view in world tiles — prevents zooming out too far. */
const MAX_VIEW = 40;
/** Target pixels per world tile. Smaller = more tiles visible. */
const PIXELS_PER_TILE = 45;

/** Camera tilt from vertical (radians). 30° — diorama top-down with depth. */
const CAMERA_BETA = Math.PI / 6;
/** Camera rotation (radians). -PI/2 = camera from south looking north. */
const CAMERA_ALPHA = -Math.PI / 2;
/** Orthographic distance — just needs to clear all scene geometry. */
const CAMERA_RADIUS = 80;
/** Smooth camera tracking speed. */
const LERP_SPEED = 3;

export class CameraManager {
  camera: ArcRotateCamera | null = null;
  private engine: Engine | null = null;

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

    // Switch to orthographic — scales cleanly with viewport
    camera.mode = Camera.ORTHOGRAPHIC_CAMERA;

    this.camera = camera;
    this.engine = scene.getEngine() as Engine;

    // Set initial viewport bounds
    this.updateViewport();

    return camera;
  }

  /**
   * Recalculate orthographic bounds from current viewport dimensions.
   * Called on resize and each frame (trivially cheap).
   *
   * On mobile (small canvas): shows ~14 tiles — your immediate grove.
   * On desktop (large canvas): shows 24-40 tiles — surrounding biomes visible.
   */
  updateViewport(): void {
    if (!this.camera || !this.engine) return;

    const canvasHeight = this.engine.getRenderHeight();
    const aspect = this.engine.getAspectRatio(this.camera);

    // Determine vertical view size based on screen real estate
    const idealView = canvasHeight / PIXELS_PER_TILE;
    const viewSize = Math.max(MIN_VIEW, Math.min(MAX_VIEW, idealView));

    this.camera.orthoTop = viewSize / 2;
    this.camera.orthoBottom = -viewSize / 2;
    this.camera.orthoLeft = -(viewSize * aspect) / 2;
    this.camera.orthoRight = (viewSize * aspect) / 2;
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
    this.engine = null;
  }
}
