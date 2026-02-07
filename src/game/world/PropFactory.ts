/**
 * PropFactory — Creates decorative prop meshes for zones.
 *
 * Props are non-interactive decorative elements placed in zones
 * (fallen logs, mushroom clusters, wild flowers, etc.).
 * Built from simple BabylonJS primitives.
 */

import { CreateBox } from "@babylonjs/core/Meshes/Builders/boxBuilder";
import { CreateCylinder } from "@babylonjs/core/Meshes/Builders/cylinderBuilder";
import { CreateSphere } from "@babylonjs/core/Meshes/Builders/sphereBuilder";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import type { Mesh } from "@babylonjs/core/Meshes/mesh";
import type { Scene } from "@babylonjs/core/scene";
import type { PropPlacement } from "./types";

const propBuilders: Record<string, (scene: Scene, name: string) => Mesh> = {
  "fallen-log": (scene, name) => {
    const log = CreateCylinder(name, { height: 1.2, diameter: 0.25, tessellation: 8 }, scene);
    log.rotation.z = Math.PI / 2;
    log.position.y = 0.12;
    const mat = new StandardMaterial(`${name}_mat`, scene);
    mat.diffuseColor = new Color3(0.35, 0.22, 0.12);
    log.material = mat;
    return log;
  },

  "mushroom-cluster": (scene, name) => {
    const root = CreateBox(`${name}_root`, { size: 0.01 }, scene);
    root.isVisible = false;

    for (let i = 0; i < 3; i++) {
      const stem = CreateCylinder(`${name}_stem${i}`, { height: 0.15, diameter: 0.04 }, scene);
      const cap = CreateSphere(`${name}_cap${i}`, { diameter: 0.12, segments: 6 }, scene);
      cap.scaling.y = 0.5;
      cap.position.y = 0.12;
      cap.parent = stem;
      stem.position.y = 0.07;
      stem.position.x = (i - 1) * 0.08;
      stem.position.z = (i % 2) * 0.06;
      stem.parent = root;
      const stemMat = new StandardMaterial(`${name}_stemMat${i}`, scene);
      stemMat.diffuseColor = new Color3(0.9, 0.85, 0.7);
      stem.material = stemMat;
      const capMat = new StandardMaterial(`${name}_capMat${i}`, scene);
      capMat.diffuseColor = new Color3(0.7, 0.15, 0.1);
      cap.material = capMat;
    }
    return root;
  },

  "wild-flowers": (scene, name) => {
    const root = CreateBox(`${name}_root`, { size: 0.01 }, scene);
    root.isVisible = false;
    const colors = [
      new Color3(0.9, 0.3, 0.4),
      new Color3(0.95, 0.85, 0.2),
      new Color3(0.6, 0.3, 0.8),
      new Color3(1, 0.6, 0.2),
    ];
    for (let i = 0; i < 5; i++) {
      const stem = CreateCylinder(`${name}_fstem${i}`, { height: 0.2, diameter: 0.015 }, scene);
      const flower = CreateSphere(`${name}_flower${i}`, { diameter: 0.06, segments: 4 }, scene);
      flower.position.y = 0.12;
      flower.parent = stem;
      stem.position.y = 0.1;
      stem.position.x = (Math.sin(i * 1.3) * 0.15);
      stem.position.z = (Math.cos(i * 1.3) * 0.15);
      stem.parent = root;
      const stemMat = new StandardMaterial(`${name}_fsMat${i}`, scene);
      stemMat.diffuseColor = new Color3(0.2, 0.5, 0.15);
      stem.material = stemMat;
      const flMat = new StandardMaterial(`${name}_flMat${i}`, scene);
      flMat.diffuseColor = colors[i % colors.length];
      flower.material = flMat;
    }
    return root;
  },

  "boulder": (scene, name) => {
    const rock = CreateSphere(name, { diameter: 0.5, segments: 6 }, scene);
    rock.scaling = new Vector3(1.2, 0.7, 1.0);
    rock.position.y = 0.15;
    const mat = new StandardMaterial(`${name}_mat`, scene);
    mat.diffuseColor = new Color3(0.45, 0.42, 0.4);
    rock.material = mat;
    return rock;
  },
};

/**
 * Create a prop mesh at the specified world position.
 */
export function createPropMesh(
  scene: Scene,
  prop: PropPlacement,
  worldX: number,
  worldZ: number,
): Mesh | null {
  const builder = propBuilders[prop.propId];
  if (!builder) return null;

  const mesh = builder(scene, `prop_${prop.propId}_${worldX}_${worldZ}`);
  mesh.position.x = worldX;
  mesh.position.z = worldZ;
  if (prop.scale) mesh.scaling.scaleInPlace(prop.scale);
  mesh.freezeWorldMatrix();
  mesh.isPickable = false;
  return mesh;
}

/**
 * Dispose an array of prop meshes.
 */
export function disposePropMeshes(meshes: Mesh[]): void {
  for (const mesh of meshes) {
    mesh.dispose();
  }
}
