/**
 * Three.js Tree Geometry Generator -- port of the BabylonJS SPS Tree Generator.
 *
 * Original: BabylonJS/Extensions/TreeGenerators/SPSTreeGenerator
 * This version creates merged Three.js BufferGeometry with vertex colors baked in,
 * suitable for use with R3F <mesh> components.
 *
 * The algorithm:
 *   1. Build a trunk as a tapered, bowed cylinder (ribbon cross-sections)
 *   2. Fork branches at the trunk tip, optionally with a second level of boughs
 *   3. Place leaf disc geometries along branch paths
 *   4. Scatter mini-tree copies (trunk+leaves) at branch endpoints and random points
 *   5. Merge everything into a single BufferGeometry with vertex colors
 *
 * License: Apache-2.0 (same as BabylonJS)
 */

import * as THREE from "three";
import growthConfig from "@/config/game/growth.json" with { type: "json" };
import speciesConfig from "@/config/game/species.json" with { type: "json" };

import { createRNG } from "./seedRNG";

// ---------------------------------------------------------------------------
// Inline mergeGeometries — avoids importing from three/examples/jsm which
// uses ESM and causes issues with expo's Jest runtime.
// Supports merging geometries that share identical attribute names/itemSizes.
// ---------------------------------------------------------------------------

function mergeGeometries(geometries: THREE.BufferGeometry[]): THREE.BufferGeometry | null {
  if (geometries.length === 0) return null;
  if (geometries.length === 1) return geometries[0].clone();

  // Collect attribute names from first geometry
  const attrNames = Object.keys(geometries[0].attributes);
  const isIndexed = geometries[0].index !== null;

  let totalVertices = 0;
  let totalIndices = 0;
  for (const geom of geometries) {
    totalVertices += geom.getAttribute("position").count;
    if (isIndexed && geom.index) {
      totalIndices += geom.index.count;
    }
  }

  // Build merged attribute arrays
  const mergedAttrs: Record<string, { array: Float32Array; itemSize: number }> = {};
  for (const name of attrNames) {
    const itemSize = (geometries[0].getAttribute(name) as THREE.BufferAttribute).itemSize;
    mergedAttrs[name] = {
      array: new Float32Array(totalVertices * itemSize),
      itemSize,
    };
  }

  let mergedIndex: Uint32Array | null = null;
  if (isIndexed) {
    mergedIndex = new Uint32Array(totalIndices);
  }

  let vertexOffset = 0;
  let indexOffset = 0;
  for (const geom of geometries) {
    for (const name of attrNames) {
      const attr = geom.getAttribute(name) as THREE.BufferAttribute | undefined;
      if (!attr) continue;
      const target = mergedAttrs[name];
      const srcArray = attr.array as Float32Array;
      target.array.set(srcArray, vertexOffset * target.itemSize);
    }

    if (isIndexed && mergedIndex && geom.index) {
      const idxArray = geom.index.array;
      for (let i = 0; i < idxArray.length; i++) {
        mergedIndex[indexOffset + i] = idxArray[i] + vertexOffset;
      }
      indexOffset += geom.index.count;
    }

    vertexOffset += geom.getAttribute("position").count;
  }

  const merged = new THREE.BufferGeometry();
  for (const name of attrNames) {
    const { array, itemSize } = mergedAttrs[name];
    merged.setAttribute(name, new THREE.Float32BufferAttribute(array, itemSize));
  }
  if (mergedIndex) {
    merged.setIndex(new THREE.BufferAttribute(mergedIndex, 1));
  }

  return merged;
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SpeciesMeshParams {
  trunkHeight: number;
  trunkRadius: number;
  canopyRadius: number;
  canopySegments: number;
  color: { trunk: string; canopy: string };
}

interface SpeciesData {
  id: string;
  meshParams: SpeciesMeshParams;
}

// ---------------------------------------------------------------------------
// Internal vector helpers (avoid allocating THREE.Vector3 in hot loops)
// ---------------------------------------------------------------------------

interface Vec3 {
  x: number;
  y: number;
  z: number;
}

function vec3(x: number, y: number, z: number): Vec3 {
  return { x, y, z };
}

function addVec3(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
}

function scaleVec3(v: Vec3, s: number): Vec3 {
  return { x: v.x * s, y: v.y * s, z: v.z * s };
}

function normalizeVec3(v: Vec3): Vec3 {
  const len = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
  if (len === 0) return { x: 0, y: 1, z: 0 };
  return { x: v.x / len, y: v.y / len, z: v.z / len };
}

function crossVec3(a: Vec3, b: Vec3): Vec3 {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
  };
}

