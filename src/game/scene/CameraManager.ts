/**
 * CameraManager — Orthographic diorama camera with atmospheric fog.
 *
 * Uses ArcRotateCamera in orthographic mode at a deliberate 30° diorama
 * angle — like looking at a tabletop miniature. Building faces and tree
 * trunks are clearly visible. Scene fog blends the horizon into the sky.
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

/** Camera tilt from vertical (radians). 30° — deliberate diorama viewing angle. */
const CAMERA_BETA = Math.PI / 6;
/** Camera rotation (radians). -PI/2 = camera from south looking north. */
const CAMERA_ALPHA = -Math.PI / 2;
/** Orthographic distance — just needs to clear all scene geometry. */
const CAMERA_RADIUS = 80;
/** Smooth camera tracking speed. */
const LERP_SPEED = 3;

/** Cache reduced-motion preference (checked once at construction). */
const prefersReducedMotion =
  typeof window !== "undefined" &&
  window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;

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

    // With a tilted orthographic camera, the lower portion of the frustum
    // passes below the ground plane (y=0), exposing the sky clear color.
    // Shift the ortho bounds upward so the player sits in the lower third
    // and more of the world ahead is visible. The shift is proportional to
    // the tilt angle — bigger tilt = more shift needed.
    const shift = viewSize * Math.sin(CAMERA_BETA) * 0.4;
    this.camera.orthoTop = viewSize / 2 + shift;
    this.camera.orthoBottom = -viewSize / 2 + shift;
    this.camera.orthoLeft = -(viewSize * aspect) / 2;
    this.camera.orthoRight = (viewSize * aspect) / 2;
  }

  /** Smoothly track a world position (e.g. the player). */
  trackTarget(worldX: number, worldZ: number, dt: number): void {
    if (!this.camera) return;
    const target = new Vector3(worldX, 0, worldZ);
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
