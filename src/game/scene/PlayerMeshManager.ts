/**
 * PlayerMeshManager — Player mesh creation and frame sync.
 *
 * Creates the farmer character mesh (body + head + hat) and syncs
 * its position to the player ECS entity each frame.
 */

import { CreateCylinder } from "@babylonjs/core/Meshes/Builders/cylinderBuilder";
import { CreateSphere } from "@babylonjs/core/Meshes/Builders/sphereBuilder";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import type { Mesh } from "@babylonjs/core/Meshes/mesh";
import type { Scene } from "@babylonjs/core/scene";
import { COLORS } from "../constants/config";
import { playerQuery } from "../ecs/world";

export class PlayerMeshManager {
  mesh: Mesh | null = null;

  init(scene: Scene): Mesh {
    const playerBody = CreateCylinder("playerBody", {
      height: 0.6,
      diameterTop: 0.25,
      diameterBottom: 0.35,
    }, scene);

    const playerHead = CreateSphere("playerHead", { diameter: 0.3 }, scene);
    playerHead.position.y = 0.45;
    playerHead.parent = playerBody;

    const hat = CreateCylinder("hat", {
      height: 0.12,
      diameterTop: 0.4,
      diameterBottom: 0.35,
    }, scene);
    hat.position.y = 0.58;
    hat.parent = playerBody;

    const hatTop = CreateCylinder("hatTop", {
      height: 0.15,
      diameterTop: 0.2,
      diameterBottom: 0.25,
    }, scene);
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
    return playerBody;
  }

  /** Sync mesh position to player entity. */
  update(): void {
    const playerEntity = playerQuery.first;
    if (playerEntity?.position && this.mesh) {
      this.mesh.position.x = playerEntity.position.x;
      this.mesh.position.z = playerEntity.position.z;
    }
  }

  dispose(): void {
    this.mesh?.dispose();
    this.mesh = null;
  }
}