// ---------------------------------------------------------------------------
// Coordinate system (same as BabylonJS version)
// ---------------------------------------------------------------------------

interface CoordSystem {
  x: Vec3;
  y: Vec3;
  z: Vec3;
}

/** Strip all attributes except position, normal, and color for merge compatibility. */
function stripToVertexColorAttrs(geom: THREE.BufferGeometry): void {
  const toRemove: string[] = [];
  for (const name of Object.keys(geom.attributes)) {
    if (name !== "position" && name !== "normal" && name !== "color") {
      toRemove.push(name);
    }
  }
  for (const name of toRemove) {
    geom.deleteAttribute(name);
  }
}

function coordSystem(dir: Vec3): CoordSystem {
  const y = normalizeVec3(dir);
  let x: Vec3;
  if (Math.abs(dir.x) === 0 && Math.abs(dir.z) === 0) {
    x = normalizeVec3({ x: dir.y, y: -dir.x, z: 0 });
  } else {
    x = normalizeVec3({ x: dir.y, y: -dir.x, z: 0 });
  }
  const z = crossVec3(x, y);
  return { x, y, z };
}

function randPct(v: number, p: number, rng: () => number): number {
  if (p === 0) return v;
  return (1 + (1 - 2 * rng()) * p) * v;
}

// ---------------------------------------------------------------------------
// Branch geometry builder (ribbon-style tapered cylinder)
// ---------------------------------------------------------------------------

interface BranchResult {
  geometry: THREE.BufferGeometry;
  core: Vec3[];
  radii: number[];
}

const BRANCH_SIDES = 12;

