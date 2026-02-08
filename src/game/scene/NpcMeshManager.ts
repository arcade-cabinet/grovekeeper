/**
 * NpcMeshManager — NPC mesh creation and lifecycle.
 *
 * Creates humanoid figures (body + head + hat) for each NPC entity,
 * with colors and hat styles from NpcTemplate appearance data.
 * NPCs are static — meshes are frozen after creation.
 */

import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { CreateCylinder } from "@babylonjs/core/Meshes/Builders/cylinderBuilder";
import { CreateSphere } from "@babylonjs/core/Meshes/Builders/sphereBuilder";
import type { Mesh } from "@babylonjs/core/Meshes/mesh";
import type { Scene } from "@babylonjs/core/scene";
import { npcsQuery } from "../ecs/world";
import { getNpcTemplate } from "../npcs/NpcManager";
import type { HatStyle, NpcAppearance } from "../npcs/types";

export class NpcMeshManager {
  private meshes = new Map<string, Mesh>();

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

  private createMesh(
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
    body.isPickable = false;
    body.freezeWorldMatrix();

    return body;
  }

  /** Create meshes for new NPC entities and sync positions. */
  update(scene: Scene): void {
    for (const entity of npcsQuery) {
      if (!entity.npc || !entity.position) continue;

      if (!this.meshes.has(entity.id)) {
        const template = getNpcTemplate(entity.npc.templateId);
        if (!template) continue;

        const mesh = this.createMesh(scene, entity.id, template.appearance);
        mesh.position.x = entity.position.x;
        mesh.position.z = entity.position.z;
        // Re-freeze after position update
        mesh.unfreezeWorldMatrix();
        mesh.freezeWorldMatrix();
        this.meshes.set(entity.id, mesh);
      }
    }
  }

  /** Remove a specific NPC mesh. */
  removeMesh(entityId: string): void {
    const mesh = this.meshes.get(entityId);
    if (mesh) {
      mesh.dispose(false, true);
      this.meshes.delete(entityId);
    }
  }

  /** Dispose all NPC meshes. */
  dispose(): void {
    for (const mesh of this.meshes.values()) {
      mesh.dispose(false, true);
    }
    this.meshes.clear();
  }
}
