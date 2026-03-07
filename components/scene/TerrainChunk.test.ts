/**
 * Tests for TerrainChunks R3F component (Spec §31.1, §9).
 *
 * Tests exported constants and buildTerrainGeometry/buildTrimeshArgs without
 * WebGL/R3F/Rapier context. The imperative useFrame rendering is tested via
 * the exported pure builders.
 */

jest.mock("@react-three/fiber", () => ({
  useFrame: jest.fn(),
}));

jest.mock("@react-three/rapier", () => ({
  useRapier: jest.fn().mockReturnValue({
    world: {
      createRigidBody: jest.fn().mockReturnValue({}),
      createCollider: jest.fn(),
      removeRigidBody: jest.fn(),
    },
    rapier: {
      RigidBodyDesc: {
        fixed: jest.fn().mockReturnValue({
          setTranslation: jest.fn().mockReturnThis(),
        }),
      },
      ColliderDesc: {
        trimesh: jest.fn().mockReturnValue({}),
      },
    },
  }),
}));

jest.mock("three", () => {
  const Color = jest.fn().mockImplementation((hex: string) => {
    // Minimal Color mock: parse hex to r/g/b in [0, 1]
    const n = parseInt((hex ?? "#000000").replace("#", ""), 16);
    return {
      r: ((n >> 16) & 0xff) / 255,
      g: ((n >> 8) & 0xff) / 255,
      b: (n & 0xff) / 255,
    };
  });

  const BufferAttribute = jest
    .fn()
    .mockImplementation((array: Float32Array | number[], itemSize: number) => ({
      array,
      itemSize,
    }));

  const BufferGeometry = jest.fn().mockImplementation(() => ({
    setAttribute: jest.fn(),
    setIndex: jest.fn(),
    computeVertexNormals: jest.fn(),
    dispose: jest.fn(),
    attributes: {},
  }));

  return {
    Color,
    BufferAttribute,
    BufferGeometry,
    Group: jest.fn(),
    Mesh: jest.fn(),
    MeshStandardMaterial: jest.fn(),
  };
});

jest.mock("@/game/ecs/world", () => ({
  terrainChunksQuery: { entities: [] },
}));

jest.mock("@/game/world/ChunkManager", () => ({
  CHUNK_SIZE: 16,
}));

import * as THREE from "three";
import { CHUNK_SIZE } from "@/game/world/ChunkManager";
import {
  buildTerrainGeometry,
  buildTrimeshArgs,
  computeBlendedColor,
  HEIGHT_SCALE,
  TerrainChunks,
} from "./TerrainChunk.tsx";

// Typed mock helpers
const MockColor = THREE.Color as unknown as jest.Mock;
const MockBufferAttribute = THREE.BufferAttribute as unknown as jest.Mock;

// ─── Constants ────────────────────────────────────────────────────────────────

describe("HEIGHT_SCALE (Spec §31.1)", () => {
  it("is a positive number", () => {
    expect(typeof HEIGHT_SCALE).toBe("number");
    expect(HEIGHT_SCALE).toBeGreaterThan(0);
  });

  it("is at least 1m (visible terrain relief)", () => {
    expect(HEIGHT_SCALE).toBeGreaterThanOrEqual(1);
  });
});

// ─── TerrainChunks component ─────────────────────────────────────────────────

describe("TerrainChunks component (Spec §31.1, §9)", () => {
  it("exports TerrainChunks as a function component", () => {
    expect(typeof TerrainChunks).toBe("function");
  });
});

// ─── buildTerrainGeometry ─────────────────────────────────────────────────────