function createBranchGeometry(
  branchAt: Vec3,
  branchSys: CoordSystem,
  branchLength: number,
  branchTaper: number,
  branchSlices: number,
  bowFreq: number,
  bowHeight: number,
  branchRadius: number,
  rng: () => number,
): BranchResult {
  const corePath: Vec3[] = [];
  const radii: number[] = [];
  const positions: number[] = [];
  const indices: number[] = [];

  // Build cross-section ring points along the branch
  const rings: Vec3[][] = [];

  for (let d = 0; d < branchSlices; d++) {
    const t = d / branchSlices;
    // Core point with bowing
    let corePoint = scaleVec3(branchSys.y, t * branchLength);
    corePoint = addVec3(
      corePoint,
      scaleVec3(branchSys.x, bowHeight * Math.exp(-t) * Math.sin(bowFreq * t * Math.PI)),
    );
    corePoint = addVec3(corePoint, branchAt);
    corePath[d] = corePoint;

    // Randomized, tapered radius
    const xsr = branchRadius * (1 + (0.4 * rng() - 0.2)) * (1 - (1 - branchTaper) * t);
    radii.push(xsr);

    const ring: Vec3[] = [];
    for (let a = 0; a < BRANCH_SIDES; a++) {
      const theta = (a * Math.PI * 2) / BRANCH_SIDES;
      const pt = addVec3(
        scaleVec3(branchSys.x, xsr * Math.cos(theta)),
        scaleVec3(branchSys.z, xsr * Math.sin(theta)),
      );
      ring.push(addVec3(pt, corePoint));
    }
    rings.push(ring);
  }

  // Cap: converge to the last core point
  const tip = corePath[corePath.length - 1];
  const capRing: Vec3[] = [];
  for (let a = 0; a < BRANCH_SIDES; a++) {
    capRing.push(tip);
  }
  rings.push(capRing);

  // Build vertex buffer + index buffer from rings
  for (const ring of rings) {
    for (const pt of ring) {
      positions.push(pt.x, pt.y, pt.z);
    }
  }

  const ringCount = rings.length;
  for (let r = 0; r < ringCount - 1; r++) {
    for (let a = 0; a < BRANCH_SIDES; a++) {
      const a1 = (a + 1) % BRANCH_SIDES;
      const i0 = r * BRANCH_SIDES + a;
      const i1 = r * BRANCH_SIDES + a1;
      const i2 = (r + 1) * BRANCH_SIDES + a;
      const i3 = (r + 1) * BRANCH_SIDES + a1;
      indices.push(i0, i2, i1);
      indices.push(i1, i2, i3);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();

  return { geometry, core: corePath, radii };
}

// ---------------------------------------------------------------------------
// Tree base (trunk + forking branches)
// ---------------------------------------------------------------------------

interface TreeBaseResult {
  geometry: THREE.BufferGeometry;
  paths: Vec3[][];
  radii: number[][];
  directions: CoordSystem[];
}

function createTreeBase(
  trunkHeight: number,
  trunkTaper: number,
  trunkSlices: number,
  boughs: number,
  forks: number,
  forkAngle: number,
  forkRatio: number,
  bowFreq: number,
  bowHeight: number,
  rng: () => number,
): TreeBaseResult {
  const PHI = 2 / (1 + Math.sqrt(5));
  const trunkDirection = vec3(0, 1, 0);
  const trunkSys = coordSystem(trunkDirection);
  const trunkRootAt = vec3(0, 0, 0);
  const branchGeoms: THREE.BufferGeometry[] = [];
  const treePaths: Vec3[][] = [];
  const treeRadii: number[][] = [];
  const treeDirections: CoordSystem[] = [];

  // Trunk
  const trunk = createBranchGeometry(
    trunkRootAt,
    trunkSys,
    trunkHeight,
    trunkTaper,
    trunkSlices,
    1,
    bowHeight,
    1,
    rng,
  );
  branchGeoms.push(trunk.geometry);
  treePaths.push(trunk.core);
  treeRadii.push(trunk.radii);
  treeDirections.push(trunkSys);

  const topPoint = trunk.core[trunk.core.length - 1];
  const forkTurn = (2 * Math.PI) / forks;

  // First level of forking
  for (let f = 0; f < forks; f++) {
    const turn = randPct(f * forkTurn, 0.25, rng);
    const fa = randPct(forkAngle, 0.15, rng);
    const forkDir = addVec3(
      scaleVec3(trunkSys.y, Math.cos(fa)),
      addVec3(
        scaleVec3(trunkSys.x, Math.sin(fa) * Math.sin(turn)),
        scaleVec3(trunkSys.z, Math.sin(fa) * Math.cos(turn)),
      ),
    );
    const forkSys = coordSystem(forkDir);

    const branch = createBranchGeometry(
      topPoint,
      forkSys,
      trunkHeight * forkRatio,
      trunkTaper,
      trunkSlices,
      bowFreq,
      bowHeight * PHI,
      trunkTaper,
      rng,
    );
    branchGeoms.push(branch.geometry);
    treePaths.push(branch.core);
    treeRadii.push(branch.radii);
    treeDirections.push(forkSys);

    // Second level of boughs
    if (boughs > 1) {
      const boughTop = branch.core[branch.core.length - 1];
      for (let k = 0; k < forks; k++) {
        const boughTurn = randPct(k * forkTurn, 0.25, rng);
        const ba = randPct(forkAngle, 0.15, rng);
        const boughDir = addVec3(
          scaleVec3(forkSys.y, Math.cos(ba)),
          addVec3(
            scaleVec3(forkSys.x, Math.sin(ba) * Math.sin(boughTurn)),
            scaleVec3(forkSys.z, Math.sin(ba) * Math.cos(boughTurn)),
          ),
        );
        const boughSys = coordSystem(boughDir);

        const bough = createBranchGeometry(
          boughTop,
          boughSys,
          trunkHeight * forkRatio * forkRatio,
          trunkTaper,
          trunkSlices,
          bowFreq,
          bowHeight * PHI * PHI,
          trunkTaper * trunkTaper,
          rng,
        );
        branchGeoms.push(bough.geometry);
        treePaths.push(bough.core);
        treeRadii.push(bough.radii);
        treeDirections.push(boughSys);
      }
    }
  }

  const merged = mergeGeometries(branchGeoms);
  // Dispose individual branch geometries after merging
  for (const g of branchGeoms) g.dispose();

  return {
    geometry: merged ?? new THREE.BufferGeometry(),
    paths: treePaths,
    radii: treeRadii,
    directions: treeDirections,
  };
}

// ---------------------------------------------------------------------------
// Leaf geometry builder
// ---------------------------------------------------------------------------

function createLeafGeometries(
  base: TreeBaseResult,
  forks: number,
  boughs: number,
  trunkHeight: number,
  trunkTaper: number,
  trunkSlices: number,
  forkRatio: number,
  leavesOnBranch: number,
  leafWHRatio: number,
  leafColor: THREE.Color,
  rng: () => number,
): THREE.BufferGeometry | null {
  const clampedBoughs = boughs;
  const branchLength = trunkHeight * forkRatio ** clampedBoughs;
  const leafGap = branchLength / (2 * leavesOnBranch);
  const leafWidth = 1.5 * trunkTaper ** (clampedBoughs - 1);
  const leafRadius = leafWidth / 2;

  const leafGeoms: THREE.BufferGeometry[] = [];
  const totalLeaves = 2 * leavesOnBranch * forks ** clampedBoughs;

  // Template leaf disc (strip uv for merge compatibility with branch geometry)
  const leafTemplate = new THREE.CircleGeometry(leafRadius, 8);
  stripToVertexColorAttrs(leafTemplate);

  for (let s = 0; s < totalLeaves; s++) {
    let a: number;
    if (clampedBoughs === 1) {
      a = Math.floor(s / (2 * leavesOnBranch)) + 1;
    } else {
      const idx = Math.floor(s / (2 * leavesOnBranch));
      a = 2 + (idx % forks) + Math.floor(idx / forks) * (forks + 1);
    }

    if (a >= base.paths.length) continue;

    const j = s % (2 * leavesOnBranch);
    const g = (j * leafGap + 1.5 * leafGap) / branchLength;

    let upper = Math.ceil(trunkSlices * g);
    if (upper > base.paths[a].length - 1) upper = base.paths[a].length - 1;
    const lower = upper - 1;
    if (lower < 0) continue;

    const gl = lower / (trunkSlices - 1);
    const gu = upper / (trunkSlices - 1);
    const denom = gu - gl;
    if (denom === 0) continue;

    const pathLower = base.paths[a][lower];
    const pathUpper = base.paths[a][upper];
    const frac = (g - gl) / denom;

    const px = pathLower.x + (pathUpper.x - pathLower.x) * frac;
    const py =
      pathLower.y +
      (pathUpper.y - pathLower.y) * frac +
      ((0.6 * leafWidth) / leafWHRatio + base.radii[a][upper]) * (2 * (s % 2) - 1);
    const pz = pathLower.z + (pathUpper.z - pathLower.z) * frac;

    const leaf = leafTemplate.clone();

    // Random rotation
    const euler = new THREE.Euler(
      (rng() * Math.PI) / 4,
      (rng() * Math.PI) / 2,
      (rng() * Math.PI) / 4,
    );
    const mat4 = new THREE.Matrix4();
    mat4.makeRotationFromEuler(euler);
    // Scale Y for leaf aspect ratio
    mat4.scale(new THREE.Vector3(1, 1 / leafWHRatio, 1));
    // Set position
    mat4.setPosition(px, py, pz);
    leaf.applyMatrix4(mat4);
    leafGeoms.push(leaf);
  }

  leafTemplate.dispose();

  if (leafGeoms.length === 0) return null;
  const merged = mergeGeometries(leafGeoms);
  for (const g of leafGeoms) g.dispose();

  if (!merged) return null;

  // Bake vertex colors
  const vertexCount = merged.getAttribute("position").count;
  const colors = new Float32Array(vertexCount * 3);
  for (let i = 0; i < vertexCount; i++) {
    colors[i * 3] = leafColor.r;
    colors[i * 3 + 1] = leafColor.g;
    colors[i * 3 + 2] = leafColor.b;
  }
  merged.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));

  return merged;
}

