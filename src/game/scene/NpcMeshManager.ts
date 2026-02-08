/**
 * NpcMeshManager — NPC mesh creation and lifecycle.
 *
 * Loads .glb character models for each NPC entity, falling back to
 * primitive shapes (body + head + hat) if models aren't available.
 * NPCs are static — meshes play idle animation after placement.
 */

import type { AnimationGroup } from "@babylonjs/core/Animations/animationGroup";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { CreateCylinder } from "@babylonjs/core/Meshes/Builders/cylinderBuilder";
import { CreateSphere } from "@babylonjs/core/Meshes/Builders/sphereBuilder";
import type { Mesh } from "@babylonjs/core/Meshes/mesh";
import type { Scene } from "@babylonjs/core/scene";
import { npcsQuery } from "../ecs/world";
import { getNpcTemplate } from "../npcs/NpcManager";
import type { HatStyle, NpcAppearance } from "../npcs/types";
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

/** Map NPC template IDs to .glb model files. */
const NPC_MODEL_MAP: Record<string, string> = {
  "elder-rowan": "elder.glb",
  hazel: "trader.glb",
  "botanist-fern": "botanist.glb",
  blossom: "merchant.glb",
};

interface NpcMeshEntry {
  mesh: Mesh;
  idleAnim?: AnimationGroup;
  baseY: number;
  phaseOffset: number; // so NPCs don't all sway in sync
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
            mesh.scaling.setAll(NPC_MODEL_SCALE * template.appearance.scale);
            mesh.isPickable = true;
            mesh.name = `npc_${entity.id}`;

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
        this.meshes.set(entity.id, { mesh, idleAnim, baseY, phaseOffset });
      }
    }

    // Animate idle sway for all NPC meshes
    this.animateIdleSway();
  }

  /** Procedural idle sway — gentle bob, tilt, and nod. */
  private animateIdleSway(): void {
    const t = performance.now() / 1000;
    for (const entry of this.meshes.values()) {
      const phase = t * NPC_IDLE_SPEED + entry.phaseOffset;
      const sin1 = Math.sin(phase);
      const cos1 = Math.cos(phase * 0.7); // slightly different freq for organic feel
      entry.mesh.position.y = entry.baseY + sin1 * NPC_BOB_HEIGHT;
      entry.mesh.rotation.z = sin1 * NPC_SWAY_Z;
      entry.mesh.rotation.x = cos1 * NPC_NOD_X;
    }
  }

  /** Remove a specific NPC mesh. */
  removeMesh(entityId: string): void {
    const entry = this.meshes.get(entityId);
    if (entry) {
      entry.idleAnim?.stop();
      entry.mesh.dispose(false, true);
      this.meshes.delete(entityId);
    }
  }

  /** Dispose all NPC meshes. */
  dispose(): void {
    for (const entry of this.meshes.values()) {
      entry.idleAnim?.stop();
      entry.mesh.dispose(false, true);
    }
    this.meshes.clear();
  }
}
