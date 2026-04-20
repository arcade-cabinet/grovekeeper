/**
 * PropFactory — Creates decorative prop meshes for zones.
 *
 * Props are non-interactive decorative elements placed in zones
 * (fallen logs, mushroom clusters, wild flowers, etc.).
 * Built from simple BabylonJS primitives.
 *
 * Batch API (createPropMeshBatch):
 *   When many props of the same type appear in a zone (>4), use the batch
 *   API to create one thin-instanced draw call per prop type instead of one
 *   draw call per prop. For prop types with child meshes the root and every
 *   child each get their own thin-instance buffer so the full composite still
 *   renders correctly.
 *
 * Material Cache:
 *   All prop materials are drawn from a shared StandardMaterial cache keyed
 *   by (r,g,b,alpha,emissive?,sceneUid). This means 10 boulder instances share
 *   exactly 1 StandardMaterial object instead of 10.  The palette is small
 *   (~15 distinct colors) so cache size is bounded.
 */

// Side-effect import: augments Mesh prototype with thinInstance* methods.
import "@babylonjs/core/Meshes/thinInstanceMesh";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import {
  Matrix,
  Quaternion,
  Vector3,
} from "@babylonjs/core/Maths/math.vector";
import { CreateBox } from "@babylonjs/core/Meshes/Builders/boxBuilder";
import { CreateCylinder } from "@babylonjs/core/Meshes/Builders/cylinderBuilder";
import { CreateSphere } from "@babylonjs/core/Meshes/Builders/sphereBuilder";
import type { Mesh } from "@babylonjs/core/Meshes/mesh";
import type { Scene } from "@babylonjs/core/scene";
import type { PropPlacement } from "./types";

// ---------------------------------------------------------------------------
// Shared material cache — keyed by color fingerprint + scene uid
// ---------------------------------------------------------------------------

/**
 * A compact descriptor for a StandardMaterial with optional alpha and
 * emissive.  Two materials with identical descriptors are structurally
 * identical and can be safely shared across prop instances.
 */
interface MatSpec {
  r: number;
  g: number;
  b: number;
  alpha?: number;
  emissiveR?: number;
  emissiveG?: number;
  emissiveB?: number;
}

/** Module-level cache: survives scene reloads if the scene uid is in the key. */
const _propMatCache = new Map<string, StandardMaterial>();

/**
 * Return (or create) a StandardMaterial that matches the given spec.
 * Materials are cached per-scene so we never cross scene boundaries.
 */
function getPropMaterial(scene: Scene, spec: MatSpec): StandardMaterial {
  const key = `${scene.uid}|${spec.r},${spec.g},${spec.b}|a${spec.alpha ?? 1}|e${spec.emissiveR ?? 0},${spec.emissiveG ?? 0},${spec.emissiveB ?? 0}`;
  const cached = _propMatCache.get(key);
  if (cached) return cached;

  const mat = new StandardMaterial(`propMat_${key}`, scene);
  mat.diffuseColor = new Color3(spec.r, spec.g, spec.b);

  if (spec.alpha !== undefined && spec.alpha < 1) {
    mat.alpha = spec.alpha;
    mat.transparencyMode = StandardMaterial.MATERIAL_ALPHABLEND;
    mat.backFaceCulling = false;
  }

  if (
    spec.emissiveR !== undefined ||
    spec.emissiveG !== undefined ||
    spec.emissiveB !== undefined
  ) {
    mat.emissiveColor = new Color3(
      spec.emissiveR ?? 0,
      spec.emissiveG ?? 0,
      spec.emissiveB ?? 0,
    );
  }

  _propMatCache.set(key, mat);
  return mat;
}

/**
 * Dispose all cached prop materials and clear the cache.
 * Call when disposing the BabylonJS scene.
 */
export function disposePropMaterialCache(): void {
  for (const mat of _propMatCache.values()) {
    mat.dispose();
  }
  _propMatCache.clear();
}

// ---------------------------------------------------------------------------
// Scratch buffers — allocated once, reused across all batch calls.
// ---------------------------------------------------------------------------

const _scaleVec = new Vector3(1, 1, 1);
const _quat = new Quaternion();
const _transVec = new Vector3(0, 0, 0);
const _instanceMat = Matrix.Identity();
const _childLocalMat = Matrix.Identity();
const _combinedMat = Matrix.Identity();

