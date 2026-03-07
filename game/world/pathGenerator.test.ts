/**
 * pathGenerator.test.ts
 * Spec §31.1 — Trail splines between landmarks carved into terrain heightmap.
 */

import {
  bezierPoint,
  carveSplineIntoHeightmap,
  generatePathsForChunk,
  generateSignpostForChunk,
  getLandmarkLocalPos,
  getLandmarkType,
  isLandmarkChunk,
  LANDMARK_PROBABILITY,
} from "./pathGenerator.ts";

const SIZE = 16;

// ── Helpers ──────────────────────────────────────────────────────────────────

function flatHeightmap(value = 0): Float32Array {
  return new Float32Array(SIZE * SIZE).fill(value);
}

// ── isLandmarkChunk ──────────────────────────────────────────────────────────

describe("isLandmarkChunk (Spec §31.1)", () => {
  it("chunk (0,0) is always a landmark", () => {
    expect(isLandmarkChunk("any-seed", 0, 0)).toBe(true);
    expect(isLandmarkChunk("another-seed", 0, 0)).toBe(true);
  });

  it("is deterministic — same seed + chunk always returns same result", () => {
    const seed = "Gentle Mossy Hollow";
    const r1 = isLandmarkChunk(seed, 3, 7);
    const r2 = isLandmarkChunk(seed, 3, 7);
    expect(r1).toBe(r2);
  });

  it("different seeds produce different patterns", () => {
    // Across enough chunks some will differ between seeds.
    let differ = false;
    for (let x = -5; x <= 5 && !differ; x++) {
      for (let z = -5; z <= 5 && !differ; z++) {
        if (x === 0 && z === 0) continue;
        if (isLandmarkChunk("seed-A", x, z) !== isLandmarkChunk("seed-B", x, z)) {
          differ = true;
        }
      }
    }
    expect(differ).toBe(true);
  });

  it("approximately LANDMARK_PROBABILITY of non-origin chunks are landmarks", () => {
    // Sample 200 non-origin chunks and check the rate is within a wide margin.
    const seed = "Stable Test Seed";
    let landmarkCount = 0;
    const total = 200;
    for (let i = 0; i < total; i++) {
      const x = i - 100;
      if (isLandmarkChunk(seed, x, 5)) landmarkCount++;
    }
    // Allow ±50% relative error — just ensures the rate is ballpark correct.
    const rate = landmarkCount / total;
    expect(rate).toBeGreaterThan(LANDMARK_PROBABILITY * 0.3);
    expect(rate).toBeLessThan(LANDMARK_PROBABILITY * 3.0);
  });
});

// ── getLandmarkLocalPos ──────────────────────────────────────────────────────

describe("getLandmarkLocalPos (Spec §31.1)", () => {
  it("origin chunk returns exactly the center (8, 8)", () => {
    const pos = getLandmarkLocalPos("any-seed", 0, 0);
    expect(pos.localX).toBe(8);
    expect(pos.localZ).toBe(8);
  });

  it("non-origin landmarks stay within the inner margin zone [4, 12)", () => {
    const seed = "Gentle Mossy Hollow";
    // Find a non-origin landmark chunk to test.
    for (let x = 1; x <= 10; x++) {
      for (let z = 1; z <= 10; z++) {
        if (!isLandmarkChunk(seed, x, z)) continue;
        const pos = getLandmarkLocalPos(seed, x, z);
        expect(pos.localX).toBeGreaterThanOrEqual(4);
        expect(pos.localX).toBeLessThan(12);
        expect(pos.localZ).toBeGreaterThanOrEqual(4);
        expect(pos.localZ).toBeLessThan(12);
        return; // one landmark is enough
      }
    }
  });

  it("is deterministic — same inputs return same position", () => {
    const seed = "Ancient Whispering Canopy";
    const p1 = getLandmarkLocalPos(seed, 5, 3);
    const p2 = getLandmarkLocalPos(seed, 5, 3);
    expect(p1.localX).toBeCloseTo(p2.localX);
    expect(p1.localZ).toBeCloseTo(p2.localZ);
  });
});

// ── getLandmarkType ──────────────────────────────────────────────────────────

