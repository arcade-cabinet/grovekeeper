/**
 * NpcMeshManager — NPC mesh creation and lifecycle.
 *
 * Loads .glb character models for each NPC entity, falling back to
 * primitive shapes (body + head + hat) if models aren't available.
 * NPCs play idle sway, smoothly turn to face a nearby player,
 * and display floating quest markers (! / ?) above their heads.
 */

import type { AnimationGroup } from "@babylonjs/core/Animations/animationGroup";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { DynamicTexture } from "@babylonjs/core/Materials/Textures/dynamicTexture";
import { CreateCylinder } from "@babylonjs/core/Meshes/Builders/cylinderBuilder";
import { CreatePlane } from "@babylonjs/core/Meshes/Builders/planeBuilder";
import { CreateSphere } from "@babylonjs/core/Meshes/Builders/sphereBuilder";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import type { Scene } from "@babylonjs/core/scene";
import { npcsQuery } from "@/world";
import { getNpcTemplate } from "@/npcs/NpcManager";
import type { HatStyle, NpcAppearance } from "@/npcs/types";
import { loadModel } from "./ModelLoader";

/** Scale for loaded .glb NPC models. */
const NPC_MODEL_SCALE = 2.0;

// ---------------------------------------------------------------------------
// Procedural NPC idle sway — gentle "alive" breathing animation
// ---------------------------------------------------------------------------
/** Idle sway speed (radians per second). Each NPC gets a random offset. */
const NPC_IDLE_SPEED = 2.0;
/** Y bob amplitude (world units). */
const NPC_BOB_HEIGHT = 0.012;
/** Side-to-side tilt amplitude (radians, ~2°). */
const NPC_SWAY_Z = 0.035;
/** Forward/back nod amplitude (radians, ~1.5°). */
const NPC_NOD_X = 0.025;

// ---------------------------------------------------------------------------
// Facing — NPCs turn toward a nearby player
// ---------------------------------------------------------------------------
/** Chebyshev tile distance at which NPCs notice the player. */
const NPC_FACE_RANGE = 3;
/** Smooth rotation speed toward player (radians/sec). */
const NPC_TURN_SPEED = 4;

// ---------------------------------------------------------------------------
// Quest markers — floating ! / ? above NPC heads
// ---------------------------------------------------------------------------
/** Marker plane size (world units). */
const MARKER_SIZE = 0.4;
/** Marker Y offset above NPC mesh origin. */
const MARKER_Y_OFFSET = 1.2;
/** Marker bob speed (radians per second). */
const MARKER_BOB_SPEED = 2.5;
/** Marker bob amplitude (world units). */
const MARKER_BOB_AMP = 0.06;

export type NpcQuestMarkerType = "available" | "in_progress" | "none";

/**
 * Shortest-path angular interpolation.
 * Wraps the delta to [-PI, PI] so the NPC always takes the short way round.
 */
function lerpAngle(from: number, to: number, t: number): number {
  let diff = to - from;
  if (diff > Math.PI) diff -= 2 * Math.PI;
  else if (diff < -Math.PI) diff += 2 * Math.PI;
  return from + diff * t;
}

/** Map NPC template IDs to .glb model files. */
const NPC_MODEL_MAP: Record<string, string> = {
  "elder-rowan": "elder.glb",
  hazel: "trader.glb",
  "botanist-fern": "botanist.glb",
  blossom: "merchant.glb",
  bramble: "ranger.glb",
  willow: "herbalist.glb",
  oakley: "carpenter.glb",
  thorn: "ranger.glb",
  sage: "mage.glb",
  ember: "alchemist.glb",
};

interface NpcMeshEntry {
  mesh: Mesh;
  idleAnim?: AnimationGroup;
  baseY: number;
  phaseOffset: number; // so NPCs don't all sway in sync
  facingAngle: number; // current Y rotation (radians), smoothly interpolated
  templateId: string;
  markerMesh: Mesh | null;
  markerType: NpcQuestMarkerType;
}

export class NpcMeshManager {
  private meshes = new Map<string, NpcMeshEntry>();