const propBuilders: Record<string, (scene: Scene, name: string) => Mesh> = {
  "fallen-log": (scene, name) => {
    const log = CreateCylinder(
      name,
      { height: 1.2, diameter: 0.25, tessellation: 8 },
      scene,
    );
    log.rotation.z = Math.PI / 2;
    log.position.y = 0.12;
    log.material = getPropMaterial(scene, { r: 0.35, g: 0.22, b: 0.12 });
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
      stem.material = getPropMaterial(scene, { r: 0.9, g: 0.85, b: 0.7 });
      cap.material = getPropMaterial(scene, { r: 0.7, g: 0.15, b: 0.1 });
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
      stem.material = getPropMaterial(scene, { r: 0.2, g: 0.5, b: 0.15 });
      const fc = colors[i % colors.length];
      flower.material = getPropMaterial(scene, { r: fc.r, g: fc.g, b: fc.b });
    }
    return root;
  },

  boulder: (scene, name) => {
    const rock = CreateSphere(name, { diameter: 0.5, segments: 6 }, scene);
    rock.scaling = new Vector3(1.2, 0.7, 1.0);
    rock.position.y = 0.15;
    rock.material = getPropMaterial(scene, { r: 0.45, g: 0.42, b: 0.4 });
    return rock;
  },

  signpost: (scene, name) => {
    const post = CreateCylinder(
      name,
      { height: 1.0, diameter: 0.08, tessellation: 8 },
      scene,
    );
    post.position.y = 0.5;
    post.material = getPropMaterial(scene, { r: 0.4, g: 0.26, b: 0.13 });

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
    const plankMat = getPropMaterial(scene, { r: 0.55, g: 0.38, b: 0.2 });
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
    post.material = getPropMaterial(scene, { r: 0.3, g: 0.3, b: 0.3 });

    const body = CreateBox(
      `${name}_body`,
      { width: 0.15, height: 0.2, depth: 0.15 },
      scene,
    );
    body.position.y = 0.4;
    body.parent = post;
    body.material = getPropMaterial(scene, {
      r: 1.0,
      g: 0.85,
      b: 0.5,
      emissiveR: 0.8,
      emissiveG: 0.6,
      emissiveB: 0.2,
    });

    const cap = CreateBox(
      `${name}_cap`,
      { width: 0.18, height: 0.04, depth: 0.18 },
      scene,
    );
    cap.position.y = 0.52;
    cap.parent = post;
    cap.material = getPropMaterial(scene, { r: 0.3, g: 0.3, b: 0.3 });
    return post;
  },

  "fence-section": (scene, name) => {
    const root = CreateBox(`${name}_root`, { size: 0.01 }, scene);
    root.isVisible = false;

    const fencePostMat = getPropMaterial(scene, { r: 0.45, g: 0.3, b: 0.15 });
    const fenceRailMat = getPropMaterial(scene, { r: 0.5, g: 0.35, b: 0.18 });

    const lPost = CreateCylinder(
      `${name}_lp`,
      { height: 0.5, diameter: 0.06, tessellation: 8 },
      scene,
    );
    lPost.position.y = 0.25;
    lPost.position.x = -0.3;
    lPost.parent = root;
    lPost.material = fencePostMat;

    const rPost = CreateCylinder(
      `${name}_rp`,
      { height: 0.5, diameter: 0.06, tessellation: 8 },
      scene,
    );
    rPost.position.y = 0.25;
    rPost.position.x = 0.3;
    rPost.parent = root;
    rPost.material = fencePostMat;

    const topRail = CreateBox(
      `${name}_tr`,
      { width: 0.6, height: 0.04, depth: 0.04 },
      scene,
    );
    topRail.position.y = 0.4;
    topRail.parent = root;
    topRail.material = fenceRailMat;

    const botRail = CreateBox(
      `${name}_br`,
      { width: 0.6, height: 0.04, depth: 0.04 },
      scene,
    );
    botRail.position.y = 0.2;
    botRail.parent = root;
    botRail.material = fenceRailMat;
    return root;
  },

  stump: (scene, name) => {
    const trunk = CreateCylinder(
      name,
      { height: 0.25, diameter: 0.35, tessellation: 10 },
      scene,
    );
    trunk.position.y = 0.125;
    trunk.material = getPropMaterial(scene, { r: 0.4, g: 0.28, b: 0.14 });

    const top = CreateCylinder(
      `${name}_top`,
      { height: 0.03, diameter: 0.33, tessellation: 10 },
      scene,
    );
    top.position.y = 0.14;
    top.parent = trunk;
    top.material = getPropMaterial(scene, { r: 0.25, g: 0.16, b: 0.08 });
    return trunk;
  },

  birdbath: (scene, name) => {
    const pedestal = CreateCylinder(
      name,
      { height: 0.5, diameter: 0.15, tessellation: 10 },
      scene,
    );
    pedestal.position.y = 0.25;
    const birdbathStoneMat = getPropMaterial(scene, { r: 0.6, g: 0.58, b: 0.55 });
    pedestal.material = birdbathStoneMat;

    const bowl = CreateSphere(
      `${name}_bowl`,
      { diameter: 0.45, segments: 8 },
      scene,
    );
    bowl.scaling.y = 0.4;
    bowl.position.y = 0.3;
    bowl.parent = pedestal;
    bowl.material = birdbathStoneMat;

    const water = CreateCylinder(
      `${name}_water`,
      { height: 0.02, diameter: 0.35, tessellation: 10 },
      scene,
    );
    water.position.y = 0.35;
    water.parent = pedestal;
    water.material = getPropMaterial(scene, { r: 0.3, g: 0.55, b: 0.75, alpha: 0.7 });
    return pedestal;
  },

  campfire: (scene, name) => {
    const root = CreateBox(`${name}_root`, { size: 0.01 }, scene);
    root.isVisible = false;

    const campfireStoneMat = getPropMaterial(scene, { r: 0.4, g: 0.38, b: 0.35 });
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
      stone.material = campfireStoneMat;
    }

    const campfireLogMat = getPropMaterial(scene, { r: 0.35, g: 0.22, b: 0.1 });
    const log1 = CreateCylinder(
      `${name}_l1`,
      { height: 0.3, diameter: 0.05, tessellation: 6 },
      scene,
    );
    log1.rotation.z = Math.PI / 2;
    log1.rotation.y = 0.4;
    log1.position.y = 0.06;
    log1.parent = root;
    log1.material = campfireLogMat;
    const log2 = CreateCylinder(
      `${name}_l2`,
      { height: 0.3, diameter: 0.05, tessellation: 6 },
      scene,
    );
    log2.rotation.z = Math.PI / 2;
    log2.rotation.y = -0.4;
    log2.position.y = 0.09;
    log2.parent = root;
    log2.material = campfireLogMat;

    const flameMat = getPropMaterial(scene, {
      r: 1.0,
      g: 0.5,
      b: 0.0,
      emissiveR: 1.0,
      emissiveG: 0.4,
      emissiveB: 0.0,
    });
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