// ---------------------------------------------------------------------------
// Mini-tree placement (canopy crown) -- simplified from BabylonJS SPS version
// ---------------------------------------------------------------------------

function createCrownGeometries(
  base: TreeBaseResult,
  forks: number,
  boughs: number,
  forkAngle: number,
  trunkTaper: number,
  branchAngle: number,
  branches: number,
  trunkColor: THREE.Color,
  rng: () => number,
): THREE.BufferGeometry | null {
  const clampedBoughs = boughs;
  const sc = trunkTaper ** (clampedBoughs + 1);
  const crownGeoms: THREE.BufferGeometry[] = [];
  const forkTurn = (2 * Math.PI) / forks;

  // Pre-compute random turns for fork-end mini-trees
  const turns: number[] = [];
  for (let f = 0; f < forks ** (clampedBoughs + 1); f++) {
    turns.push(randPct(Math.floor(f / forks ** clampedBoughs) * forkTurn, 0.2, rng));
  }

  // Fork-end mini-trees: place a scaled copy of the base trunk at each branch tip
  const miniTemplate = base.geometry.clone();
  for (let s = 0; s < forks ** (clampedBoughs + 1); s++) {
    let a: number;
    const idx = s % forks ** clampedBoughs;
    if (clampedBoughs === 1) {
      a = idx + 1;
    } else {
      a = 2 + (idx % forks) + Math.floor(idx / forks) * (forks + 1);
    }
    if (a >= base.paths.length) continue;

    const miniSys = base.directions[a];
    const miniTop = base.paths[a][base.paths[a].length - 1];
    const turn = turns[s];

    const fa2 = randPct(forkAngle, 0, rng);
    const miniDir = addVec3(
      scaleVec3(miniSys.y, Math.cos(fa2)),
      addVec3(
        scaleVec3(miniSys.x, Math.sin(fa2) * Math.sin(turn)),
        scaleVec3(miniSys.z, Math.sin(fa2) * Math.cos(turn)),
      ),
    );

    const geom = miniTemplate.clone();
    const mat4 = new THREE.Matrix4();
    const axisUp = new THREE.Vector3(0, 1, 0);
    const dir3 = new THREE.Vector3(miniDir.x, miniDir.y, miniDir.z);
    const quat = new THREE.Quaternion().setFromUnitVectors(axisUp, dir3.normalize());
    mat4.compose(
      new THREE.Vector3(miniTop.x, miniTop.y, miniTop.z),
      quat,
      new THREE.Vector3(sc, sc, sc),
    );
    geom.applyMatrix4(mat4);
    crownGeoms.push(geom);
  }

  // Random branch mini-trees
  const bplen = base.paths.length;
  const bp0len = base.paths[0].length;
  for (let b = 0; b < branches; b++) {
    const bturn = 2 * Math.PI * rng() - Math.PI;
    const pathIdx = Math.floor(rng() * bplen);
    const pointIdx = Math.floor(rng() * (bp0len - 1) + 1);
    if (pathIdx >= base.paths.length) continue;
    if (pointIdx >= base.paths[pathIdx].length) continue;

    const miniSys = base.directions[pathIdx];
    const miniPlace = addVec3(
      base.paths[pathIdx][pointIdx],
      scaleVec3(miniSys.z, base.radii[pathIdx][pointIdx] / 2),
    );

    const ba2 = randPct(branchAngle, 0, rng);
    const miniDir = addVec3(
      scaleVec3(miniSys.y, Math.cos(ba2)),
      addVec3(
        scaleVec3(miniSys.x, Math.sin(ba2) * Math.sin(bturn)),
        scaleVec3(miniSys.z, Math.sin(ba2) * Math.cos(bturn)),
      ),
    );

    const geom = miniTemplate.clone();
    const mat4 = new THREE.Matrix4();
    const axisUp = new THREE.Vector3(0, 1, 0);
    const dir3 = new THREE.Vector3(miniDir.x, miniDir.y, miniDir.z);
    const quat = new THREE.Quaternion().setFromUnitVectors(axisUp, dir3.normalize());
    mat4.compose(
      new THREE.Vector3(miniPlace.x, miniPlace.y, miniPlace.z),
      quat,
      new THREE.Vector3(sc, sc, sc),
    );
    geom.applyMatrix4(mat4);
    crownGeoms.push(geom);
  }

  miniTemplate.dispose();

  if (crownGeoms.length === 0) return null;
  const merged = mergeGeometries(crownGeoms);
  for (const g of crownGeoms) g.dispose();

  if (!merged) return null;

  // Bake vertex colors
  const vertexCount = merged.getAttribute("position").count;
  const colors = new Float32Array(vertexCount * 3);
  for (let i = 0; i < vertexCount; i++) {
    colors[i * 3] = trunkColor.r;
    colors[i * 3 + 1] = trunkColor.g;
    colors[i * 3 + 2] = trunkColor.b;
  }
  merged.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));

  return merged;
}

