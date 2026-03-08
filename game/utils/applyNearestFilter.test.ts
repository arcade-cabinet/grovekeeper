/**
 * applyNearestFilter tests (Spec §28.1).
 *
 * Uses a minimal Three.js mock to avoid WebGL context requirements.
 * The mock Mesh constructor accepts (material?) which differs from three.js's
 * real Mesh(geometry?, material?) — calls use `as unknown` casts per the
 * project's Three.js mock cast pattern.
 */

jest.mock("three", () => {
  const NearestFilter = 1003;
  const LinearFilter = 1006;

  class Texture {
    minFilter = LinearFilter;
    magFilter = LinearFilter;
    needsUpdate = false;
  }

  class Material {}

  class MeshStandardMaterial extends Material {
    map: Texture | null = null;
    normalMap: Texture | null = null;
    roughnessMap: Texture | null = null;
    emissiveMap: Texture | null = null;
  }

  class Object3D {
    children: Object3D[] = [];
    traverse(fn: (obj: Object3D) => void) {
      fn(this);
      for (const child of this.children) {
        child.traverse(fn);
      }
    }
  }

  // Mock Mesh takes material as first arg (vs real three.js: geometry, material).
  // Tests cast with `as unknown` to satisfy TS type checker.
  class Mesh extends Object3D {
    material: Material | Material[] | null;
    constructor(material?: Material | Material[]) {
      super();
      this.material = material ?? new MeshStandardMaterial();
    }
  }

  return { NearestFilter, LinearFilter, Texture, Material, MeshStandardMaterial, Mesh, Object3D };
});

import { applyNearestFilter, countNearestFilterTextures } from "./applyNearestFilter";
import { Mesh, MeshStandardMaterial, NearestFilter, Object3D, Texture } from "three";

// Cast the mock Mesh to a constructor compatible with our test usage.
// The mock's first arg is material (not geometry like real three.js Mesh).
type MockMeshCtor = { new(material?: unknown): InstanceType<typeof Mesh> };
const MockMesh = Mesh as unknown as MockMeshCtor;

// ─── helpers ─────────────────────────────────────────────────────────────────

function makeTexturedMesh(): InstanceType<typeof Mesh> {
  const mat = new MeshStandardMaterial();
  const tex = new Texture();
  (mat as unknown as Record<string, unknown>).map = tex;
  return new MockMesh(mat);
}

// ─── applyNearestFilter ───────────────────────────────────────────────────────

describe("applyNearestFilter (Spec §28.1)", () => {
  it("applies NearestFilter to a single-material mesh texture", () => {
    const root = new Object3D();
    const mesh = makeTexturedMesh();
    root.children.push(mesh as unknown as InstanceType<typeof Object3D>);

    applyNearestFilter(root);

    const mat = (mesh as unknown as { material: unknown }).material as InstanceType<typeof MeshStandardMaterial>;
    const tex = (mat as unknown as Record<string, unknown>).map as InstanceType<typeof Texture>;
    expect(tex.magFilter).toBe(NearestFilter);
    expect(tex.minFilter).toBe(NearestFilter);
    expect(tex.needsUpdate).toBe(true);
  });

  it("handles array materials on a mesh", () => {
    const mat1 = new MeshStandardMaterial();
    const mat2 = new MeshStandardMaterial();
    const tex1 = new Texture();
    const tex2 = new Texture();
    (mat1 as unknown as Record<string, unknown>).map = tex1;
    (mat2 as unknown as Record<string, unknown>).map = tex2;

    const mesh = new MockMesh([mat1, mat2]);
    const root = new Object3D();
    root.children.push(mesh as unknown as InstanceType<typeof Object3D>);

    applyNearestFilter(root);

    expect(tex1.magFilter).toBe(NearestFilter);
    expect(tex2.magFilter).toBe(NearestFilter);
  });

  it("skips non-Mesh Object3D nodes", () => {
    const root = new Object3D();
    expect(() => applyNearestFilter(root)).not.toThrow();
  });

  it("skips null texture maps gracefully", () => {
    const mat = new MeshStandardMaterial(); // no textures assigned
    const mesh = new MockMesh(mat);
    const root = new Object3D();
    root.children.push(mesh as unknown as InstanceType<typeof Object3D>);
    expect(() => applyNearestFilter(root)).not.toThrow();
  });

  it("traverses nested children", () => {
    const root = new Object3D();
    const parent = new Object3D();
    const child = makeTexturedMesh();
    parent.children.push(child as unknown as InstanceType<typeof Object3D>);
    root.children.push(parent);

    applyNearestFilter(root);

    const mat = (child as unknown as { material: unknown }).material as InstanceType<typeof MeshStandardMaterial>;
    const tex = (mat as unknown as Record<string, unknown>).map as InstanceType<typeof Texture>;
    expect(tex.magFilter).toBe(NearestFilter);
  });
});

// ─── countNearestFilterTextures ──────────────────────────────────────────────

describe("countNearestFilterTextures (Spec §28.1)", () => {
  it("returns 0 when no textures are NearestFilter", () => {
    const root = new Object3D();
    root.children.push(makeTexturedMesh() as unknown as InstanceType<typeof Object3D>);
    expect(countNearestFilterTextures(root)).toBe(0);
  });

  it("returns correct count after applying NearestFilter", () => {
    const root = new Object3D();
    root.children.push(makeTexturedMesh() as unknown as InstanceType<typeof Object3D>);
    root.children.push(makeTexturedMesh() as unknown as InstanceType<typeof Object3D>);

    applyNearestFilter(root);
    // Each mesh has 1 map → 2 textures total
    expect(countNearestFilterTextures(root)).toBe(2);
  });

  it("counts multiple texture maps on a single material", () => {
    const mat = new MeshStandardMaterial();
    const tex1 = new Texture();
    const tex2 = new Texture();
    (mat as unknown as Record<string, unknown>).map = tex1;
    (mat as unknown as Record<string, unknown>).normalMap = tex2;

    const mesh = new MockMesh(mat);
    const root = new Object3D();
    root.children.push(mesh as unknown as InstanceType<typeof Object3D>);

    applyNearestFilter(root);
    expect(countNearestFilterTextures(root)).toBe(2);
  });
});