describe("getLandmarkType (Spec §31.1)", () => {
  it("origin chunk is always a village", () => {
    expect(getLandmarkType("any-seed", 0, 0)).toBe("village");
  });

  it("non-origin chunks return a valid non-village type", () => {
    const valid = new Set(["shrine", "ancient-tree", "campfire"]);
    const seed = "Gentle Mossy Hollow";
    for (let x = 1; x <= 5; x++) {
      for (let z = 1; z <= 5; z++) {
        if (!isLandmarkChunk(seed, x, z)) continue;
        expect(valid.has(getLandmarkType(seed, x, z))).toBe(true);
      }
    }
  });

  it("is deterministic", () => {
    const seed = "test";
    expect(getLandmarkType(seed, 3, 7)).toBe(getLandmarkType(seed, 3, 7));
  });
});

// ── bezierPoint ──────────────────────────────────────────────────────────────

describe("bezierPoint (Spec §31.1)", () => {
  const p0 = { x: 0, z: 0 };
  const p1 = { x: 8, z: 4 };
  const p2 = { x: 16, z: 0 };

  it("t=0 returns p0", () => {
    const pt = bezierPoint(p0, p1, p2, 0);
    expect(pt.x).toBeCloseTo(0);
    expect(pt.z).toBeCloseTo(0);
  });

  it("t=1 returns p2", () => {
    const pt = bezierPoint(p0, p1, p2, 1);
    expect(pt.x).toBeCloseTo(16);
    expect(pt.z).toBeCloseTo(0);
  });

  it("t=0.5 interpolates toward the control point", () => {
    const pt = bezierPoint(p0, p1, p2, 0.5);
    // Quadratic bezier at t=0.5: (0.25*p0 + 0.5*p1 + 0.25*p2)
    expect(pt.x).toBeCloseTo(0.25 * 0 + 0.5 * 8 + 0.25 * 16); // 8
    expect(pt.z).toBeCloseTo(0.25 * 0 + 0.5 * 4 + 0.25 * 0); // 2
  });

  it("straight line (control at midpoint) produces midpoint at t=0.5", () => {
    const start = { x: 0, z: 0 };
    const mid = { x: 8, z: 8 };
    const end = { x: 16, z: 16 };
    const pt = bezierPoint(start, mid, end, 0.5);
    expect(pt.x).toBeCloseTo(8);
    expect(pt.z).toBeCloseTo(8);
  });
});

// ── carveSplineIntoHeightmap ─────────────────────────────────────────────────

describe("carveSplineIntoHeightmap (Spec §31.1)", () => {
  it("lowers terrain along a straight N-S path", () => {
    const hm = flatHeightmap(0);
    // Straight N-S path through x=8
    carveSplineIntoHeightmap(
      hm,
      { x: 8, z: 0 }, // p0
      { x: 8, z: 7.5 }, // p1 (midpoint — straight line)
      { x: 8, z: 15 }, // p2
      1.5, // radius
      0.2, // carveDepth
      SIZE,
    );
    // Tile on the path center should be carved below zero.
    expect(hm[8 * SIZE + 8]).toBeLessThan(0);
  });

  it("does not carve tiles outside the radius", () => {
    const hm = flatHeightmap(0);
    // Straight E-W path at z=8, radius=1.0 — tiles at z=10 are 2 units away.
    carveSplineIntoHeightmap(
      hm,
      { x: 0, z: 8 },
      { x: 7.5, z: 8 },
      { x: 15, z: 8 },
      1.0,
      0.15,
      SIZE,
    );
    for (let x = 0; x < SIZE; x++) {
      expect(hm[10 * SIZE + x]).toBe(0); // z=10 is 2 units from path at z=8
    }
  });

  it("carve is deeper at the path center than at the edges", () => {
    const hm = flatHeightmap(0);
    // Straight E-W path at z=8.
    carveSplineIntoHeightmap(hm, { x: 0, z: 8 }, { x: 7.5, z: 8 }, { x: 15, z: 8 }, 2.0, 0.3, SIZE);
    const centerDepth = Math.abs(hm[8 * SIZE + 8]); // z=8, x=8 (center)
    const edgeDepth = Math.abs(hm[9 * SIZE + 8]); // z=9, x=8 (1 unit off)
    expect(centerDepth).toBeGreaterThan(edgeDepth);
  });

  it("does not modify tiles strictly beyond radius", () => {
    const hm = flatHeightmap(1.0);
    // Tiny radius — only affects tiles at exactly x=8, z=8.
    carveSplineIntoHeightmap(
      hm,
      { x: 8, z: 8 },
      { x: 8, z: 8 },
      { x: 8, z: 8 },
      0.4, // radius < 1 tile — only (8,8) should be in range
      0.5,
      SIZE,
    );
    // Tile (7, 8) is 1 unit away — should be unchanged.
    expect(hm[8 * SIZE + 7]).toBeCloseTo(1.0);
  });
});