// ---------------------------------------------------------------------------
// Species data lookup
// ---------------------------------------------------------------------------

const allSpecies: SpeciesData[] = [...speciesConfig.base, ...speciesConfig.prestige];

function getSpeciesData(speciesId: string): SpeciesData | undefined {
  return allSpecies.find((s) => s.id === speciesId);
}

// ---------------------------------------------------------------------------
// SPS-equivalent parameter profiles (ported from treeMeshBuilder.ts)
// ---------------------------------------------------------------------------

interface SPSProfile {
  trunkHeight: number;
  trunkTaper: number;
  trunkSlices: number;
  boughs: 1 | 2;
  forks: number;
  forkAngle: number;
  forkRatio: number;
  branches: number;
  branchAngle: number;
  bowFreq: number;
  bowHeight: number;
  leavesOnBranch: number;
  leafWHRatio: number;
}

const DEFAULT_SPS: SPSProfile = {
  trunkHeight: 2.0,
  trunkTaper: 0.6,
  trunkSlices: 10,
  boughs: 2,
  forks: 3,
  forkAngle: 1.0,
  forkRatio: 0.65,
  branches: 8,
  branchAngle: 1.2,
  bowFreq: 2,
  bowHeight: 2.0,
  leavesOnBranch: 5,
  leafWHRatio: 0.6,
};

