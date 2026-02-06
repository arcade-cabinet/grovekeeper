/**
 * SPS Tree Generator — TypeScript ES module port.
 *
 * Original: BabylonJS/Extensions/TreeGenerators/SPSTreeGenerator/TreeGenerator.js
 * https://github.com/BabylonJS/Extensions/blob/master/TreeGenerators/SPSTreeGenerator/TreeGenerator.js
 *
 * Changes from original:
 *   - Converted to TypeScript with explicit types
 *   - ES module imports (tree-shake friendly) instead of global BABYLON.*
 *   - Accepts seeded RNG function instead of Math.random() for determinism
 *   - Simplified API: single `createSPSTree()` entry point
 *
 * License: Apache-2.0 (same as BabylonJS)
 */

import { Vector3, Quaternion, TmpVectors } from "@babylonjs/core/Maths/math.vector";
import { Axis } from "@babylonjs/core/Maths/math.axis";
import { CreateRibbon } from "@babylonjs/core/Meshes/Builders/ribbonBuilder";
import { CreateDisc } from "@babylonjs/core/Meshes/Builders/discBuilder";
import { CreateBox } from "@babylonjs/core/Meshes/Builders/boxBuilder";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { SolidParticleSystem } from "@babylonjs/core/Particles/solidParticleSystem";
import type { Scene } from "@babylonjs/core/scene";
import type { Material } from "@babylonjs/core/Materials/material";

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

interface CoordSystem {
  x: Vector3;
  y: Vector3;
  z: Vector3;
}

/** Build an orthonormal coordinate system with vec3 as the Y axis. */
function coordSystem(vec3: Vector3): CoordSystem {
  const _y = vec3.normalize();
  let _x: Vector3;
  if (Math.abs(vec3.x) === 0 && Math.abs(vec3.z) === 0) {
    _x = new Vector3(vec3.y, -vec3.x, 0).normalize();
  } else {
    _x = new Vector3(vec3.y, -vec3.x, 0).normalize();
  }
  const _z = Vector3.Cross(_x, _y);
  return { x: _x, y: _y, z: _z };
}

/** Randomize a value v +/- p*100% using the provided RNG. */
function randPct(v: number, p: number, rng: () => number): number {
  if (p === 0) return v;
  return (1 + (1 - 2 * rng()) * p) * v;
}

// ---------------------------------------------------------------------------
// Branch creation
// ---------------------------------------------------------------------------

interface BranchResult {
  branch: Mesh;
  core: Vector3[];
  radii: number[];
}

function createBranch(
  branchAt: Vector3,
  branchSys: CoordSystem,
  branchLength: number,
  branchTaper: number,
  branchSlices: number,
  bowFreq: number,
  bowHeight: number,
  branchRadius: number,
  scene: Scene,
  rng: () => number,
): BranchResult {
  const crossSectionPaths: Vector3[][] = [];
  const corePath: Vector3[] = [];
  const radii: number[] = [];
  const aSides = 12;

  for (let a = 0; a < aSides; a++) {
    crossSectionPaths[a] = [];
  }

  for (let d = 0; d < branchSlices; d++) {
    const dSlicesLength = d / branchSlices;
    const corePoint = branchSys.y.scale(dSlicesLength * branchLength);
    // damped wave for natural bowing
    corePoint.addInPlace(
      branchSys.x.scale(
        bowHeight * Math.exp(-dSlicesLength) * Math.sin(bowFreq * dSlicesLength * Math.PI),
      ),
    );
    corePoint.addInPlace(branchAt);
    corePath[d] = corePoint;

    // randomize radius and taper
    const xsr = branchRadius * (1 + (0.4 * rng() - 0.2)) * (1 - (1 - branchTaper) * dSlicesLength);
    radii.push(xsr);

    for (let a = 0; a < aSides; a++) {
      const theta = (a * Math.PI) / 6;
      const path = branchSys.x
        .scale(xsr * Math.cos(theta))
        .add(branchSys.z.scale(xsr * Math.sin(theta)));
      path.addInPlace(corePath[d]);
      crossSectionPaths[a].push(path);
    }
  }

  // Cap at end
  for (let a = 0; a < aSides; a++) {
    crossSectionPaths[a].push(corePath[corePath.length - 1]);
  }

  const branch = CreateRibbon(
    "branch",
    { pathArray: crossSectionPaths, closeArray: true },
    scene,
  );

  return { branch, core: corePath, radii };
}

