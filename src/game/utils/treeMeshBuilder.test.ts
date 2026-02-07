import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Mock BabylonJS modules used by spsTreeGenerator + treeMeshBuilder.
// We need lightweight stubs for all the mesh/material/texture types.
// ---------------------------------------------------------------------------

function makeFakeMesh(name: string) {
  return {
    name,
    position: { x: 0, y: 0, z: 0, addInPlace: vi.fn().mockReturnThis(), clone: vi.fn().mockReturnThis() },
    rotation: { x: 0, y: 0, z: 0 },
    scaling: { x: 1, y: 1, z: 1 },
    material: null as unknown,
    parent: null as unknown,
    isVisible: true,
    dispose: vi.fn(),
    getChildren: () => [],
  };
}

// Mock mesh builders
vi.mock("@babylonjs/core/Meshes/Builders/ribbonBuilder", () => ({
  CreateRibbon: vi.fn((name: string) => makeFakeMesh(name)),
}));

vi.mock("@babylonjs/core/Meshes/Builders/discBuilder", () => ({
  CreateDisc: vi.fn((name: string) => makeFakeMesh(name)),
}));

vi.mock("@babylonjs/core/Meshes/Builders/boxBuilder", () => ({
  CreateBox: vi.fn((name: string) => makeFakeMesh(name)),
}));

// Mock Vector3, Quaternion, Axis
// NOTE: vi.mock factories are hoisted, so we cannot reference outer `const` variables.
// All helpers must be inlined or use vi.hoisted().

vi.mock("@babylonjs/core/Maths/math.vector", () => {
  class FakeVec3 {
    x: number; y: number; z: number;
    constructor(x = 0, y = 0, z = 0) { this.x = x; this.y = y; this.z = z; }
    normalize() { return this; }
    scale(_s: number) { return new FakeVec3(); }
    add(_v: FakeVec3) { return new FakeVec3(); }
    addInPlace(_v: FakeVec3) { return this; }
    clone() { return new FakeVec3(this.x, this.y, this.z); }
    length() { return 1; }
    static Cross(_a: FakeVec3, _b: FakeVec3) { return new FakeVec3(); }
    static Dot(_a: FakeVec3, _b: FakeVec3) { return 0.5; }
  }
  return {
    Vector3: FakeVec3,
    Quaternion: {
      RotationAxis: vi.fn(() => ({ x: 0, y: 0, z: 0, w: 1 })),
    },
    TmpVectors: {},
  };
});

vi.mock("@babylonjs/core/Maths/math.axis", () => ({
  Axis: {
    Y: { x: 0, y: 1, z: 0, normalize: vi.fn().mockReturnThis(), scale: vi.fn().mockReturnValue({ x: 0, y: 0, z: 0, addInPlace: vi.fn().mockReturnThis(), add: vi.fn().mockReturnThis(), clone: vi.fn().mockReturnThis() }), add: vi.fn().mockReturnThis(), addInPlace: vi.fn().mockReturnThis(), clone: vi.fn().mockReturnValue({ x: 0, y: 1, z: 0, addInPlace: vi.fn().mockReturnThis() }), length: vi.fn().mockReturnValue(1) },
  },
}));

// Mock Mesh (for MergeMeshes, DOUBLESIDE)
vi.mock("@babylonjs/core/Meshes/mesh", () => {
  const mkMesh = (name: string) => ({
    name, position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 },
    scaling: { x: 1, y: 1, z: 1 }, material: null, parent: null,
    isVisible: true, dispose: vi.fn(), getChildren: () => [],
  });
  return {
    Mesh: {
      MergeMeshes: vi.fn(() => mkMesh("merged")),
      DOUBLESIDE: 2,
    },
  };
});

// Mock SolidParticleSystem
vi.mock("@babylonjs/core/Particles/solidParticleSystem", () => {
  const mkMesh = (name: string) => ({
    name, position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 },
    scaling: { x: 1, y: 1, z: 1 }, material: null, parent: null,
    isVisible: true, dispose: vi.fn(), getChildren: () => [],
  });
  class FakeSPS {
    addShape = vi.fn();
    buildMesh = vi.fn(() => mkMesh("sps"));
  }
  return { SolidParticleSystem: FakeSPS };
});

// Mock PBRMaterial
vi.mock("@babylonjs/core/Materials/PBR/pbrMaterial", () => {
  class FakePBR {
    static PBRMATERIAL_ALPHATEST = 1;
    name: string;
    albedoTexture = null;
    albedoColor = null;
    bumpTexture = null;
    metallicTexture = null;
    opacityTexture = null;
    metallic = 0;
    roughness = 1;
    useRoughnessFromMetallicTextureAlpha = false;
    useRoughnessFromMetallicTextureGreen = false;
    backFaceCulling = true;
    transparencyMode = 0;
    alphaCutOff = 0.5;
    dispose = vi.fn();
    constructor(name: string) { this.name = name; }
  }
  return { PBRMaterial: FakePBR };
});