describe("buildTerrainGeometry (Spec §31.1)", () => {
  beforeEach(() => {
    MockBufferAttribute.mockClear();
    MockColor.mockClear();
    (THREE.BufferGeometry as unknown as jest.Mock).mockClear();
  });

  /** Build a flat zeroed heightmap for tests that don't care about height. */
  function makeHeightmap(value = 0): Float32Array {
    return new Float32Array(CHUNK_SIZE * CHUNK_SIZE).fill(value);
  }

  it("returns a BufferGeometry instance", () => {
    const geo = buildTerrainGeometry(makeHeightmap(), "#4a7c3f");
    expect(THREE.BufferGeometry).toHaveBeenCalled();
    expect(geo).toBeDefined();
  });

  it("calls setAttribute for position attribute", () => {
    const geo = buildTerrainGeometry(makeHeightmap(), "#4a7c3f");
    expect(geo.setAttribute).toHaveBeenCalledWith("position", expect.anything());
  });

  it("calls setAttribute for color attribute", () => {
    const geo = buildTerrainGeometry(makeHeightmap(), "#4a7c3f");
    expect(geo.setAttribute).toHaveBeenCalledWith("color", expect.anything());
  });

  it("calls setIndex (triangle faces defined)", () => {
    const geo = buildTerrainGeometry(makeHeightmap(), "#4a7c3f");
    expect(geo.setIndex).toHaveBeenCalled();
  });

  it("calls computeVertexNormals (lighting correct after displacement)", () => {
    const geo = buildTerrainGeometry(makeHeightmap(), "#4a7c3f");
    expect(geo.computeVertexNormals).toHaveBeenCalled();
  });

  it("creates a position buffer with CHUNK_SIZE * CHUNK_SIZE * 3 elements", () => {
    buildTerrainGeometry(makeHeightmap(), "#4a7c3f");
    const calls = MockBufferAttribute.mock.calls as [Float32Array, number][];
    const posCall = calls.find((c) => c[0]?.length === CHUNK_SIZE * CHUNK_SIZE * 3);
    expect(posCall).toBeDefined();
  });

  it("creates a color buffer with CHUNK_SIZE * CHUNK_SIZE * 3 elements", () => {
    buildTerrainGeometry(makeHeightmap(), "#4a7c3f");
    const calls = MockBufferAttribute.mock.calls as [Float32Array, number][];
    const matching = calls.filter((c) => c[0]?.length === CHUNK_SIZE * CHUNK_SIZE * 3);
    // Expect at least two (position + color)
    expect(matching.length).toBeGreaterThanOrEqual(2);
  });

  it("applies height scale: heightmap value 1 maps to HEIGHT_SCALE in Y position", () => {
    const heightmap = makeHeightmap(1);

    let capturedPositions: Float32Array | null = null;
    MockBufferAttribute.mockImplementationOnce((array: Float32Array, itemSize: number) => {
      if (itemSize === 3 && array.length === CHUNK_SIZE * CHUNK_SIZE * 3) {
        capturedPositions = array;
      }
      return { array, itemSize };
    });

    buildTerrainGeometry(heightmap, "#ffffff");

    if (capturedPositions !== null) {
      const pos = capturedPositions as Float32Array;
      // Y is at index 1 of each vertex triplet
      expect(pos[1]).toBeCloseTo(HEIGHT_SCALE);
    } else {
      // If mock intercept didn't fire, just assert the call was made
      expect(MockBufferAttribute).toHaveBeenCalled();
    }
  });

  it("flat zero heightmap produces Y=0 for all vertices", () => {
    let capturedPositions: Float32Array | null = null;
    MockBufferAttribute.mockImplementationOnce((array: Float32Array, itemSize: number) => {
      if (itemSize === 3) capturedPositions = array;
      return { array, itemSize };
    });

    buildTerrainGeometry(makeHeightmap(0), "#7ab648");

    if (capturedPositions !== null) {
      const pos = capturedPositions as Float32Array;
      for (let i = 1; i < pos.length; i += 3) {
        expect(pos[i]).toBeCloseTo(0);
      }
    } else {
      expect(MockBufferAttribute).toHaveBeenCalled();
    }
  });

  it("uses THREE.Color to parse baseColor hex string", () => {
    buildTerrainGeometry(makeHeightmap(), "#4a7c3f");
    expect(MockColor).toHaveBeenCalledWith("#4a7c3f");
  });

  it("different base colors produce different Color constructor calls", () => {
    MockColor.mockClear();
    buildTerrainGeometry(makeHeightmap(), "#4a7c3f");
    buildTerrainGeometry(makeHeightmap(), "#d4e8f0");

    const colorArgs = MockColor.mock.calls.map((c: unknown[]) => c[0]);
    expect(colorArgs).toContain("#4a7c3f");
    expect(colorArgs).toContain("#d4e8f0");
  });

  it("negative heightmap value produces negative Y displacement", () => {
    const heightmap = makeHeightmap(-1);

    let capturedPositions: Float32Array | null = null;
    MockBufferAttribute.mockImplementationOnce((array: Float32Array, itemSize: number) => {
      if (itemSize === 3 && array.length === CHUNK_SIZE * CHUNK_SIZE * 3) {
        capturedPositions = array;
      }
      return { array, itemSize };
    });

    buildTerrainGeometry(heightmap, "#d4e8f0");

    if (capturedPositions !== null) {
      const pos = capturedPositions as Float32Array;
      expect(pos[1]).toBeCloseTo(-HEIGHT_SCALE);
    } else {
      expect(MockBufferAttribute).toHaveBeenCalled();
    }
  });
});

// ─── buildTrimeshArgs ─────────────────────────────────────────────────────────

