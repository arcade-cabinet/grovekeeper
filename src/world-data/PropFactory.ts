/**
 * PropFactory — Creates decorative prop meshes for zones.
 *
 * Props are non-interactive decorative elements placed in zones
 * (fallen logs, mushroom clusters, wild flowers, etc.).
 * Built from simple BabylonJS primitives.
 */

import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { CreateBox } from "@babylonjs/core/Meshes/Builders/boxBuilder";
import { CreateCylinder } from "@babylonjs/core/Meshes/Builders/cylinderBuilder";
import { CreateSphere } from "@babylonjs/core/Meshes/Builders/sphereBuilder";
import type { Mesh } from "@babylonjs/core/Meshes/mesh";
import type { Scene } from "@babylonjs/core/scene";
import type { PropPlacement } from "./types";

const propBuilders: Record<string, (scene: Scene, name: string) => Mesh> = {
  "fallen-log": (scene, name) => {
    const log = CreateCylinder(
      name,
      { height: 1.2, diameter: 0.25, tessellation: 8 },
      scene,
    );
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
      const stem = CreateCylinder(
        `${name}_stem${i}`,
        { height: 0.15, diameter: 0.04 },
        scene,
      );
      const cap = CreateSphere(
        `${name}_cap${i}`,
        { diameter: 0.12, segments: 6 },
        scene,
      );
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
      const stem = CreateCylinder(
        `${name}_fstem${i}`,
        { height: 0.2, diameter: 0.015 },
        scene,
      );
      const flower = CreateSphere(
        `${name}_flower${i}`,
        { diameter: 0.06, segments: 4 },
        scene,
      );
      flower.position.y = 0.12;
      flower.parent = stem;
      stem.position.y = 0.1;
      stem.position.x = Math.sin(i * 1.3) * 0.15;
      stem.position.z = Math.cos(i * 1.3) * 0.15;
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

  boulder: (scene, name) => {
    const rock = CreateSphere(name, { diameter: 0.5, segments: 6 }, scene);
    rock.scaling = new Vector3(1.2, 0.7, 1.0);
    rock.position.y = 0.15;
    const mat = new StandardMaterial(`${name}_mat`, scene);
    mat.diffuseColor = new Color3(0.45, 0.42, 0.4);
    rock.material = mat;
    return rock;
  },

  signpost: (scene, name) => {
    const post = CreateCylinder(
      name,
      { height: 1.0, diameter: 0.08, tessellation: 8 },
      scene,
    );
    post.position.y = 0.5;
    const postMat = new StandardMaterial(`${name}_postMat`, scene);
    postMat.diffuseColor = new Color3(0.4, 0.26, 0.13);
    post.material = postMat;

    const plank1 = CreateBox(
      `${name}_plank1`,
      { width: 0.4, height: 0.1, depth: 0.04 },
      scene,
    );
    plank1.position.y = 0.35;
    plank1.rotation.y = 0.3;
    plank1.parent = post;
    const plank2 = CreateBox(
      `${name}_plank2`,
      { width: 0.35, height: 0.08, depth: 0.04 },
      scene,
    );
    plank2.position.y = 0.2;
    plank2.rotation.y = -0.4;
    plank2.parent = post;
    const plankMat = new StandardMaterial(`${name}_plankMat`, scene);
    plankMat.diffuseColor = new Color3(0.55, 0.38, 0.2);
    plank1.material = plankMat;
    plank2.material = plankMat;
    return post;
  },

  lantern: (scene, name) => {
    const post = CreateCylinder(
      name,
      { height: 0.8, diameter: 0.06, tessellation: 8 },
      scene,
    );
    post.position.y = 0.4;
    const postMat = new StandardMaterial(`${name}_postMat`, scene);
    postMat.diffuseColor = new Color3(0.3, 0.3, 0.3);
    post.material = postMat;

    const body = CreateBox(
      `${name}_body`,
      { width: 0.15, height: 0.2, depth: 0.15 },
      scene,
    );
    body.position.y = 0.4;
    body.parent = post;
    const bodyMat = new StandardMaterial(`${name}_bodyMat`, scene);
    bodyMat.diffuseColor = new Color3(1.0, 0.85, 0.5);
    bodyMat.emissiveColor = new Color3(0.8, 0.6, 0.2);
    body.material = bodyMat;

    const cap = CreateBox(
      `${name}_cap`,
      { width: 0.18, height: 0.04, depth: 0.18 },
      scene,
    );
    cap.position.y = 0.52;
    cap.parent = post;
    const capMat = new StandardMaterial(`${name}_capMat`, scene);
    capMat.diffuseColor = new Color3(0.3, 0.3, 0.3);
    cap.material = capMat;
    return post;
  },

  "fence-section": (scene, name) => {
    const root = CreateBox(`${name}_root`, { size: 0.01 }, scene);
    root.isVisible = false;

    const postMat = new StandardMaterial(`${name}_postMat`, scene);
    postMat.diffuseColor = new Color3(0.45, 0.3, 0.15);
    const railMat = new StandardMaterial(`${name}_railMat`, scene);
    railMat.diffuseColor = new Color3(0.5, 0.35, 0.18);

    const lPost = CreateCylinder(
      `${name}_lp`,
      { height: 0.5, diameter: 0.06, tessellation: 8 },
      scene,
    );
    lPost.position.y = 0.25;
    lPost.position.x = -0.3;
    lPost.parent = root;
    lPost.material = postMat;

    const rPost = CreateCylinder(
      `${name}_rp`,
      { height: 0.5, diameter: 0.06, tessellation: 8 },
      scene,
    );
    rPost.position.y = 0.25;
    rPost.position.x = 0.3;
    rPost.parent = root;
    rPost.material = postMat;

    const topRail = CreateBox(
      `${name}_tr`,
      { width: 0.6, height: 0.04, depth: 0.04 },
      scene,
    );
    topRail.position.y = 0.4;
    topRail.parent = root;
    topRail.material = railMat;

    const botRail = CreateBox(
      `${name}_br`,
      { width: 0.6, height: 0.04, depth: 0.04 },
      scene,
    );
    botRail.position.y = 0.2;
    botRail.parent = root;
    botRail.material = railMat;
    return root;
  },

  stump: (scene, name) => {
    const trunk = CreateCylinder(
      name,
      { height: 0.25, diameter: 0.35, tessellation: 10 },
      scene,
    );
    trunk.position.y = 0.125;
    const trunkMat = new StandardMaterial(`${name}_trunkMat`, scene);
    trunkMat.diffuseColor = new Color3(0.4, 0.28, 0.14);
    trunk.material = trunkMat;

    const top = CreateCylinder(
      `${name}_top`,
      { height: 0.03, diameter: 0.33, tessellation: 10 },
      scene,
    );
    top.position.y = 0.14;
    top.parent = trunk;
    const topMat = new StandardMaterial(`${name}_topMat`, scene);
    topMat.diffuseColor = new Color3(0.25, 0.16, 0.08);
    top.material = topMat;
    return trunk;
  },

  birdbath: (scene, name) => {
    const pedestal = CreateCylinder(
      name,
      { height: 0.5, diameter: 0.15, tessellation: 10 },
      scene,
    );
    pedestal.position.y = 0.25;
    const stoneMat = new StandardMaterial(`${name}_stoneMat`, scene);
    stoneMat.diffuseColor = new Color3(0.6, 0.58, 0.55);
    pedestal.material = stoneMat;

    const bowl = CreateSphere(
      `${name}_bowl`,
      { diameter: 0.45, segments: 8 },
      scene,
    );
    bowl.scaling.y = 0.4;
    bowl.position.y = 0.3;
    bowl.parent = pedestal;
    bowl.material = stoneMat;

    const water = CreateCylinder(
      `${name}_water`,
      { height: 0.02, diameter: 0.35, tessellation: 10 },
      scene,
    );
    water.position.y = 0.35;
    water.parent = pedestal;
    const waterMat = new StandardMaterial(`${name}_waterMat`, scene);
    waterMat.diffuseColor = new Color3(0.3, 0.55, 0.75);
    waterMat.alpha = 0.7;
    water.material = waterMat;
    return pedestal;
  },

  campfire: (scene, name) => {
    const root = CreateBox(`${name}_root`, { size: 0.01 }, scene);
    root.isVisible = false;

    const stoneMat = new StandardMaterial(`${name}_stoneMat`, scene);
    stoneMat.diffuseColor = new Color3(0.4, 0.38, 0.35);
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      const stone = CreateSphere(
        `${name}_s${i}`,
        { diameter: 0.1, segments: 4 },
        scene,
      );
      stone.position.x = Math.cos(angle) * 0.18;
      stone.position.z = Math.sin(angle) * 0.18;
      stone.position.y = 0.04;
      stone.parent = root;
      stone.material = stoneMat;
    }

    const logMat = new StandardMaterial(`${name}_logMat`, scene);
    logMat.diffuseColor = new Color3(0.35, 0.22, 0.1);
    const log1 = CreateCylinder(
      `${name}_l1`,
      { height: 0.3, diameter: 0.05, tessellation: 6 },
      scene,
    );
    log1.rotation.z = Math.PI / 2;
    log1.rotation.y = 0.4;
    log1.position.y = 0.06;
    log1.parent = root;
    log1.material = logMat;
    const log2 = CreateCylinder(
      `${name}_l2`,
      { height: 0.3, diameter: 0.05, tessellation: 6 },
      scene,
    );
    log2.rotation.z = Math.PI / 2;
    log2.rotation.y = -0.4;
    log2.position.y = 0.09;
    log2.parent = root;
    log2.material = logMat;

    const flameMat = new StandardMaterial(`${name}_flameMat`, scene);
    flameMat.diffuseColor = new Color3(1.0, 0.5, 0.0);
    flameMat.emissiveColor = new Color3(1.0, 0.4, 0.0);
    const flame1 = CreateSphere(
      `${name}_f1`,
      { diameter: 0.1, segments: 4 },
      scene,
    );
    flame1.scaling.y = 1.5;
    flame1.position.y = 0.15;
    flame1.parent = root;
    flame1.material = flameMat;
    const flame2 = CreateSphere(
      `${name}_f2`,
      { diameter: 0.07, segments: 4 },
      scene,
    );
    flame2.scaling.y = 1.8;
    flame2.position.y = 0.18;
    flame2.position.x = 0.03;
    flame2.parent = root;
    flame2.material = flameMat;
    return root;
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