  private createHat(
    scene: Scene,
    name: string,
    style: HatStyle,
    hatColor: Color3,
  ): Mesh | null {
    if (style === "none") return null;

    const hatMat = new StandardMaterial(`${name}_hatMat`, scene);
    hatMat.diffuseColor = hatColor;

    switch (style) {
      case "pointed": {
        const hat = CreateCylinder(
          `${name}_hat`,
          {
            height: 0.25,
            diameterTop: 0,
            diameterBottom: 0.3,
            tessellation: 8,
          },
          scene,
        );
        hat.material = hatMat;
        return hat;
      }
      case "flat": {
        const hat = CreateCylinder(
          `${name}_hat`,
          {
            height: 0.06,
            diameterTop: 0.38,
            diameterBottom: 0.36,
            tessellation: 10,
          },
          scene,
        );
        hat.material = hatMat;
        return hat;
      }
      case "wide": {
        const brim = CreateCylinder(
          `${name}_hatBrim`,
          {
            height: 0.04,
            diameterTop: 0.5,
            diameterBottom: 0.48,
            tessellation: 12,
          },
          scene,
        );
        brim.material = hatMat;
        const crown = CreateCylinder(
          `${name}_hatCrown`,
          {
            height: 0.12,
            diameterTop: 0.22,
            diameterBottom: 0.25,
            tessellation: 10,
          },
          scene,
        );
        crown.position.y = 0.08;
        crown.parent = brim;
        crown.material = hatMat;
        return brim;
      }
      case "round": {
        const hat = CreateSphere(
          `${name}_hat`,
          {
            diameter: 0.32,
            segments: 8,
          },
          scene,
        );
        hat.scaling.y = 0.5;
        hat.material = hatMat;
        return hat;
      }
    }
  }

  private createPrimitiveMesh(
    scene: Scene,
    entityId: string,
    appearance: NpcAppearance,
  ): Mesh {
    const name = `npc_${entityId}`;

    const body = CreateCylinder(
      `${name}_body`,
      {
        height: 0.6,
        diameterTop: 0.25,
        diameterBottom: 0.35,
        tessellation: 10,
      },
      scene,
    );

    const bodyMat = new StandardMaterial(`${name}_bodyMat`, scene);
    bodyMat.diffuseColor = Color3.FromHexString(appearance.bodyColor);
    body.material = bodyMat;

    const head = CreateSphere(
      `${name}_head`,
      { diameter: 0.3, segments: 8 },
      scene,
    );
    head.position.y = 0.45;
    head.parent = body;
    const headMat = new StandardMaterial(`${name}_headMat`, scene);
    headMat.diffuseColor = Color3.FromHexString(appearance.headColor);
    head.material = headMat;

    const hat = this.createHat(
      scene,
      name,
      appearance.hatStyle,
      Color3.FromHexString(appearance.hatColor),
    );
    if (hat) {
      hat.position.y = 0.58;
      hat.parent = body;
    }

    body.position.y = 0.3;
    body.scaling.scaleInPlace(appearance.scale);

    return body;
  }

  /** Create meshes for new NPC entities and sync positions. */
  async update(scene: Scene): Promise<void> {
    for (const entity of npcsQuery) {
      if (!entity.npc || !entity.position) continue;

      if (!this.meshes.has(entity.id)) {
        const template = getNpcTemplate(entity.npc.templateId);
        if (!template) continue;

        // Try .glb model first
        const modelFile = NPC_MODEL_MAP[entity.npc.templateId];
        let mesh: Mesh;
        let idleAnim: AnimationGroup | undefined;

        if (modelFile) {
          const loaded = await loadModel(scene, modelFile, `npc_${entity.id}`);
          if (loaded) {
            mesh = loaded.mesh;
            const s = NPC_MODEL_SCALE * template.appearance.scale;
            mesh.scaling.set(s, s, -s);
            mesh.isPickable = true;
            mesh.name = `npc_${entity.id}`;

            // .glb imports set rotationQuaternion which overrides .rotation (Euler).
            // Null it so our idle sway animation can use .rotation.x/z.
            mesh.rotationQuaternion = null;
            for (const child of mesh.getChildMeshes()) {
              child.rotationQuaternion = null;
            }

            // Find and start idle animation
            for (const ag of loaded.animations) {
              if (ag.name.toLowerCase().includes("idle")) {
                ag.start(true);
                idleAnim = ag;
                break;
              }
            }
          } else {
            // Fallback to primitive
            mesh = this.createPrimitiveMesh(
              scene,
              entity.id,
              template.appearance,
            );
            mesh.isPickable = true;
          }
        } else {
          mesh = this.createPrimitiveMesh(
            scene,
            entity.id,
            template.appearance,
          );
          mesh.isPickable = true;
        }

        mesh.position.x = entity.position.x;
        const baseY = mesh.position.y || 0.3;
        mesh.position.y = baseY;
        mesh.position.z = entity.position.z;

        // Store NPC metadata on the mesh for picking
        mesh.metadata = {
          entityId: entity.id,
          entityType: "npc",
          templateId: entity.npc.templateId,
        };

        // Random phase offset so NPCs don't breathe in unison
        const phaseOffset = Math.random() * Math.PI * 2;
        this.meshes.set(entity.id, {
          mesh,
          idleAnim,
          baseY,
          phaseOffset,
          facingAngle: 0,
          templateId: entity.npc.templateId,
          markerMesh: null,
          markerType: "none",
        });
      }
    }
  }