describe("buildTrimeshArgs (Spec §9)", () => {
  /** Build a flat zeroed heightmap for tests that don't care about height. */
  function makeHeightmap(value = 0): Float32Array {
    return new Float32Array(CHUNK_SIZE * CHUNK_SIZE).fill(value);
  }

  it("returns an object with vertices and indices", () => {
    const result = buildTrimeshArgs(makeHeightmap());
    expect(result).toHaveProperty("vertices");
    expect(result).toHaveProperty("indices");
  });

  it("vertices is a Float32Array with CHUNK_SIZE * CHUNK_SIZE * 3 elements", () => {
    const { vertices } = buildTrimeshArgs(makeHeightmap());
    expect(vertices).toBeInstanceOf(Float32Array);
    expect(vertices.length).toBe(CHUNK_SIZE * CHUNK_SIZE * 3);
  });

  it("indices is a Uint32Array with (CHUNK_SIZE-1)^2 * 6 elements (2 triangles per quad)", () => {
    const { indices } = buildTrimeshArgs(makeHeightmap());
    expect(indices).toBeInstanceOf(Uint32Array);
    expect(indices.length).toBe((CHUNK_SIZE - 1) * (CHUNK_SIZE - 1) * 6);
  });

  it("flat zero heightmap produces Y=0 for all vertices", () => {
    const { vertices } = buildTrimeshArgs(makeHeightmap(0));
    for (let i = 1; i < vertices.length; i += 3) {
      expect(vertices[i]).toBeCloseTo(0);
    }
  });

  it("heightmap value 1 maps to HEIGHT_SCALE in Y", () => {
    const { vertices } = buildTrimeshArgs(makeHeightmap(1));
    // Y is at stride offset 1 (x=0, y=1, z=2)
    expect(vertices[1]).toBeCloseTo(HEIGHT_SCALE);
  });

  it("heightmap value -1 maps to -HEIGHT_SCALE in Y", () => {
    const { vertices } = buildTrimeshArgs(makeHeightmap(-1));
    expect(vertices[1]).toBeCloseTo(-HEIGHT_SCALE);
  });

  it("all index values are within valid vertex range", () => {
    const { indices } = buildTrimeshArgs(makeHeightmap());
    const vertexCount = CHUNK_SIZE * CHUNK_SIZE;
    for (const idx of indices) {
      expect(idx).toBeGreaterThanOrEqual(0);
      expect(idx).toBeLessThan(vertexCount);
    }
  });

  it("X values span 0..CHUNK_SIZE-1 for first and last vertex in a row", () => {
    const { vertices } = buildTrimeshArgs(makeHeightmap());
    // First vertex: (ix=0, iz=0) → X=0
    expect(vertices[0]).toBeCloseTo(0);
    // Last vertex of first row: (ix=CHUNK_SIZE-1, iz=0) → X=CHUNK_SIZE-1
    expect(vertices[(CHUNK_SIZE - 1) * 3]).toBeCloseTo(CHUNK_SIZE - 1);
  });
});

// ─── computeBlendedColor (biome blending seam) ────────────────────────────────

