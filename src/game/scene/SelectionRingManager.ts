/**
 * SelectionRingManager — Glowing torus on the ground at a tapped tile.
 *
 * Follows the same init/update/dispose pattern as PlayerMeshManager.
 * A single torus mesh is created once and repositioned via show()/hide().
 * A sinusoidal pulse animates scale and alpha for a "breathing" glow.
 */

import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { CreateTorus } from "@babylonjs/core/Meshes/Builders/torusBuilder";
import type { Mesh } from "@babylonjs/core/Meshes/mesh";
import type { Scene } from "@babylonjs/core/scene";

// Torus geometry — sized to frame a 1-unit tile
const TORUS_DIAMETER = 0.9;
const TORUS_THICKNESS = 0.06;
const TORUS_TESSELLATION = 24;
/** Y offset above ground to prevent z-fighting */
const GROUND_Y = 0.02;

// Pulse animation parameters
const PULSE_SPEED = 3; // radians / second
const SCALE_MIN = 0.92;
const SCALE_MAX = 1.08;
const ALPHA_MIN = 0.55;
const ALPHA_MAX = 0.85;

/** Green-gold glow color */
const GLOW_COLOR = "#A5D6A7";

export class SelectionRingManager {
  private mesh: Mesh | null = null;
  private material: StandardMaterial | null = null;
  private phase = 0;

  init(scene: Scene): void {
    if (this.mesh) return; // Already initialized — prevent GPU resource leaks

    const torus = CreateTorus(
      "selectionRing",
      {
        diameter: TORUS_DIAMETER,
        thickness: TORUS_THICKNESS,
        tessellation: TORUS_TESSELLATION,
      },
      scene,
    );

    // Lay flat on the ground (torus is created in XY plane)
    torus.rotation.x = Math.PI / 2;
    torus.position.y = GROUND_Y;
    torus.isPickable = false;
    torus.setEnabled(false);

    const mat = new StandardMaterial("selectionRingMat", scene);
    mat.emissiveColor = Color3.FromHexString(GLOW_COLOR);
    mat.diffuseColor = Color3.FromHexString(GLOW_COLOR);
    mat.alpha = ALPHA_MAX;
    mat.backFaceCulling = false;
    mat.disableLighting = true;
    torus.material = mat;

    this.mesh = torus;
    this.material = mat;
  }

  /** Show the ring at a world position, snapped to tile center. */
  show(worldX: number, worldZ: number): void {
    if (!this.mesh) return;
    this.mesh.position.x = worldX;
    this.mesh.position.z = worldZ;
    this.mesh.position.y = GROUND_Y;
    this.mesh.setEnabled(true);
    this.phase = 0;
  }

  hide(): void {
    if (!this.mesh) return;
    this.mesh.setEnabled(false);
  }

  /** Animate the breathing pulse. Call each frame with delta time in seconds. */
  update(dt: number): void {
    if (!this.mesh || !this.mesh.isEnabled()) return;
    if (!this.material) return;

    this.phase += PULSE_SPEED * dt;

    const t = (Math.sin(this.phase) + 1) / 2; // 0..1

    // Scale oscillation
    const scale = SCALE_MIN + (SCALE_MAX - SCALE_MIN) * t;
    this.mesh.scaling.x = scale;
    this.mesh.scaling.y = scale;
    this.mesh.scaling.z = scale;

    // Alpha oscillation
    this.material.alpha = ALPHA_MIN + (ALPHA_MAX - ALPHA_MIN) * t;
  }

  dispose(): void {
    this.material?.dispose();
    this.mesh?.dispose();
    this.mesh = null;
    this.material = null;
  }
}