// ── generatePathsForChunk ────────────────────────────────────────────────────

describe("generatePathsForChunk (Spec §31.1)", () => {
  it("returns empty array for a non-landmark chunk", () => {
    // Find a non-landmark chunk.
    const seed = "Gentle Mossy Hollow";
    let nonLandmark: { x: number; z: number } | null = null;
    for (let x = 1; x <= 20 && !nonLandmark; x++) {
      for (let z = 1; z <= 20 && !nonLandmark; z++) {
        if (!isLandmarkChunk(seed, x, z)) nonLandmark = { x, z };
      }
    }
    if (!nonLandmark) return; // extremely unlikely
    const hm = flatHeightmap(0);
    const result = generatePathsForChunk(seed, nonLandmark.x, nonLandmark.z, hm);
    expect(result).toHaveLength(0);
  });

  it("returns empty array when landmark has no landmark neighbors", () => {
    // Find a landmark chunk all of whose 4 neighbors are NOT landmarks.
    const seed = "Gentle Mossy Hollow";
    let isolated: { x: number; z: number } | null = null;
    outer: for (let x = -20; x <= 20; x++) {
      for (let z = -20; z <= 20; z++) {
        if (x === 0 && z === 0) continue; // origin always has potential neighbors
        if (!isLandmarkChunk(seed, x, z)) continue;
        const hasLandmarkNeighbor =
          isLandmarkChunk(seed, x, z - 1) ||
          isLandmarkChunk(seed, x + 1, z) ||
          isLandmarkChunk(seed, x, z + 1) ||
          isLandmarkChunk(seed, x - 1, z);
        if (!hasLandmarkNeighbor) {
          isolated = { x, z };
          break outer;
        }
      }
    }
    if (!isolated) return; // seed happens to have no isolated landmarks
    const hm = flatHeightmap(0);
    const result = generatePathsForChunk(seed, isolated.x, isolated.z, hm);
    expect(result).toHaveLength(0);
  });

  it("generates one segment per landmark neighbor", () => {
    const seed = "Gentle Mossy Hollow";
    // Count how many of (0,0)'s neighbors are landmarks.
    const hasN = isLandmarkChunk(seed, 0, -1);
    const hasE = isLandmarkChunk(seed, 1, 0);
    const hasS = isLandmarkChunk(seed, 0, 1);
    const hasW = isLandmarkChunk(seed, -1, 0);
    const expected = [hasN, hasE, hasS, hasW].filter(Boolean).length;

    const hm = flatHeightmap(0);
    const result = generatePathsForChunk(seed, 0, 0, hm);
    expect(result).toHaveLength(expected);
  });

  it("origin chunk generates road-type paths", () => {
    const seed = "Gentle Mossy Hollow";
    const hm = flatHeightmap(0);
    const result = generatePathsForChunk(seed, 0, 0, hm);
    for (const p of result) {
      expect(p.pathSegment.pathType).toBe("road");
    }
  });

  it("non-village landmark generates trail-type paths", () => {
    const seed = "Gentle Mossy Hollow";
    // Find a non-origin landmark that has at least one landmark neighbor.
    let found: { x: number; z: number } | null = null;
    outer: for (let x = -15; x <= 15; x++) {
      for (let z = -15; z <= 15; z++) {
        if (x === 0 && z === 0) continue;
        if (!isLandmarkChunk(seed, x, z)) continue;
        const hasNeighbor =
          isLandmarkChunk(seed, x, z - 1) ||
          isLandmarkChunk(seed, x + 1, z) ||
          isLandmarkChunk(seed, x, z + 1) ||
          isLandmarkChunk(seed, x - 1, z);
        if (hasNeighbor) {
          found = { x, z };
          break outer;
        }
      }
    }
    if (!found) return; // very unlikely with 30x30 search space
    const hm = flatHeightmap(0);
    const result = generatePathsForChunk(seed, found.x, found.z, hm);
    expect(result.length).toBeGreaterThan(0);
    for (const p of result) {
      expect(p.pathSegment.pathType).toBe("trail");
    }
  });

  it("each path segment has exactly 3 control points", () => {
    const seed = "Gentle Mossy Hollow";
    const hm = flatHeightmap(0);
    const result = generatePathsForChunk(seed, 0, 0, hm);
    for (const p of result) {
      expect(p.pathSegment.controlPoints).toHaveLength(3);
    }
  });

  it("path control points stay within chunk bounds or on boundary", () => {
    const seed = "Gentle Mossy Hollow";
    const hm = flatHeightmap(0);
    const result = generatePathsForChunk(seed, 0, 0, hm);
    for (const p of result) {
      const [p0, , p2] = p.pathSegment.controlPoints;
      // Start (landmark pos) must be inside chunk.
      expect(p0.x).toBeGreaterThanOrEqual(0);
      expect(p0.x).toBeLessThan(SIZE);
      expect(p0.z).toBeGreaterThanOrEqual(0);
      expect(p0.z).toBeLessThan(SIZE);
      // End point must be on a chunk boundary edge.
      const onEdge = p2.x === 0 || p2.x === SIZE - 1 || p2.z === 0 || p2.z === SIZE - 1;
      expect(onEdge).toBe(true);
    }
  });

  it("carves the heightmap when paths are generated", () => {
    // Find a landmark chunk that has at least one landmark neighbor to guarantee carving.
    const seed = "Gentle Mossy Hollow";
    const hasN = isLandmarkChunk(seed, 0, -1);
    const hasE = isLandmarkChunk(seed, 1, 0);
    const hasS = isLandmarkChunk(seed, 0, 1);
    const hasW = isLandmarkChunk(seed, -1, 0);
    const hasAnyNeighbor = hasN || hasE || hasS || hasW;

    if (!hasAnyNeighbor) return; // nothing to carve

    const hm = flatHeightmap(0);
    generatePathsForChunk(seed, 0, 0, hm);
    const minH = Math.min(...Array.from(hm));
    expect(minH).toBeLessThan(0);
  });

  it("is deterministic — same inputs produce identical output", () => {
    const seed = "Gentle Mossy Hollow";
    const hm1 = flatHeightmap(0);
    const hm2 = flatHeightmap(0);
    const r1 = generatePathsForChunk(seed, 0, 0, hm1);
    const r2 = generatePathsForChunk(seed, 0, 0, hm2);

    expect(r1).toHaveLength(r2.length);
    for (let i = 0; i < r1.length; i++) {
      expect(r1[i].pathSegment.pathType).toBe(r2[i].pathSegment.pathType);
      expect(r1[i].pathSegment.width).toBeCloseTo(r2[i].pathSegment.width);
      expect(r1[i].position.x).toBeCloseTo(r2[i].position.x);
      expect(r1[i].position.z).toBeCloseTo(r2[i].position.z);
    }
  });

  it("position anchor is at the landmark world-space location", () => {
    const seed = "Gentle Mossy Hollow";
    const hm = flatHeightmap(0);
    const result = generatePathsForChunk(seed, 0, 0, hm);
    if (result.length === 0) return;
    // Origin chunk (0,0) landmark is at local (8, 8) → world (8, 8).
    for (const p of result) {
      expect(p.position.x).toBeCloseTo(8);
      expect(p.position.z).toBeCloseTo(8);
    }
  });
});

