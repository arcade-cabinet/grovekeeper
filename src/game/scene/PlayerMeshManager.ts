/**
 * PlayerMeshManager — Player mesh creation and frame sync.
 *
 * Loads a .glb character model for the player. Falls back to
 * primitive shapes (body + head + hat) if the model isn't available.
 * Syncs position to the player ECS entity and rotates to face
 * movement direction.
 */

import type { AnimationGroup } from "@babylonjs/core/Animations/animationGroup";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { CreateCylinder } from "@babylonjs/core/Meshes/Builders/cylinderBuilder";
import { CreateSphere } from "@babylonjs/core/Meshes/Builders/sphereBuilder";
import type { Mesh } from "@babylonjs/core/Meshes/mesh";
import type { Scene } from "@babylonjs/core/scene";
import { COLORS } from "../constants/config";
import { playerQuery } from "../ecs/world";
import { loadModel } from "./ModelLoader";

/** Scale for loaded .glb models to match world unit size. */
const MODEL_SCALE = 2.0;
/** Y offset so the model stands on the ground plane. */
const MODEL_Y_OFFSET = 0;

// ---------------------------------------------------------------------------
// Procedural "jiggle" walk — Lego minifigure hop-and-tilt
// ---------------------------------------------------------------------------
/** How fast the walk cycle oscillates (radians per second). */
const JIGGLE_SPEED = 14;
/** Peak hop height (world units). */
const HOP_HEIGHT = 0.06;
/** Forward/backward tilt amplitude (radians, ~8°). */
const TILT_X = 0.14;
/** Side-to-side waddle amplitude (radians, ~5°). */
const TILT_Z = 0.09;
/** Subtle Y squash during hop (1 ± this value). */
const SQUASH = 0.04;
/** Idle breathing speed (radians per second). */
const IDLE_BOB_SPEED = 2.5;
/** Idle breathing hop height. */
const IDLE_BOB_HEIGHT = 0.01;
/** How fast jiggle ramps up / decays (0→1 or 1→0 per second). */
const JIGGLE_BLEND_RATE = 10;

export class PlayerMeshManager {
  mesh: Mesh | null = null;
  private lastX = 0;
  private lastZ = 0;
  private idleAnim: AnimationGroup | null = null;
  private walkAnim: AnimationGroup | null = null;
  private isWalking = false;
  private usingModel = false;

  /** Jiggle walk animation state */
  private jigglePhase = 0;
  private jiggleBlend = 0; // 0 = idle, 1 = full walk jiggle
  private baseY = 0; // ground-level Y for this mesh
  private baseScaleY = MODEL_SCALE; // original Y scale
  private lastUpdateTime = 0;

  async init(scene: Scene): Promise<Mesh> {
    // Try to load .glb model
    const loaded = await loadModel(scene, "player.glb", "player");

    if (loaded) {
      const { mesh, animations } = loaded;
      mesh.scaling.setAll(MODEL_SCALE);
      mesh.position.y = MODEL_Y_OFFSET;
      mesh.isPickable = false;

      // Find idle and walk animations
      for (const ag of animations) {
        const name = ag.name.toLowerCase();
        if (name.includes("idle") && !this.idleAnim) {
          this.idleAnim = ag;
        } else if (
          (name.includes("walk") || name.includes("run")) &&
          !this.walkAnim
        ) {
          this.walkAnim = ag;
        }
      }

      // Start idle by default
      if (this.idleAnim) {
        this.idleAnim.start(true);
      }

      this.mesh = mesh;
      this.usingModel = true;
      this.baseY = MODEL_Y_OFFSET;
      this.baseScaleY = MODEL_SCALE;
      this.lastUpdateTime = performance.now();
      return mesh;
    }

    // Fallback: primitive shapes
    return this.createPrimitiveMesh(scene);
  }