  /**
   * Animate all NPC meshes: idle sway, face-player rotation, and quest marker bob.
   * Called every frame from the game loop.
   */
  animate(playerX: number, playerZ: number, dt: number): void {
    const t = performance.now() / 1000;

    for (const entry of this.meshes.values()) {
      // --- Idle sway ---
      const phase = t * NPC_IDLE_SPEED + entry.phaseOffset;
      const sin1 = Math.sin(phase);
      const cos1 = Math.cos(phase * 0.7); // slightly different freq for organic feel
      entry.mesh.position.y = entry.baseY + sin1 * NPC_BOB_HEIGHT;

      // Sway applies to rotation.x (nod) and rotation.z (tilt)
      entry.mesh.rotation.z = sin1 * NPC_SWAY_Z;
      entry.mesh.rotation.x = cos1 * NPC_NOD_X;

      // --- Face player when nearby (Chebyshev distance) ---
      const npcX = entry.mesh.position.x;
      const npcZ = entry.mesh.position.z;
      const dx = playerX - npcX;
      const dz = playerZ - npcZ;
      const chebyshev = Math.max(Math.abs(dx), Math.abs(dz));

      let targetAngle: number;
      if (chebyshev <= NPC_FACE_RANGE) {
        // Face the player
        targetAngle = Math.atan2(dx, dz);
      } else {
        // Return to default facing
        targetAngle = 0;
      }

      const turnFactor = Math.min(1, NPC_TURN_SPEED * dt);
      entry.facingAngle = lerpAngle(entry.facingAngle, targetAngle, turnFactor);
      entry.mesh.rotation.y = entry.facingAngle;

      // --- Quest marker bob ---
      if (entry.markerMesh) {
        const markerPhase = t * MARKER_BOB_SPEED + entry.phaseOffset;
        entry.markerMesh.position.y =
          entry.baseY + MARKER_Y_OFFSET + Math.sin(markerPhase) * MARKER_BOB_AMP;
        // Keep marker at NPC x/z (it's not parented, so it stays independent of NPC rotation)
        entry.markerMesh.position.x = npcX;
        entry.markerMesh.position.z = npcZ;
      }
    }
  }

  /**
   * Update quest marker indicators above NPCs.
   * Shows `!` (gold) for available quests, `?` (light blue) for in-progress quests.
   */
  updateQuestMarkers(
    npcQuestStates: Map<string, NpcQuestMarkerType>,
    scene: Scene,
  ): void {
    for (const [entityId, entry] of this.meshes) {
      const newType = npcQuestStates.get(entry.templateId) ?? "none";

      // No change — skip
      if (newType === entry.markerType) continue;

      // Dispose old marker if switching type or hiding
      if (entry.markerMesh) {
        entry.markerMesh.dispose(false, true);
        entry.markerMesh = null;
      }

      entry.markerType = newType;

      if (newType === "none") continue;

      // Create new marker
      const symbol = newType === "available" ? "!" : "?";
      const color = newType === "available" ? "#FFD700" : "#87CEEB";

      const markerName = `npc_marker_${entityId}`;
      const plane = CreatePlane(
        markerName,
        { size: MARKER_SIZE },
        scene,
      );
      plane.billboardMode = Mesh.BILLBOARDMODE_ALL;
      plane.isPickable = false;
      plane.position.x = entry.mesh.position.x;
      plane.position.z = entry.mesh.position.z;
      plane.position.y = entry.baseY + MARKER_Y_OFFSET;

      // DynamicTexture for the symbol
      const tex = new DynamicTexture(
        `${markerName}_tex`,
        64,
        scene,
        false,
      );
      tex.hasAlpha = true;

      const ctx = tex.getContext() as unknown as CanvasRenderingContext2D;
      ctx.clearRect(0, 0, 64, 64);
      ctx.font = "bold 48px Arial";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = color;
      ctx.fillText(symbol, 32, 32);
      tex.update();

      const mat = new StandardMaterial(`${markerName}_mat`, scene);
      mat.diffuseTexture = tex;
      mat.emissiveColor = Color3.FromHexString(color);
      mat.useAlphaFromDiffuseTexture = true;
      mat.disableLighting = true;
      mat.backFaceCulling = false;
      plane.material = mat;

      entry.markerMesh = plane;
    }
  }

  /** Remove a specific NPC mesh. */
  removeMesh(entityId: string): void {
    const entry = this.meshes.get(entityId);
    if (entry) {
      entry.idleAnim?.stop();
      entry.markerMesh?.dispose(false, true);
      entry.mesh.dispose(false, true);
      this.meshes.delete(entityId);
    }
  }

  /** Dispose all NPC meshes. */
  dispose(): void {
    for (const entry of this.meshes.values()) {
      entry.idleAnim?.stop();
      entry.markerMesh?.dispose(false, true);
      entry.mesh.dispose(false, true);
    }
    this.meshes.clear();
  }
}