// ---------------------------------------------------------------------------
// Batch API — thin-instanced props for types with many instances in a zone.
// ---------------------------------------------------------------------------

/** Position/orientation descriptor for one instance in a batch. */
export interface PropBatchPosition {
  /** World-space X coordinate. */
  worldX: number;
  /** World-space Z coordinate. */
  worldZ: number;
  /** Uniform scale multiplier (default 1). */
  scale?: number;
  /** Y-axis rotation in radians (default 0). */
  rotY?: number;
}

/** Handle returned by createPropMeshBatch — required for later disposal. */
export interface PropBatch {
  /**
   * Source (template) meshes registered for thin-instance rendering.
   * Includes the root mesh and all child meshes for composite props.
   * Pass to disposePropBatch() when the zone is unloaded.
   */
  sourceMeshes: Mesh[];
}

/**
 * Create a thin-instanced batch for many props of the same type.
 *
 * Builds ONE template mesh (plus child template meshes for composite props),
 * parks them below the ground plane at y=-9999, and writes all instance
 * transforms into a single thinInstanceSetBuffer per mesh. This collapses
 * N draw calls into 1 (root) + C (children) draw calls regardless of N.
 *
 * Use when positions.length > 4.  For ≤4 props prefer createPropMesh().
 *
 * @param scene     - Active BabylonJS Scene.
 * @param propId    - Prop type identifier (e.g. "boulder", "fallen-log").
 * @param positions - Array of world-space placements.
 * @param batchId   - Unique identifier used in mesh names (e.g. zone id).
 * @returns PropBatch handle, or null if propId is unknown.
 */