const SPECIES_SPS: Record<string, Partial<SPSProfile>> = {
  "white-oak": {
    trunkHeight: 1.8,
    forks: 3,
    boughs: 2,
    branches: 8,
    leavesOnBranch: 5,
    forkAngle: 1.0,
    forkRatio: 0.7,
    bowHeight: 2,
  },
  "weeping-willow": {
    trunkHeight: 2.0,
    forks: 4,
    boughs: 2,
    branches: 15,
    leavesOnBranch: 10,
    forkAngle: 1.3,
    forkRatio: 0.65,
    bowHeight: 5.2,
  },
  "elder-pine": {
    trunkHeight: 2.6,
    forks: 2,
    boughs: 1,
    branches: 6,
    leavesOnBranch: 4,
    forkAngle: 0.4,
    forkRatio: 0.55,
    bowHeight: 1.5,
  },
  "cherry-blossom": {
    trunkHeight: 1.6,
    forks: 3,
    boughs: 2,
    branches: 10,
    leavesOnBranch: 9,
    forkAngle: 1.1,
    forkRatio: 0.65,
    bowHeight: 2.5,
  },
  "ghost-birch": {
    trunkHeight: 2.0,
    forks: 3,
    boughs: 2,
    branches: 6,
    leavesOnBranch: 4,
    forkAngle: 0.9,
    forkRatio: 0.6,
    bowHeight: 2,
  },
  redwood: {
    trunkHeight: 3.5,
    forks: 3,
    boughs: 2,
    branches: 10,
    leavesOnBranch: 5,
    forkAngle: 0.8,
    forkRatio: 0.6,
    bowHeight: 2,
  },
  "flame-maple": {
    trunkHeight: 2.0,
    forks: 4,
    boughs: 2,
    branches: 10,
    leavesOnBranch: 6,
    forkAngle: 1.0,
    forkRatio: 0.65,
    bowHeight: 2.5,
  },
  baobab: {
    trunkHeight: 2.5,
    forks: 4,
    boughs: 1,
    branches: 4,
    leavesOnBranch: 3,
    forkAngle: 1.6,
    forkRatio: 0.5,
    trunkTaper: 0.3,
    bowHeight: 1,
  },
  "silver-birch": {
    trunkHeight: 2.0,
    forks: 3,
    boughs: 2,
    branches: 6,
    leavesOnBranch: 4,
    forkAngle: 0.9,
    forkRatio: 0.6,
    bowHeight: 2,
  },
  ironbark: {
    trunkHeight: 2.4,
    forks: 2,
    boughs: 1,
    branches: 6,
    leavesOnBranch: 4,
    forkAngle: 0.5,
    forkRatio: 0.55,
    bowHeight: 1.5,
  },
  "golden-apple": {
    trunkHeight: 1.6,
    forks: 3,
    boughs: 2,
    branches: 10,
    leavesOnBranch: 6,
    forkAngle: 1.0,
    forkRatio: 0.65,
    bowHeight: 2.5,
  },
  "mystic-fern": {
    trunkHeight: 0.8,
    forks: 3,
    boughs: 2,
    branches: 8,
    leavesOnBranch: 8,
    forkAngle: 1.2,
    forkRatio: 0.6,
    bowHeight: 1.5,
  },
  "crystal-oak": {
    trunkHeight: 2.2,
    forks: 3,
    boughs: 2,
    branches: 8,
    leavesOnBranch: 6,
    forkAngle: 1.0,
    forkRatio: 0.7,
    bowHeight: 2,
  },
  "moonwood-ash": {
    trunkHeight: 2.4,
    forks: 3,
    boughs: 2,
    branches: 8,
    leavesOnBranch: 5,
    forkAngle: 1.0,
    forkRatio: 0.65,
    bowHeight: 2.5,
  },
  worldtree: {
    trunkHeight: 3.5,
    forks: 5,
    boughs: 2,
    branches: 15,
    leavesOnBranch: 8,
    forkAngle: 0.9,
    forkRatio: 0.6,
    bowHeight: 2,
  },
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Create a merged Three.js BufferGeometry for a procedural tree.
 *
 * Returns a single geometry with vertex colors baked in (trunk color for
 * wood parts, canopy color for leaves). Use with a `vertexColors: true`
 * material in R3F.
 *
 * @param speciesId - Species identifier from species.json
 * @param stage     - Growth stage (0-4), controls overall scale
 * @param seed      - Integer seed for deterministic RNG
 * @returns Merged BufferGeometry with vertex colors
 */
export function createTreeGeometry(
  speciesId: string,
  stage: number,
  seed: number,
): THREE.BufferGeometry {
  const species = getSpeciesData(speciesId);
  if (!species) {
    // Fallback: small box for unknown species
    const box = new THREE.BoxGeometry(0.1, 0.1, 0.1);
    return box;
  }

  const rng = createRNG(seed);
  const params: SPSProfile = {
    ...DEFAULT_SPS,
    ...(SPECIES_SPS[speciesId] ?? {}),
  };

  const trunkColor = new THREE.Color(species.meshParams.color.trunk);
  const canopyColor = new THREE.Color(species.meshParams.color.canopy);

  // Build the base tree structure (trunk + branches)
  const base = createTreeBase(
    params.trunkHeight,
    params.trunkTaper,
    params.trunkSlices,
    params.boughs,
    params.forks,
    params.forkAngle,
    params.forkRatio,
    params.bowFreq,
    params.bowHeight,
    rng,
  );

  // Bake vertex colors onto the trunk geometry
  const trunkVertexCount = base.geometry.getAttribute("position").count;
  const trunkColors = new Float32Array(trunkVertexCount * 3);
  for (let i = 0; i < trunkVertexCount; i++) {
    trunkColors[i * 3] = trunkColor.r;
    trunkColors[i * 3 + 1] = trunkColor.g;
    trunkColors[i * 3 + 2] = trunkColor.b;
  }
  base.geometry.setAttribute("color", new THREE.Float32BufferAttribute(trunkColors, 3));

  // Build leaf geometries
  const leaves = createLeafGeometries(
    base,
    params.forks,
    params.boughs,
    params.trunkHeight,
    params.trunkTaper,
    params.trunkSlices,
    params.forkRatio,
    params.leavesOnBranch,
    params.leafWHRatio,
    canopyColor,
    rng,
  );

  // Build crown (mini-tree copies at branch tips + random branch points)
  const crown = createCrownGeometries(
    base,
    params.forks,
    params.boughs,
    params.forkAngle,
    params.trunkTaper,
    params.branchAngle,
    params.branches,
    trunkColor,
    rng,
  );

  // Merge all parts
  const parts: THREE.BufferGeometry[] = [base.geometry];
  if (leaves) parts.push(leaves);
  if (crown) parts.push(crown);

  let finalGeometry: THREE.BufferGeometry;
  if (parts.length === 1) {
    finalGeometry = parts[0];
  } else {
    finalGeometry = mergeGeometries(parts) ?? parts[0];
    // Dispose intermediate geometries
    for (const p of parts) p.dispose();
  }

  // Apply growth stage scale
  const stageScale = growthConfig.stageVisuals[stage]?.scale ?? 1.0;
  finalGeometry.scale(stageScale, stageScale, stageScale);

  finalGeometry.computeBoundingSphere();
  finalGeometry.computeBoundingBox();

  return finalGeometry;
}
