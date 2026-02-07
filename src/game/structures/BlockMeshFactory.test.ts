import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";

vi.unmock("@babylonjs/core/Engines/engine");
vi.unmock("@babylonjs/core/scene");

import { NullEngine } from "@babylonjs/core/Engines/nullEngine";
import { Scene } from "@babylonjs/core/scene";
import {
  createBlockMesh,
  createStructureMesh,
  disposeStructureMesh,
  disposeStructureMaterialCache,
} from "./BlockMeshFactory";
import type { StructureTemplate } from "./types";

describe("BlockMeshFactory", () => {
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
    disposeStructureMaterialCache();
    scene.dispose();
    engine.dispose();
  });

  // -----------------------------------------------------------------
  // createBlockMesh
  // -----------------------------------------------------------------
  describe("createBlockMesh", () => {
    it("creates a timber-wall mesh (box)", () => {
      const mesh = createBlockMesh(scene, "timber-wall", "test-wall");
      expect(mesh).not.toBeNull();
      expect(mesh!.name).toBe("test-wall");
    });

    it("creates a wooden-post mesh (cylinder)", () => {
      const mesh = createBlockMesh(scene, "wooden-post", "test-post");
      expect(mesh).not.toBeNull();
    });

    it("creates a glass-panel with transparent material", () => {
      const mesh = createBlockMesh(scene, "glass-panel", "test-glass");
      expect(mesh).not.toBeNull();
      expect(mesh!.material).not.toBeNull();
      expect(mesh!.material!.alpha).toBe(0.5);
    });

    it("returns null for unknown block ID", () => {
      const mesh = createBlockMesh(scene, "nonexistent-block", "test");
      expect(mesh).toBeNull();
    });

    it("caches materials across calls", () => {
      const mesh1 = createBlockMesh(scene, "timber-wall", "wall1");
      const mesh2 = createBlockMesh(scene, "timber-floor", "floor1");
      // Both use "wood" material — should share the same StandardMaterial
      expect(mesh1!.material).toBe(mesh2!.material);
    });

    it("creates distinct materials for different material keys", () => {
      const woodMesh = createBlockMesh(scene, "timber-wall", "wood1");
      const stoneMesh = createBlockMesh(scene, "stone-base", "stone1");
      expect(woodMesh!.material).not.toBe(stoneMesh!.material);
    });
  });

  // -----------------------------------------------------------------
  // createStructureMesh
  // -----------------------------------------------------------------
  describe("createStructureMesh", () => {
    const singleBlockTemplate: StructureTemplate = {
      id: "test-single",
      name: "Test Single",
      description: "A single block",
      icon: "T",
      blocks: [{ blockId: "timber-wall", localX: 0, localY: 0, localZ: 0, rotation: 0 }],
      footprint: { width: 1, depth: 1 },
      cost: { timber: 5 },
      requiredLevel: 1,
    };

    const multiBlockTemplate: StructureTemplate = {
      id: "test-multi",
      name: "Test Multi",
      description: "Multiple blocks",
      icon: "M",
      blocks: [
        { blockId: "timber-wall", localX: 0, localY: 0, localZ: 0, rotation: 0 },
        { blockId: "timber-wall", localX: 1, localY: 0, localZ: 0, rotation: 0 },
        { blockId: "thatch-roof", localX: 0, localY: 1, localZ: 0, rotation: 0 },
      ],
      footprint: { width: 2, depth: 1 },
      cost: { timber: 10, sap: 5 },
      requiredLevel: 2,
    };

    it("creates mesh for single-block template", () => {
      const mesh = createStructureMesh(scene, singleBlockTemplate, 5, 3);
      expect(mesh).not.toBeNull();
      expect(mesh!.position.x).toBeCloseTo(5);
      expect(mesh!.position.z).toBeCloseTo(3);
    });

    it("creates merged mesh for multi-block template", () => {
      const mesh = createStructureMesh(scene, multiBlockTemplate, 2, 4);
      expect(mesh).not.toBeNull();
      expect(mesh!.name).toBe("structure_test-multi");
    });

    it("returns null for empty blocks", () => {
      const emptyTemplate: StructureTemplate = {
        ...singleBlockTemplate,
        id: "test-empty",
        blocks: [],
      };
      const mesh = createStructureMesh(scene, emptyTemplate, 0, 0);
      expect(mesh).toBeNull();
    });

    it("returns null for template with only unknown blocks", () => {
      const badTemplate: StructureTemplate = {
        ...singleBlockTemplate,
        id: "test-bad",
        blocks: [{ blockId: "nonexistent", localX: 0, localY: 0, localZ: 0, rotation: 0 }],
      };
      const mesh = createStructureMesh(scene, badTemplate, 0, 0);
      expect(mesh).toBeNull();
    });
  });

  // -----------------------------------------------------------------
  // Disposal
  // -----------------------------------------------------------------
  describe("disposal", () => {
    it("disposeStructureMesh disposes the mesh", () => {
      const mesh = createBlockMesh(scene, "timber-wall", "disposable")!;
      expect(mesh.isDisposed()).toBe(false);
      disposeStructureMesh(mesh);
      expect(mesh.isDisposed()).toBe(true);
    });

    it("disposeStructureMaterialCache clears cached materials", () => {
      createBlockMesh(scene, "timber-wall", "mat-test");
      disposeStructureMaterialCache();
      // After clearing, next call should create a fresh material
      const mesh = createBlockMesh(scene, "timber-wall", "mat-test2");
      expect(mesh).not.toBeNull();
    });
  });
});