  private createPrimitiveMesh(scene: Scene): Mesh {
    const playerBody = CreateCylinder(
      "playerBody",
      {
        height: 0.6,
        diameterTop: 0.25,
        diameterBottom: 0.35,
      },
      scene,
    );

    const playerHead = CreateSphere("playerHead", { diameter: 0.3 }, scene);
    playerHead.position.y = 0.45;
    playerHead.parent = playerBody;

    const hat = CreateCylinder(
      "hat",
      {
        height: 0.12,
        diameterTop: 0.4,
        diameterBottom: 0.35,
      },
      scene,
    );
    hat.position.y = 0.58;
    hat.parent = playerBody;

    const hatTop = CreateCylinder(
      "hatTop",
      {
        height: 0.15,
        diameterTop: 0.2,
        diameterBottom: 0.25,
      },
      scene,
    );
    hatTop.position.y = 0.7;
    hatTop.parent = playerBody;

    // Materials
    const bodyMat = new StandardMaterial("bodyMat", scene);
    bodyMat.diffuseColor = Color3.FromHexString(COLORS.forestGreen);
    playerBody.material = bodyMat;

    const headMat = new StandardMaterial("headMat", scene);
    headMat.diffuseColor = Color3.FromHexString("#FFCCBC");
    playerHead.material = headMat;

    const hatMat = new StandardMaterial("hatMat", scene);
    hatMat.diffuseColor = Color3.FromHexString(COLORS.autumnGold);
    hat.material = hatMat;
    hatTop.material = hatMat;

    playerBody.position.y = 0.3;
    this.mesh = playerBody;
    this.usingModel = false;
    this.baseY = 0.3;
    this.baseScaleY = 1;
    this.lastUpdateTime = performance.now();
    return playerBody;
  }

  /** Sync mesh position to player entity, rotate to face movement, and jiggle. */
  update(): void {
    const playerEntity = playerQuery.first;
    if (!playerEntity?.position || !this.mesh) return;

    const now = performance.now();
    const dt = Math.min((now - this.lastUpdateTime) / 1000, 0.1); // seconds, capped
    this.lastUpdateTime = now;

    const newX = playerEntity.position.x;
    const newZ = playerEntity.position.z;

    this.mesh.position.x = newX;
    this.mesh.position.z = newZ;

    // Detect movement
    const dx = newX - this.lastX;
    const dz = newZ - this.lastZ;
    const moving = Math.abs(dx) > 0.001 || Math.abs(dz) > 0.001;

    // Rotate to face movement direction
    if (moving) {
      this.mesh.rotation.y = Math.atan2(dx, dz);
    }

    // Toggle skeletal walk/idle animation (if model has them)
    if (this.usingModel) {
      if (moving && !this.isWalking) {
        this.idleAnim?.stop();
        this.walkAnim?.start(true);
        this.isWalking = true;
      } else if (!moving && this.isWalking) {
        this.walkAnim?.stop();
        this.idleAnim?.start(true);
        this.isWalking = false;
      }
    }

    // --- Procedural jiggle animation (works with or without skeletal anims) ---

    // Blend toward target: 1 when walking, 0 when idle
    const target = moving ? 1 : 0;
    this.jiggleBlend +=
      (target - this.jiggleBlend) * Math.min(1, JIGGLE_BLEND_RATE * dt);

    // Advance walk cycle phase only while moving
    if (moving) {
      this.jigglePhase += JIGGLE_SPEED * dt;
    }

    const wb = this.jiggleBlend; // walk blend (0–1)
    const sin1 = Math.sin(this.jigglePhase); // primary cycle
    const sin2 = Math.sin(this.jigglePhase * 2); // double-frequency for hop (lands twice per cycle)
    const idleSin = Math.sin((now / 1000) * IDLE_BOB_SPEED); // idle breathing

    // Hop: absolute value of sin gives a nice "bounce" shape
    const walkHop = Math.abs(sin2) * HOP_HEIGHT * wb;
    const idleHop = IDLE_BOB_HEIGHT * (0.5 + 0.5 * idleSin) * (1 - wb);
    this.mesh.position.y = this.baseY + walkHop + idleHop;

    // Forward/backward tilt (lean into steps)
    this.mesh.rotation.x = sin1 * TILT_X * wb;

    // Side-to-side waddle (half frequency of hop)
    this.mesh.rotation.z = sin1 * TILT_Z * wb;

    // Squash & stretch on Y axis
    const squashAmount = 1 - Math.abs(sin2) * SQUASH * wb;
    if (this.usingModel) {
      this.mesh.scaling.y = this.baseScaleY * squashAmount;
    } else {
      this.mesh.scaling.y = squashAmount;
    }

    this.lastX = newX;
    this.lastZ = newZ;
  }

  dispose(): void {
    this.idleAnim?.stop();
    this.walkAnim?.stop();
    this.idleAnim = null;
    this.walkAnim = null;
    this.mesh?.dispose(false, true);
    this.mesh = null;
  }
}