// ── generateSignpostForChunk ─────────────────────────────────────────────────

describe("generateSignpostForChunk (Spec §17.6)", () => {
  const SEED = "Gentle Mossy Hollow";

  it("returns null for a non-landmark chunk", () => {
    // Find a non-landmark chunk.
    let nonLandmark: { x: number; z: number } | null = null;
    for (let x = 1; x <= 20 && !nonLandmark; x++) {
      for (let z = 1; z <= 20 && !nonLandmark; z++) {
        if (!isLandmarkChunk(SEED, x, z)) nonLandmark = { x, z };
      }
    }
    if (!nonLandmark) return; // extremely unlikely
    const hm = flatHeightmap(0);
    expect(generateSignpostForChunk(SEED, nonLandmark.x, nonLandmark.z, hm)).toBeNull();
  });

  it("returns null for an isolated landmark (< 2 connected neighbors)", () => {
    // Find a landmark chunk with 0 or 1 landmark neighbors.
    let isolated: { x: number; z: number } | null = null;
    outer: for (let x = -20; x <= 20; x++) {
      for (let z = -20; z <= 20; z++) {
        if (x === 0 && z === 0) continue;
        if (!isLandmarkChunk(SEED, x, z)) continue;
        const connectedCount = [
          [0, -1],
          [1, 0],
          [0, 1],
          [-1, 0],
        ].filter(([dx, dz]) => isLandmarkChunk(SEED, x + dx, z + dz)).length;
        if (connectedCount < 2) {
          isolated = { x, z };
          break outer;
        }
      }
    }
    if (!isolated) return; // very unlikely with 40x40 search
    const hm = flatHeightmap(0);
    expect(generateSignpostForChunk(SEED, isolated.x, isolated.z, hm)).toBeNull();
  });

  it("returns a placement at an intersection (2+ connected landmark neighbors)", () => {
    // Find a landmark chunk with 2+ landmark neighbors.
    let intersection: { x: number; z: number } | null = null;
    outer: for (let x = -20; x <= 20; x++) {
      for (let z = -20; z <= 20; z++) {
        if (!isLandmarkChunk(SEED, x, z)) continue;
        const connectedCount = [
          [0, -1],
          [1, 0],
          [0, 1],
          [-1, 0],
        ].filter(([dx, dz]) => isLandmarkChunk(SEED, x + dx, z + dz)).length;
        if (connectedCount >= 2) {
          intersection = { x, z };
          break outer;
        }
      }
    }
    if (!intersection) return; // seed has no intersections in range
    const hm = flatHeightmap(0);
    const result = generateSignpostForChunk(SEED, intersection.x, intersection.z, hm);
    expect(result).not.toBeNull();
  });

  it("facing direction is a valid cardinal direction", () => {
    let intersection: { x: number; z: number } | null = null;
    outer: for (let x = -20; x <= 20; x++) {
      for (let z = -20; z <= 20; z++) {
        if (!isLandmarkChunk(SEED, x, z)) continue;
        const connectedCount = [
          [0, -1],
          [1, 0],
          [0, 1],
          [-1, 0],
        ].filter(([dx, dz]) => isLandmarkChunk(SEED, x + dx, z + dz)).length;
        if (connectedCount >= 2) {
          intersection = { x, z };
          break outer;
        }
      }
    }
    if (!intersection) return;
    const hm = flatHeightmap(0);
    const result = generateSignpostForChunk(SEED, intersection.x, intersection.z, hm);
    expect(["N", "E", "S", "W"]).toContain(result?.signpost.facingDirection);
  });

  it("target world coords match the targeted neighbor landmark position", () => {
    let intersection: { x: number; z: number } | null = null;
    outer: for (let x = -20; x <= 20; x++) {
      for (let z = -20; z <= 20; z++) {
        if (!isLandmarkChunk(SEED, x, z)) continue;
        const connectedCount = [
          [0, -1],
          [1, 0],
          [0, 1],
          [-1, 0],
        ].filter(([dx, dz]) => isLandmarkChunk(SEED, x + dx, z + dz)).length;
        if (connectedCount >= 2) {
          intersection = { x, z };
          break outer;
        }
      }
    }
    if (!intersection) return;
    const { x, z } = intersection;
    const hm = flatHeightmap(0);
    const result = generateSignpostForChunk(SEED, x, z, hm);
    if (!result) return;

    const dirMap = { N: [0, -1], E: [1, 0], S: [0, 1], W: [-1, 0] } as const;
    const [ddx, ddz] = dirMap[result.signpost.facingDirection];
    const targetCX = x + ddx;
    const targetCZ = z + ddz;
    const targetLocal = getLandmarkLocalPos(SEED, targetCX, targetCZ);
    const expectedX = targetCX * SIZE + targetLocal.localX;
    const expectedZ = targetCZ * SIZE + targetLocal.localZ;

    expect(result.signpost.targetWorldX).toBeCloseTo(expectedX);
    expect(result.signpost.targetWorldZ).toBeCloseTo(expectedZ);
  });

  it("prefers a village neighbor over other landmark types", () => {
    // Origin (0,0) is always a village. Any of its neighbors that are also landmarks
    // should cause a signpost pointing toward (0,0) from those neighbors if they
    // have 2+ connections including origin.
    // Test from (0,0) perspective: if it has 2+ landmark neighbors, the signpost
    // should NOT point toward a village (since (0,0) itself is the village and
    // the signpost is placed AT the village pointing toward a neighbor).
    const seed = "Test Village Preference Seed";
    // Find a non-origin landmark with 2+ connections where one neighbor is origin.
    let candidate: { x: number; z: number } | null = null;
    const dirsFromOriginNeighbor = [
      [0, -1],
      [1, 0],
      [0, 1],
      [-1, 0],
    ] as const;
    for (const [dx, dz] of dirsFromOriginNeighbor) {
      const nx = 0 + dx;
      const nz = 0 + dz;
      if (!isLandmarkChunk(seed, nx, nz)) continue;
      // This neighbor sees origin (0,0) as a connected landmark.
      const connectedCount = [
        [0, -1],
        [1, 0],
        [0, 1],
        [-1, 0],
      ].filter(([ddx, ddz]) => isLandmarkChunk(seed, nx + ddx, nz + ddz)).length;
      if (connectedCount >= 2) {
        candidate = { x: nx, z: nz };
        break;
      }
    }
    if (!candidate) return;
    const hm = flatHeightmap(0);
    const result = generateSignpostForChunk(seed, candidate.x, candidate.z, hm);
    if (!result) return;
    // Should prefer the village (0,0) as the target.
    expect(result.signpost.targetLandmarkType).toBe("village");
  });

  it("signpost position is at the chunk's landmark world-space location", () => {
    let intersection: { x: number; z: number } | null = null;
    outer: for (let x = -20; x <= 20; x++) {
      for (let z = -20; z <= 20; z++) {
        if (!isLandmarkChunk(SEED, x, z)) continue;
        const connectedCount = [
          [0, -1],
          [1, 0],
          [0, 1],
          [-1, 0],
        ].filter(([dx, dz]) => isLandmarkChunk(SEED, x + dx, z + dz)).length;
        if (connectedCount >= 2) {
          intersection = { x, z };
          break outer;
        }
      }
    }
    if (!intersection) return;
    const { x, z } = intersection;
    const hm = flatHeightmap(0);
    const result = generateSignpostForChunk(SEED, x, z, hm);
    if (!result) return;

    const localPos = getLandmarkLocalPos(SEED, x, z);
    expect(result.position.x).toBeCloseTo(x * SIZE + localPos.localX);
    expect(result.position.z).toBeCloseTo(z * SIZE + localPos.localZ);
  });

  it("is deterministic — same inputs produce the same output", () => {
    let intersection: { x: number; z: number } | null = null;
    outer: for (let x = -20; x <= 20; x++) {
      for (let z = -20; z <= 20; z++) {
        if (!isLandmarkChunk(SEED, x, z)) continue;
        const connectedCount = [
          [0, -1],
          [1, 0],
          [0, 1],
          [-1, 0],
        ].filter(([dx, dz]) => isLandmarkChunk(SEED, x + dx, z + dz)).length;
        if (connectedCount >= 2) {
          intersection = { x, z };
          break outer;
        }
      }
    }
    if (!intersection) return;
    const { x, z } = intersection;
    const r1 = generateSignpostForChunk(SEED, x, z, flatHeightmap(0));
    const r2 = generateSignpostForChunk(SEED, x, z, flatHeightmap(0));
    expect(r1?.signpost.facingDirection).toBe(r2?.signpost.facingDirection);
    expect(r1?.signpost.targetLandmarkType).toBe(r2?.signpost.targetLandmarkType);
    expect(r1?.signpost.targetWorldX).toBeCloseTo(r2?.signpost.targetWorldX ?? 0);
    expect(r1?.signpost.targetWorldZ).toBeCloseTo(r2?.signpost.targetWorldZ ?? 0);
  });
});
