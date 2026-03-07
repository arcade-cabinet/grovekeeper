/**
 * Tests for useRaycast — center-screen raycast for entity targeting (Spec §11).
 *
 * resolveEntityById and findNearestStructure are pure functions tested directly.
 * useRaycast is smoke-tested only (requires R3F context for frame execution).
 */

jest.mock("@react-three/fiber", () => ({
  useFrame: jest.fn(),
  useThree: jest.fn().mockReturnValue({
    camera: {},
    scene: { children: [] },
  }),
}));

jest.mock("three", () => ({
  Raycaster: jest.fn().mockImplementation(() => ({
    setFromCamera: jest.fn(),
    intersectObjects: jest.fn().mockReturnValue([]),
    far: 0,
  })),
  Vector2: jest.fn().mockImplementation((x = 0, y = 0) => ({ x, y })),
}));

jest.mock("@/game/ecs/world", () => ({
  treesQuery: [],
  npcsQuery: [],
  structuresQuery: [],
}));

import {
  findNearestStructure,
  MAX_RAYCAST_DISTANCE,
  resolveEntityById,
  STRUCTURE_SNAP_RADIUS,
  useRaycast,
} from "./useRaycast";
import type { Entity } from "@/game/ecs/world";

/** Minimal entity with optional position. */
function makeEntity(id: string, position?: { x: number; y: number; z: number }): Entity {
  return { id, ...(position ? { position } : {}) } as unknown as Entity;
}

// ── resolveEntityById ─────────────────────────────────────────────────────────

describe("resolveEntityById (Spec §11)", () => {
  it("returns null when all iterables are empty", () => {
    expect(resolveEntityById("e1", [], [], [])).toBeNull();
  });

  it("returns null for an entityId that matches nothing", () => {
    const tree = makeEntity("tree-1");
    expect(resolveEntityById("unknown", [tree], [], [])).toBeNull();
  });

  it("resolves a tree entity and reports entityType 'tree'", () => {
    const tree = makeEntity("tree-1");
    const result = resolveEntityById("tree-1", [tree], [], []);
    expect(result).not.toBeNull();
    expect(result?.entity).toBe(tree);
    expect(result?.entityType).toBe("tree");
  });

  it("resolves an npc entity and reports entityType 'npc'", () => {
    const npc = makeEntity("npc-1");
    const result = resolveEntityById("npc-1", [], [npc], []);
    expect(result?.entity).toBe(npc);
    expect(result?.entityType).toBe("npc");
  });

  it("resolves a structure entity and reports entityType 'structure'", () => {
    const structure = makeEntity("str-1");
    const result = resolveEntityById("str-1", [], [], [structure]);
    expect(result?.entity).toBe(structure);
    expect(result?.entityType).toBe("structure");
  });

  it("searches trees before npcs before structures (priority order)", () => {
    // Same id present in all three — tree wins
    const tree = makeEntity("shared");
    const npc = makeEntity("shared");
    const structure = makeEntity("shared");
    const result = resolveEntityById("shared", [tree], [npc], [structure]);
    expect(result?.entityType).toBe("tree");
  });

  it("falls through to npc when id is absent from trees", () => {
    const npc = makeEntity("npc-only");
    const structure = makeEntity("npc-only");
    const result = resolveEntityById("npc-only", [], [npc], [structure]);
    expect(result?.entityType).toBe("npc");
  });
});

// ── findNearestStructure ──────────────────────────────────────────────────────

describe("findNearestStructure (Spec §11)", () => {
  it("returns null for an empty structures iterable", () => {
    expect(findNearestStructure({ x: 0, y: 0, z: 0 }, [], 5)).toBeNull();
  });

  it("returns null when no structure is within maxDist", () => {
    const s = makeEntity("s1", { x: 10, y: 0, z: 0 });
    expect(findNearestStructure({ x: 0, y: 0, z: 0 }, [s], 2)).toBeNull();
  });

  it("returns the structure when it is within maxDist", () => {
    const s = makeEntity("s1", { x: 1, y: 0, z: 0 });
    expect(findNearestStructure({ x: 0, y: 0, z: 0 }, [s], 2)).toBe(s);
  });

  it("returns the closest when multiple structures are within range", () => {
    const near = makeEntity("near", { x: 0.5, y: 0, z: 0 });
    const far = makeEntity("far", { x: 1.5, y: 0, z: 0 });
    // Pass far first so we verify it doesn't just return the first match
    const result = findNearestStructure({ x: 0, y: 0, z: 0 }, [far, near], 5);
    expect(result).toBe(near);
  });

  it("skips entities that have no position", () => {
    const noPos = makeEntity("no-pos");
    expect(findNearestStructure({ x: 0, y: 0, z: 0 }, [noPos], 5)).toBeNull();
  });

  it("considers Y distance when comparing (3D distance, not XZ only)", () => {
    // Structure is 5 units above the point — outside maxDist=3
    const above = makeEntity("above", { x: 0, y: 5, z: 0 });
    expect(findNearestStructure({ x: 0, y: 0, z: 0 }, [above], 3)).toBeNull();
  });

  it("returns structure exactly at maxDist boundary as null (strict less-than)", () => {
    // dist = maxDist exactly → should NOT be returned (closestDist starts at maxDist)
    const exact = makeEntity("exact", { x: 2, y: 0, z: 0 });
    expect(findNearestStructure({ x: 0, y: 0, z: 0 }, [exact], 2)).toBeNull();
  });
});

// ── useRaycast ────────────────────────────────────────────────────────────────

describe("useRaycast (Spec §11)", () => {
  it("exports useRaycast as a function", () => {
    expect(typeof useRaycast).toBe("function");
  });
});

// ── Constants ─────────────────────────────────────────────────────────────────

describe("MAX_RAYCAST_DISTANCE (Spec §11)", () => {
  it("is a positive number", () => {
    expect(MAX_RAYCAST_DISTANCE).toBeGreaterThan(0);
  });

  it("is 6.0 — the maximum tool reach per tool-action-system §8.2", () => {
    expect(MAX_RAYCAST_DISTANCE).toBe(6.0);
  });
});

describe("STRUCTURE_SNAP_RADIUS (Spec §11)", () => {
  it("is a positive number", () => {
    expect(STRUCTURE_SNAP_RADIUS).toBeGreaterThan(0);
  });

  it("is less than MAX_RAYCAST_DISTANCE (snap radius should not exceed tool reach)", () => {
    expect(STRUCTURE_SNAP_RADIUS).toBeLessThan(MAX_RAYCAST_DISTANCE);
  });
});
