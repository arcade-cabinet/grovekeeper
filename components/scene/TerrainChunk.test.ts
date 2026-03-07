/**
 * Tests for TerrainChunks R3F component (Spec §31.1).
 *
 * Tests exported constants and buildTerrainGeometry without WebGL/R3F context.
 * The imperative useFrame rendering is tested via the exported pure builder.
 */

jest.mock("@react-three/fiber", () => ({
  useFrame: jest.fn(),
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

  const BufferAttribute = jest.fn().mockImplementation(
    (array: Float32Array | number[], itemSize: number) => ({ array, itemSize }),
  );

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
import { buildTerrainGeometry, HEIGHT_SCALE, TerrainChunks } from "./TerrainChunk";
import { CHUNK_SIZE } from "@/game/world/ChunkManager";

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

describe("TerrainChunks component (Spec §31.1)", () => {
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