// Mock Texture
vi.mock("@babylonjs/core/Materials/Textures/texture", () => {
  class FakeTexture {
    url: string;
    constructor(url: string) { this.url = url; }
  }
  return { Texture: FakeTexture };
});

// Mock Color3
vi.mock("@babylonjs/core/Maths/math.color", () => {
  class FakeColor3 {
    r: number; g: number; b: number;
    constructor(r: number, g: number, b: number) { this.r = r; this.g = g; this.b = b; }
  }
  return { Color3: FakeColor3 };
});

// ---------------------------------------------------------------------------
// Import modules under test (after mocks)
// ---------------------------------------------------------------------------

import { buildSpeciesTreeMesh, disposeTreeMaterialCache } from "./treeMeshBuilder";
import { TREE_SPECIES, PRESTIGE_TREE_SPECIES } from "../constants/trees";

const fakeScene = {} as Parameters<typeof buildSpeciesTreeMesh>[0];

describe("treeMeshBuilder (SPS + PBR)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    disposeTreeMaterialCache();
  });

  describe("buildSpeciesTreeMesh", () => {
    it.each([...TREE_SPECIES, ...PRESTIGE_TREE_SPECIES].map((s) => [s.id, s.name]))(
      "creates a mesh for %s (%s) without throwing",
      (speciesId) => {
        const mesh = buildSpeciesTreeMesh(
          fakeScene,
          `test-${speciesId}`,
          speciesId,
          "summer",
          42,
        );
        expect(mesh).toBeDefined();
        expect(mesh.name).toBe(`tree_test-${speciesId}`);
      },
    );

    it("falls back gracefully for an unknown species id", () => {
      const mesh = buildSpeciesTreeMesh(
        fakeScene,
        "test-unknown",
        "nonexistent-tree",
        "spring",
        99,
      );
      expect(mesh).toBeDefined();
      expect(mesh.name).toBe("tree_test-unknown");
    });

    it("works when meshSeed is undefined (falls back to hashString)", () => {
      const mesh = buildSpeciesTreeMesh(
        fakeScene,
        "entity-abc",
        "white-oak",
        "summer",
        undefined,
      );
      expect(mesh).toBeDefined();
    });

    it("works when season is undefined", () => {
      const mesh = buildSpeciesTreeMesh(
        fakeScene,
        "entity-xyz",
        "elder-pine",
        undefined,
        123,
      );
      expect(mesh).toBeDefined();
    });
  });

  describe("seasonal behavior", () => {
    it("non-evergreen trees produce mesh in autumn", () => {
      const mesh = buildSpeciesTreeMesh(fakeScene, "oak-autumn", "white-oak", "autumn", 50);
      expect(mesh).toBeDefined();
    });

    it("non-evergreen trees produce mesh in winter", () => {
      const mesh = buildSpeciesTreeMesh(fakeScene, "oak-winter", "white-oak", "winter", 60);
      expect(mesh).toBeDefined();
    });

    it("evergreen trees produce mesh in winter", () => {
      const mesh = buildSpeciesTreeMesh(fakeScene, "pine-winter", "elder-pine", "winter", 70);
      expect(mesh).toBeDefined();
    });

    it("cherry blossom produces mesh in all seasons", () => {
      for (const season of ["spring", "summer", "autumn", "winter"]) {
        const mesh = buildSpeciesTreeMesh(fakeScene, `cherry-${season}`, "cherry-blossom", season, 80);
        expect(mesh).toBeDefined();
      }
    });

    it("crystal oak produces mesh with seasonal prismatic tints", () => {
      const seasons = ["spring", "summer", "autumn", "winter"] as const;
      for (const season of seasons) {
        const mesh = buildSpeciesTreeMesh(fakeScene, `crystal-${season}`, "crystal-oak", season, 90);
        expect(mesh).toBeDefined();
        expect(mesh.name).toBe(`tree_crystal-${season}`);
      }
    });

    it("ghost birch produces mesh with night glow", () => {
      const nightMesh = buildSpeciesTreeMesh(fakeScene, "ghost-night", "ghost-birch", "winter", 100, true);
      expect(nightMesh).toBeDefined();
      const dayMesh = buildSpeciesTreeMesh(fakeScene, "ghost-day", "ghost-birch", "winter", 100, false);
      expect(dayMesh).toBeDefined();
    });
  });

  describe("disposeTreeMaterialCache", () => {
    it("disposes materials without throwing", () => {
      buildSpeciesTreeMesh(fakeScene, "test-cache", "white-oak", "summer", 1);
      expect(() => disposeTreeMaterialCache()).not.toThrow();
    });

    it("can be called multiple times safely", () => {
      disposeTreeMaterialCache();
      disposeTreeMaterialCache();
    });
  });
});