export function createPropMeshBatch(
  scene: Scene,
  propId: string,
  positions: PropBatchPosition[],
  batchId = "batch",
): PropBatch | null {
  const builder = propBuilders[propId];
  if (!builder) return null;
  if (positions.length === 0) return { sourceMeshes: [] };

  // Build a throw-away template at the origin to harvest its geometry and
  // child layout.  We park it far below the ground so it never renders.
  const templateName = `prop_batch_template_${propId}_${batchId}`;
  const template = builder(scene, templateName);
  template.position.y = -9999;
  template.isPickable = false;
  template.doNotSyncBoundingInfo = true;
  template.alwaysSelectAsActiveMesh = false;
  // Template must be visible (even invisible-root composites need this flag
  // true so BabylonJS registers thin-instance draw calls).
  template.isVisible = true;
  template.freezeWorldMatrix();

  // Collect children (deep) — each needs its own thin-instance buffer.
  const children = template.getChildMeshes(false) as Mesh[];

  // Park children below ground too and freeze them.
  for (const child of children) {
    child.position.y += -9999;
    child.isPickable = false;
    child.doNotSyncBoundingInfo = true;
    child.alwaysSelectAsActiveMesh = false;
    child.isVisible = true;
    child.freezeWorldMatrix();
  }

  const count = positions.length;
  // Build the instance matrix buffer for the root mesh.
  const rootMatrices = new Float32Array(16 * count);

  for (let i = 0; i < count; i++) {
    const pos = positions[i];
    const s = pos.scale ?? 1;
    const ry = pos.rotY ?? 0;

    _scaleVec.set(s, s, s);
    Quaternion.RotationYawPitchRollToRef(ry, 0, 0, _quat);
    _transVec.set(pos.worldX, 0, pos.worldZ);

    Matrix.ComposeToRef(_scaleVec, _quat, _transVec, _instanceMat);
    _instanceMat.copyToArray(rootMatrices, i * 16);
  }

  template.thinInstanceSetBuffer("matrix", rootMatrices, 16, true);

  // For each child, compute its world matrix for every instance by combining
  // the child's local transform with the instance world matrix:
  //   child_world_i = child_local × instance_world_i
  // This accounts for the child's position/rotation/scaling offset inside
  // the composite prop, transformed by each instance's placement.
  if (children.length > 0) {
    // Detach children from the template parent so their thin-instance
    // matrices are interpreted as true world matrices, not parent-relative.
    for (const child of children) {
      // Capture child local position/rotation/scaling BEFORE detaching.
      const cx = child.position.x;
      const cy = child.position.y + 9999; // undo our earlier y-park offset
      const cz = child.position.z;
      const crx = child.rotation.x;
      const cry = child.rotation.y;
      const crz = child.rotation.z;
      const csx = child.scaling.x;
      const csy = child.scaling.y;
      const csz = child.scaling.z;

      // Build child local matrix once.
      const childQuat = Quaternion.RotationYawPitchRoll(cry, crx, crz);
      const childScale = new Vector3(csx, csy, csz);
      const childTrans = new Vector3(cx, cy, cz);
      Matrix.ComposeToRef(childScale, childQuat, childTrans, _childLocalMat);

      const childMatrices = new Float32Array(16 * count);
      for (let i = 0; i < count; i++) {
        const pos = positions[i];
        const s = pos.scale ?? 1;
        const ry = pos.rotY ?? 0;

        _scaleVec.set(s, s, s);
        Quaternion.RotationYawPitchRollToRef(ry, 0, 0, _quat);
        _transVec.set(pos.worldX, 0, pos.worldZ);

        Matrix.ComposeToRef(_scaleVec, _quat, _transVec, _instanceMat);
        // child_world = child_local × instance_world
        _childLocalMat.multiplyToRef(_instanceMat, _combinedMat);
        _combinedMat.copyToArray(childMatrices, i * 16);
      }

      // Detach from parent so BabylonJS treats the thin-instance matrices
      // as absolute world matrices rather than parent-relative.
      child.parent = null;
      child.thinInstanceSetBuffer("matrix", childMatrices, 16, true);
    }
  }

  return { sourceMeshes: [template, ...children] };
}

/**
 * Dispose all source meshes produced by createPropMeshBatch.
 */
export function disposePropBatch(batch: PropBatch): void {
  for (const mesh of batch.sourceMeshes) {
    mesh.dispose();
  }
}
