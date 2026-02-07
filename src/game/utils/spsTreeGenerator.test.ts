import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";

// Unmock BabylonJS so NullEngine + Scene work (global setup.ts mocks these)
vi.unmock("@babylonjs/core/Engines/engine");
vi.unmock("@babylonjs/core/scene");

import { NullEngine } from "@babylonjs/core/Engines/nullEngine";
import { Scene } from "@babylonjs/core/scene";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { createSPSTree, type SPSTreeParams } from "./spsTreeGenerator";
import { createRNG } from "./seedRNG";

describe("spsTreeGenerator", () => {
  let engine: NullEngine;
  let scene: Scene;

  beforeEach(() => {
    engine = new NullEngine({
      renderHeight: 256,
      renderWidth: 256,
      textureSize: 256,
      deterministicLockstep: false,
      lockstepMaxSteps: 4,
    });
    scene = new Scene(engine);
  });

  afterEach(() => {
    scene.dispose();
    engine.dispose();
  });

  function makeParams(overrides: Partial<SPSTreeParams> = {}): SPSTreeParams {
    return {
      trunkHeight: 5,
      trunkTaper: 0.6,
      trunkSlices: 5,
      trunkMaterial: new StandardMaterial("trunk", scene),
      boughs: 1,
      forks: 3,
      forkAngle: Math.PI / 4,
      forkRatio: 0.7,
      branches: 2,
      branchAngle: Math.PI / 3,
      bowFreq: 1,
      bowHeight: 0.5,
      leavesOnBranch: 3,
      leafWHRatio: 0.5,
      leafMaterial: new StandardMaterial("leaf", scene),
      ...overrides,
    };
  }

  it("returns a valid mesh", () => {
    const rng = createRNG(42);
    const tree = createSPSTree(makeParams(), scene, rng);

    expect(tree).toBeDefined();
    expect(tree.name).toBe("treeRoot");
  });

  it("root mesh is invisible (container only)", () => {
    const rng = createRNG(42);
    const tree = createSPSTree(makeParams(), scene, rng);

    expect(tree.isVisible).toBe(false);
  });

  it("has 3 child meshes (base, crown, leaves)", () => {
    const rng = createRNG(42);
    const tree = createSPSTree(makeParams(), scene, rng);

    // base tree + mini-tree crown + leaf crown
    expect(tree.getChildMeshes(true).length).toBe(3);
  });

  it("is deterministic with same seed", () => {
    const rng1 = createRNG(42);
    const tree1 = createSPSTree(makeParams(), scene, rng1);

    const rng2 = createRNG(42);
    const tree2 = createSPSTree(makeParams(), scene, rng2);

    // Same seed should produce same vertex count
    const children1 = tree1.getChildMeshes(true);
    const children2 = tree2.getChildMeshes(true);
    expect(children1.length).toBe(children2.length);

    for (let i = 0; i < children1.length; i++) {
      expect(children1[i].getTotalVertices()).toBe(children2[i].getTotalVertices());
    }
  });

  it("different seeds produce different meshes", () => {
    const tree1 = createSPSTree(makeParams(), scene, createRNG(1));
    const tree2 = createSPSTree(makeParams(), scene, createRNG(999));

    // With different seeds, vertex positions will differ
    // (vertex counts may be the same since structure is the same)
    const pos1 = tree1.getChildMeshes(true)[0].getVerticesData("position");
    const pos2 = tree2.getChildMeshes(true)[0].getVerticesData("position");

    expect(pos1).not.toBeNull();
    expect(pos2).not.toBeNull();

    // At least some vertices should differ
    let hasDifference = false;
    if (pos1 && pos2) {
      for (let i = 0; i < Math.min(pos1.length, pos2.length); i++) {
        if (Math.abs(pos1[i] - pos2[i]) > 0.001) {
          hasDifference = true;
          break;
        }
      }
    }
    expect(hasDifference).toBe(true);
  });

  it("boughs=2 produces more vertices than boughs=1", () => {
    const tree1 = createSPSTree(makeParams({ boughs: 1 }), scene, createRNG(42));
    const tree2 = createSPSTree(makeParams({ boughs: 2 }), scene, createRNG(42));

    const verts1 = tree1.getChildMeshes(true).reduce((sum, m) => sum + m.getTotalVertices(), 0);
    const verts2 = tree2.getChildMeshes(true).reduce((sum, m) => sum + m.getTotalVertices(), 0);

    expect(verts2).toBeGreaterThan(verts1);
  });

  it("more forks produce more vertices", () => {
    const tree2 = createSPSTree(makeParams({ forks: 2 }), scene, createRNG(42));
    const tree5 = createSPSTree(makeParams({ forks: 5 }), scene, createRNG(42));

    const verts2 = tree2.getChildMeshes(true).reduce((sum, m) => sum + m.getTotalVertices(), 0);
    const verts5 = tree5.getChildMeshes(true).reduce((sum, m) => sum + m.getTotalVertices(), 0);

    expect(verts5).toBeGreaterThan(verts2);
  });

  it("applies trunk material to base mesh", () => {
    const trunkMat = new StandardMaterial("myTrunk", scene);
    const rng = createRNG(42);
    const tree = createSPSTree(makeParams({ trunkMaterial: trunkMat }), scene, rng);

    const children = tree.getChildMeshes(true);
    // First child is the base tree mesh — should have trunk material
    expect(children[0].material).toBe(trunkMat);
  });

  it("applies leaf material to leaf crown", () => {
    const leafMat = new StandardMaterial("myLeaf", scene);
    const rng = createRNG(42);
    const tree = createSPSTree(makeParams({ leafMaterial: leafMat }), scene, rng);

    const children = tree.getChildMeshes(true);
    // Last child is the leaf crown — should have leaf material
    expect(children[children.length - 1].material).toBe(leafMat);
  });

  it("handles minimum parameters (1 fork, 1 bough, 0 branches)", () => {
    const rng = createRNG(42);
    const tree = createSPSTree(
      makeParams({ forks: 1, boughs: 1, branches: 0, leavesOnBranch: 1 }),
      scene,
      rng,
    );

    expect(tree).toBeDefined();
    expect(tree.getChildMeshes(true).length).toBe(3);
  });
});