// ---------------------------------------------------------------------------
// Base tree (trunk + fork branches)
// ---------------------------------------------------------------------------

interface TreeBaseResult {
  tree: Mesh;
  paths: Vector3[][];
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
  scene: Scene,
  rng: () => number,
): TreeBaseResult {
  const PHI = 2 / (1 + Math.sqrt(5));
  const trunkDirection = new Vector3(0, 1, 0);
  const trunkSys = coordSystem(trunkDirection);
  const trunkRootAt = new Vector3(0, 0, 0);
  const treeBranches: Mesh[] = [];
  const treePaths: Vector3[][] = [];
  const treeRadii: number[][] = [];
  const treeDirections: CoordSystem[] = [];

  const trunk = createBranch(
    trunkRootAt, trunkSys, trunkHeight, trunkTaper, trunkSlices,
    1, bowHeight, 1, scene, rng,
  );
  treeBranches.push(trunk.branch);
  treePaths.push(trunk.core);
  treeRadii.push(trunk.radii);
  treeDirections.push(trunkSys);

  const topPoint = trunk.core[trunk.core.length - 1];
  const forkTurn = (2 * Math.PI) / forks;

  for (let f = 0; f < forks; f++) {
    const turn = randPct(f * forkTurn, 0.25, rng);
    const fa = randPct(forkAngle, 0.15, rng);
    const forkDir = trunkSys.y
      .scale(Math.cos(fa))
      .add(trunkSys.x.scale(Math.sin(fa) * Math.sin(turn)))
      .add(trunkSys.z.scale(Math.sin(fa) * Math.cos(turn)));
    const forkSys = coordSystem(forkDir);

    const branch = createBranch(
      topPoint, forkSys, trunkHeight * forkRatio, trunkTaper, trunkSlices,
      bowFreq, bowHeight * PHI, trunkTaper, scene, rng,
    );
    treeBranches.push(branch.branch);
    treePaths.push(branch.core);
    treeRadii.push(branch.radii);
    treeDirections.push(forkSys);

    if (boughs > 1) {
      const boughTop = branch.core[branch.core.length - 1];
      for (let k = 0; k < forks; k++) {
        const boughTurn = randPct(k * forkTurn, 0.25, rng);
        const ba = randPct(forkAngle, 0.15, rng);
        const boughDir = forkSys.y
          .scale(Math.cos(ba))
          .add(forkSys.x.scale(Math.sin(ba) * Math.sin(boughTurn)))
          .add(forkSys.z.scale(Math.sin(ba) * Math.cos(boughTurn)));
        const boughSys = coordSystem(boughDir);

        const bough = createBranch(
          boughTop, boughSys,
          trunkHeight * forkRatio * forkRatio, trunkTaper, trunkSlices,
          bowFreq, bowHeight * PHI * PHI, trunkTaper * trunkTaper, scene, rng,
        );
        treeBranches.push(bough.branch);
        treePaths.push(bough.core);
        treeRadii.push(branch.radii);
        treeDirections.push(boughSys);
      }
    }
  }

  const tree = Mesh.MergeMeshes(treeBranches, true) as Mesh;
  return { tree, paths: treePaths, radii: treeRadii, directions: treeDirections };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface SPSTreeParams {
  /** Trunk height in world units. */
  trunkHeight: number;
  /** 0 < taper < 1 — fraction of starting radius at branch tip. */
  trunkTaper: number;
  /** Cross-section slices along each branch (detail level). */
  trunkSlices: number;
  /** Material for trunk & branches. */
  trunkMaterial: Material;
  /** 1 or 2 — how many levels of forking. */
  boughs: 1 | 2;
  /** Branches per fork point (keep ≤5 for performance). */
  forks: number;
  /** Fork angle from parent direction (radians). */
  forkAngle: number;
  /** Ratio of child branch length to parent. */
  forkRatio: number;
  /** Number of mini-trees added randomly along branches. */
  branches: number;
  /** Angle of random mini-trees from parent branch. */
  branchAngle: number;
  /** Number of bows (bends) per branch. */
  bowFreq: number;
  /** Height of bow curve. */
  bowHeight: number;
  /** Leaves per side of a branch. */
  leavesOnBranch: number;
  /** 0 < ratio < 1 — closer to 0 = elongated leaf, closer to 1 = circular. */
  leafWHRatio: number;
  /** Material for leaf discs. */
  leafMaterial: Material;
}

/**
 * Create a full SPS-based tree mesh.
 *
 * Returns an invisible root box with three child meshes:
 *   - base trunk + branches (ribbon mesh)
 *   - branch crown (SPS of mini base-trees)
 *   - leaf crown (SPS of leaf discs)
 *
 * @param params — Tree generation parameters
 * @param scene  — Active BabylonJS Scene
 * @param rng    — Seeded random number generator (0..1)
 * @returns Root mesh (invisible box, children are the visible tree parts)
 */
export function createSPSTree(
  params: SPSTreeParams,
  scene: Scene,
  rng: () => number,
): Mesh {
  const {
    trunkHeight, trunkTaper, trunkSlices, trunkMaterial,
    boughs, forks, forkAngle, forkRatio,
    branches, branchAngle, bowFreq, bowHeight,
    leavesOnBranch, leafWHRatio, leafMaterial,
  } = params;

  const clampedBoughs = (boughs === 1 || boughs === 2) ? boughs : 1;

  // --- 1. Create base tree (trunk + forking branches) ---
  const base = createTreeBase(
    trunkHeight, trunkTaper, trunkSlices, clampedBoughs, forks,
    forkAngle, forkRatio, bowFreq, bowHeight, scene, rng,
  );
  base.tree.material = trunkMaterial;

  // --- 2. Create leaf disc ---
  const branchLength = trunkHeight * Math.pow(forkRatio, clampedBoughs);
  const leafGap = branchLength / (2 * leavesOnBranch);
  const leafWidth = 1.5 * Math.pow(trunkTaper, clampedBoughs - 1);

  const leaf = CreateDisc("leaf", {
    radius: leafWidth / 2,
    tessellation: 12,
    sideOrientation: Mesh.DOUBLESIDE,
  }, scene);

  // --- 3. Build leaves SPS on base tree branches ---
  const leavesSPS = new SolidParticleSystem("leaveSPS", scene, { updatable: false });

  const setLeaves = (particle: { position: Vector3; rotation: Vector3; scale: Vector3 }, _i: number, s: number) => {
    let a: number;
    if (clampedBoughs === 1) {
      a = Math.floor(s / (2 * leavesOnBranch)) + 1;
    } else {
      const idx = Math.floor(s / (2 * leavesOnBranch));
      a = 2 + (idx % forks) + Math.floor(idx / forks) * (forks + 1);
    }
    const j = s % (2 * leavesOnBranch);
    const g = (j * leafGap + 1.5 * leafGap) / branchLength;

    let upper = Math.ceil(trunkSlices * g);
    if (upper > base.paths[a].length - 1) upper = base.paths[a].length - 1;
    const lower = upper - 1;
    const gl = lower / (trunkSlices - 1);
    const gu = upper / (trunkSlices - 1);

    const px = base.paths[a][lower].x + (base.paths[a][upper].x - base.paths[a][lower].x) * (g - gl) / (gu - gl);
    const py = base.paths[a][lower].y + (base.paths[a][upper].y - base.paths[a][lower].y) * (g - gl) / (gu - gl);
    const pz = base.paths[a][lower].z + (base.paths[a][upper].z - base.paths[a][lower].z) * (g - gl) / (gu - gl);

    particle.position = new Vector3(
      px,
      py + (0.6 * leafWidth / leafWHRatio + base.radii[a][upper]) * (2 * (s % 2) - 1),
      pz,
    );
    particle.rotation.z = rng() * Math.PI / 4;
    particle.rotation.y = rng() * Math.PI / 2;
    particle.rotation.x = rng() * Math.PI / 4;
    particle.scale.y = 1 / leafWHRatio;
  };

  leavesSPS.addShape(leaf, 2 * leavesOnBranch * Math.pow(forks, clampedBoughs), {
    positionFunction: setLeaves,
  });
  const leavesMesh = leavesSPS.buildMesh();
  leaf.dispose();

  // --- 4. Build mini-tree + leaf SPS for full canopy ---
  const miniTreesSPS = new SolidParticleSystem("miniSPS", scene, { updatable: false });
  const miniLeavesSPS = new SolidParticleSystem("minileavesSPS", scene, { updatable: false });

  // Pre-computed random turns for fork-end mini-trees
  const turns: number[] = [];
  const forkTurn = (2 * Math.PI) / forks;
  for (let f = 0; f < Math.pow(forks, clampedBoughs + 1); f++) {
    turns.push(randPct(Math.floor(f / Math.pow(forks, clampedBoughs)) * forkTurn, 0.2, rng));
  }

  const setMiniTrees = (particle: { position: Vector3; quaternion: Quaternion; scale: Vector3 }, _i: number, s: number) => {
    let a: number;
    const idx = s % Math.pow(forks, clampedBoughs);
    if (clampedBoughs === 1) {
      a = idx + 1;
    } else {
      a = 2 + (idx % forks) + Math.floor(idx / forks) * (forks + 1);
    }
    const miniSys = base.directions[a];
    const miniTop = base.paths[a][base.paths[a].length - 1].clone();
    const turn = turns[s];

    const fa2 = randPct(forkAngle, 0, rng);
    const miniDir = miniSys.y
      .scale(Math.cos(fa2))
      .add(miniSys.x.scale(Math.sin(fa2) * Math.sin(turn)))
      .add(miniSys.z.scale(Math.sin(fa2) * Math.cos(turn)));
    const axis = Vector3.Cross(Axis.Y, miniDir);
    const theta = Math.acos(Vector3.Dot(miniDir, Axis.Y) / miniDir.length());
    const sc = Math.pow(trunkTaper, clampedBoughs + 1);

    particle.scale = new Vector3(sc, sc, sc);
    particle.quaternion = Quaternion.RotationAxis(axis, theta);
    particle.position = miniTop;
  };

  // Pre-computed random positions for branch mini-trees
  const bturns: number[] = [];
  const places: [number, number][] = [];
  const bplen = base.paths.length;
  const bp0len = base.paths[0].length;
  for (let b = 0; b < branches; b++) {
    bturns.push(2 * Math.PI * rng() - Math.PI);
    places.push([
      Math.floor(rng() * bplen),
      Math.floor(rng() * (bp0len - 1) + 1),
    ]);
  }

  const setBranches = (particle: { position: Vector3; quaternion: Quaternion; scale: Vector3 }, _i: number, s: number) => {
    const a = places[s][0];
    const b = places[s][1];
    const miniSys = base.directions[a];
    const miniPlace = base.paths[a][b].clone();
    miniPlace.addInPlace(miniSys.z.scale(base.radii[a][b] / 2));
    const turn = bturns[s];

    const ba2 = randPct(branchAngle, 0, rng);
    const miniDir = miniSys.y
      .scale(Math.cos(ba2))
      .add(miniSys.x.scale(Math.sin(ba2) * Math.sin(turn)))
      .add(miniSys.z.scale(Math.sin(ba2) * Math.cos(turn)));
    const axis = Vector3.Cross(Axis.Y, miniDir);
    const theta = Math.acos(Vector3.Dot(miniDir, Axis.Y) / miniDir.length());
    const sc = Math.pow(trunkTaper, clampedBoughs + 1);

    particle.scale = new Vector3(sc, sc, sc);
    particle.quaternion = Quaternion.RotationAxis(axis, theta);
    particle.position = miniPlace;
  };

  // Add fork-end mini-trees
  miniTreesSPS.addShape(base.tree, Math.pow(forks, clampedBoughs + 1), {
    positionFunction: setMiniTrees,
  });
  // Add random branch mini-trees
  miniTreesSPS.addShape(base.tree, branches, {
    positionFunction: setBranches,
  });
  const treeCrown = miniTreesSPS.buildMesh();
  treeCrown.material = trunkMaterial;

  // Add fork-end mini-leaves
  miniLeavesSPS.addShape(leavesMesh, Math.pow(forks, clampedBoughs + 1), {
    positionFunction: setMiniTrees,
  });
  // Add random branch mini-leaves
  miniLeavesSPS.addShape(leavesMesh, branches, {
    positionFunction: setBranches,
  });
  const leavesCrown = miniLeavesSPS.buildMesh();
  leavesMesh.dispose();
  leavesCrown.material = leafMaterial;

  // --- 5. Parent everything under invisible root ---
  const root = CreateBox("treeRoot", { size: 0.01 }, scene);
  root.isVisible = false;
  base.tree.parent = root;
  treeCrown.parent = root;
  leavesCrown.parent = root;

  return root;
}
