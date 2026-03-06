import * as THREE from "three";

import { createTreeGeometry } from "./treeGeometry";

// Three.js BufferGeometry is available in the test environment via jest-expo
// since Three.js is pure JS math (no WebGL context needed for geometry creation).

describe("createTreeGeometry", () => {
  describe("determinism", () => {
    it("produces identical geometry for the same seed", () => {
      const geom1 = createTreeGeometry("white-oak", 3, 12345);
      const geom2 = createTreeGeometry("white-oak", 3, 12345);

      const pos1 = geom1.getAttribute("position");
      const pos2 = geom2.getAttribute("position");

      expect(pos1.count).toBe(pos2.count);
      expect(pos1.count).toBeGreaterThan(0);

      // Compare all vertex positions
      for (let i = 0; i < pos1.count * 3; i++) {
        expect((pos1.array as Float32Array)[i]).toBeCloseTo(
          (pos2.array as Float32Array)[i],
          10,
        );
      }

      geom1.dispose();
      geom2.dispose();
    });

    it("produces different geometry for different seeds", () => {
      const geom1 = createTreeGeometry("white-oak", 3, 12345);
      const geom2 = createTreeGeometry("white-oak", 3, 99999);

      const pos1 = geom1.getAttribute("position");
      const pos2 = geom2.getAttribute("position");

      // They should have the same structure (same species/stage) but different values
      // due to different RNG seeds affecting bowing, taper randomization, etc.
      let hasDifference = false;
      const minCount = Math.min(pos1.count, pos2.count);
      for (let i = 0; i < minCount * 3; i++) {
        if (
          Math.abs(
            (pos1.array as Float32Array)[i] - (pos2.array as Float32Array)[i],
          ) > 0.001
        ) {
          hasDifference = true;
          break;
        }
      }
      expect(hasDifference).toBe(true);

      geom1.dispose();
      geom2.dispose();
    });
  });

  describe("species differentiation", () => {
    it("produces different geometries for different species", () => {
      const oak = createTreeGeometry("white-oak", 3, 42);
      const willow = createTreeGeometry("weeping-willow", 3, 42);

      // Different species have different SPS parameters (forks, height, etc.)
      // so vertex counts and/or positions should differ
      const oakPos = oak.getAttribute("position");
      const willowPos = willow.getAttribute("position");

      // Vertex counts will differ because of different fork/bough/leaf counts
      const countsMatch = oakPos.count === willowPos.count;
      let positionsMatch = true;

      if (countsMatch) {
        for (let i = 0; i < oakPos.count * 3; i++) {
          if (
            Math.abs(
              (oakPos.array as Float32Array)[i] -
                (willowPos.array as Float32Array)[i],
            ) > 0.001
          ) {
            positionsMatch = false;
            break;
          }
        }
      }

      // At least one of these must be different
      expect(!countsMatch || !positionsMatch).toBe(true);

      oak.dispose();
      willow.dispose();
    });
  });

  describe("growth stages", () => {
    it("produces smaller geometry at stage 0 than stage 4", () => {
      const seed = createTreeGeometry("white-oak", 0, 42);
      const oldGrowth = createTreeGeometry("white-oak", 4, 42);

      seed.computeBoundingBox();
      oldGrowth.computeBoundingBox();

      const seedBox = seed.boundingBox!;
      const oldBox = oldGrowth.boundingBox!;

      const seedSize = new THREE.Vector3();
      seedBox.getSize(seedSize);

      const oldSize = new THREE.Vector3();
      oldBox.getSize(oldSize);

      // Stage 0 scale is 0.08, stage 4 scale is 1.2
      // So old growth should be significantly larger
      expect(oldSize.x).toBeGreaterThan(seedSize.x);
      expect(oldSize.y).toBeGreaterThan(seedSize.y);
      expect(oldSize.z).toBeGreaterThan(seedSize.z);

      seed.dispose();
      oldGrowth.dispose();
    });

    it("scale increases monotonically across stages", () => {
      const sizes: number[] = [];

      for (let stage = 0; stage <= 4; stage++) {
        const geom = createTreeGeometry("elder-pine", stage, 42);
        geom.computeBoundingBox();
        const size = new THREE.Vector3();
        geom.boundingBox!.getSize(size);
        sizes.push(size.y); // Y is height, should grow monotonically
        geom.dispose();
      }

      for (let i = 1; i < sizes.length; i++) {
        expect(sizes[i]).toBeGreaterThan(sizes[i - 1]);
      }
    });
  });

  describe("vertex colors", () => {
    it("has vertex color attribute", () => {
      const geom = createTreeGeometry("white-oak", 3, 42);
      const colors = geom.getAttribute("color");
      expect(colors).toBeDefined();
      expect(colors.count).toBeGreaterThan(0);
      expect(colors.itemSize).toBe(3);
      geom.dispose();
    });
  });

  describe("unknown species", () => {
    it("returns a fallback geometry for unknown species", () => {
      const geom = createTreeGeometry("nonexistent-tree", 3, 42);
      expect(geom).toBeInstanceOf(THREE.BufferGeometry);
      const pos = geom.getAttribute("position");
      expect(pos.count).toBeGreaterThan(0);
      geom.dispose();
    });
  });

  describe("all known species", () => {
    const knownSpecies = [
      "white-oak",
      "weeping-willow",
      "elder-pine",
      "cherry-blossom",
      "ghost-birch",
      "redwood",
      "flame-maple",
      "baobab",
      "crystal-oak",
      "moonwood-ash",
      "worldtree",
    ];

    it.each(knownSpecies)("generates valid geometry for %s", (speciesId) => {
      const geom = createTreeGeometry(speciesId, 3, 42);
      expect(geom).toBeInstanceOf(THREE.BufferGeometry);

      const pos = geom.getAttribute("position");
      expect(pos.count).toBeGreaterThan(10); // Non-trivial mesh

      const colors = geom.getAttribute("color");
      expect(colors).toBeDefined();

      geom.dispose();
    });
  });
});