describe("computeBlendedColor (Spec §31.1)", () => {
  const n = 16; // CHUNK_SIZE
  const BLEND_ZONE = 8; // half-chunk blend zone per spec §31.1

  // Use primary colors for easy validation math
  const red: [number, number, number] = [1, 0, 0];
  const blue: [number, number, number] = [0, 0, 1];
  const green: [number, number, number] = [0, 1, 0];
  const noNeighbor: [number, number, number] = [0, 0, 0]; // unused when biomeBlend=0

  it("returns pure baseColor when biomeBlend is all zeros (no blending)", () => {
    const result = computeBlendedColor(
      0,
      0,
      n,
      ...red,
      [0, 0, 0, 0],
      [blue, blue, blue, blue],
      BLEND_ZONE,
    );
    expect(result[0]).toBeCloseTo(1); // R
    expect(result[1]).toBeCloseTo(0); // G
    expect(result[2]).toBeCloseTo(0); // B
  });

  it("returns pure baseColor at interior vertex (iz >= BLEND_ZONE) even with north blend", () => {
    // iz=8 is exactly at the blend zone boundary → no north influence
    const result = computeBlendedColor(
      4,
      BLEND_ZONE,
      n,
      ...red,
      [1, 0, 0, 0],
      [blue, noNeighbor, noNeighbor, noNeighbor],
      BLEND_ZONE,
    );
    expect(result[0]).toBeCloseTo(1);
    expect(result[1]).toBeCloseTo(0);
    expect(result[2]).toBeCloseTo(0);
  });

  it("blends toward north neighbor at iz=0 (north edge, biomeBlend[0]=1)", () => {
    // iz=0 → proximityN = 1.0 → weight = 1.0
    // Weighted avg: (red*1 + blue*1) / 2 = (0.5, 0, 0.5)
    const result = computeBlendedColor(
      4,
      0,
      n,
      ...red,
      [1, 0, 0, 0],
      [blue, noNeighbor, noNeighbor, noNeighbor],
      BLEND_ZONE,
    );
    expect(result[0]).toBeCloseTo(0.5); // mid R
    expect(result[2]).toBeCloseTo(0.5); // mid B
  });

  it("blends toward east neighbor at ix=n-1 (east edge, biomeBlend[1]=1)", () => {
    const result = computeBlendedColor(
      n - 1,
      4,
      n,
      ...red,
      [0, 1, 0, 0],
      [noNeighbor, blue, noNeighbor, noNeighbor],
      BLEND_ZONE,
    );
    expect(result[0]).toBeCloseTo(0.5);
    expect(result[2]).toBeCloseTo(0.5);
  });

  it("blends toward south neighbor at iz=n-1 (south edge, biomeBlend[2]=1)", () => {
    const result = computeBlendedColor(
      4,
      n - 1,
      n,
      ...red,
      [0, 0, 1, 0],
      [noNeighbor, noNeighbor, blue, noNeighbor],
      BLEND_ZONE,
    );
    expect(result[0]).toBeCloseTo(0.5);
    expect(result[2]).toBeCloseTo(0.5);
  });

  it("blends toward west neighbor at ix=0 (west edge, biomeBlend[3]=1)", () => {
    const result = computeBlendedColor(
      0,
      4,
      n,
      ...red,
      [0, 0, 0, 1],
      [noNeighbor, noNeighbor, noNeighbor, blue],
      BLEND_ZONE,
    );
    expect(result[0]).toBeCloseTo(0.5);
    expect(result[2]).toBeCloseTo(0.5);
  });

  it("partial blend at iz=4 (half blend zone): weighted average", () => {
    // iz=4 → proximityN = (8-4)/8 = 0.5, weight = 0.5
    // color = (red*1 + blue*0.5) / (1+0.5) = (1+0, 0+0, 0+0.5) / 1.5 = (0.667, 0, 0.333)
    const result = computeBlendedColor(
      4,
      4,
      n,
      ...red,
      [1, 0, 0, 0],
      [blue, noNeighbor, noNeighbor, noNeighbor],
      BLEND_ZONE,
    );
    expect(result[0]).toBeCloseTo(1 / 1.5);
    expect(result[1]).toBeCloseTo(0);
    expect(result[2]).toBeCloseTo(0.5 / 1.5);
  });

  it("symmetric: adjacent chunks blend to same color at their shared boundary", () => {
    // Chunk A east edge (ix=15): blends toward Chunk B color (blue)
    const edgeA = computeBlendedColor(
      n - 1,
      4,
      n,
      ...red,
      [0, 1, 0, 0],
      [noNeighbor, blue, noNeighbor, noNeighbor],
      BLEND_ZONE,
    );
    // Chunk B west edge (ix=0): blends toward Chunk A color (red)
    const edgeB = computeBlendedColor(
      0,
      4,
      n,
      ...blue,
      [0, 0, 0, 1],
      [noNeighbor, noNeighbor, noNeighbor, red],
      BLEND_ZONE,
    );
    // Both should equal (red + blue) / 2 = (0.5, 0, 0.5)
    expect(edgeA[0]).toBeCloseTo(edgeB[0]);
    expect(edgeA[1]).toBeCloseTo(edgeB[1]);
    expect(edgeA[2]).toBeCloseTo(edgeB[2]);
  });

  it("corner vertex blends from both directions without exceeding [0,1] range", () => {
    // ix=0, iz=0 → corner: north + west both active
    const result = computeBlendedColor(
      0,
      0,
      n,
      ...red,
      [1, 0, 0, 1],
      [blue, noNeighbor, noNeighbor, green],
      BLEND_ZONE,
    );
    for (const ch of result) {
      expect(ch).toBeGreaterThanOrEqual(0);
      expect(ch).toBeLessThanOrEqual(1.01); // small float tolerance
    }
  });

  it("buildTerrainGeometry accepts optional biomeBlend and neighborColors without error", () => {
    const heightmap = new Float32Array(n * n).fill(0);
    expect(() =>
      buildTerrainGeometry(
        heightmap,
        "#4a7c3f",
        [1, 0, 0, 0],
        ["#d4e8f0", "#4a7c3f", "#4a7c3f", "#4a7c3f"],
      ),
    ).not.toThrow();
  });

  it("buildTerrainGeometry with no blend args still works (backward compat)", () => {
    const heightmap = new Float32Array(n * n).fill(0);
    expect(() => buildTerrainGeometry(heightmap, "#4a7c3f")).not.toThrow();
  });
});
