import { describe, expect, it } from "vitest";
import { advancePathFollow, createPathFollow } from "./pathFollowing";
import type { TileCoord } from "./pathfinding";

// CELL_SIZE is 1, so tile (3,4) center is at world (3,4)

describe("createPathFollow", () => {
  it("creates state from a tile path", () => {
    const path: TileCoord[] = [
      { x: 0, z: 0 },
      { x: 1, z: 0 },
      { x: 2, z: 0 },
    ];
    const state = createPathFollow(path);
    expect(state.waypoints.length).toBe(3);
    expect(state.currentIndex).toBe(1); // skips first (current tile)
    expect(state.done).toBe(false);
  });

  it("handles single-tile path", () => {
    const path: TileCoord[] = [{ x: 5, z: 5 }];
    const state = createPathFollow(path);
    expect(state.currentIndex).toBe(0);
    expect(state.done).toBe(false);
  });

  it("handles empty path", () => {
    const state = createPathFollow([]);
    expect(state.done).toBe(true);
  });
});

describe("advancePathFollow", () => {
  it("returns direction toward next waypoint", () => {
    const path: TileCoord[] = [
      { x: 0, z: 0 },
      { x: 1, z: 0 },
    ];
    const state = createPathFollow(path);
    const vec = advancePathFollow(state, { x: 0, z: 0 });
    // Should point toward (1, 0) = positive X
    expect(vec.x).toBeGreaterThan(0);
    expect(Math.abs(vec.z)).toBeLessThan(0.01);
  });

  it("returns normalized vector", () => {
    const path: TileCoord[] = [
      { x: 0, z: 0 },
      { x: 3, z: 4 },
    ];
    const state = createPathFollow(path);
    const vec = advancePathFollow(state, { x: 0, z: 0 });
    const mag = Math.sqrt(vec.x * vec.x + vec.z * vec.z);
    expect(mag).toBeCloseTo(1, 2);
  });

  it("advances to next waypoint when close enough", () => {
    const path: TileCoord[] = [
      { x: 0, z: 0 },
      { x: 1, z: 0 },
      { x: 2, z: 0 },
    ];
    const state = createPathFollow(path);
    // Player is very close to waypoint 1
    const vec = advancePathFollow(state, { x: 0.99, z: 0 });
    // Should have advanced past waypoint 1, now heading to waypoint 2
    expect(state.currentIndex).toBe(2);
    expect(vec.x).toBeGreaterThan(0);
  });

  it("marks done when all waypoints reached", () => {
    const path: TileCoord[] = [
      { x: 0, z: 0 },
      { x: 1, z: 0 },
    ];
    const state = createPathFollow(path);
    // Player at the final waypoint
    const vec = advancePathFollow(state, { x: 1, z: 0 });
    expect(state.done).toBe(true);
    expect(vec).toEqual({ x: 0, z: 0 });
  });

  it("returns zero when already done", () => {
    const path: TileCoord[] = [{ x: 0, z: 0 }];
    const state = createPathFollow(path);
    // Arrive at destination
    advancePathFollow(state, { x: 0, z: 0 });
    expect(state.done).toBe(true);
    // Subsequent calls should return zero
    const vec = advancePathFollow(state, { x: 0, z: 0 });
    expect(vec).toEqual({ x: 0, z: 0 });
  });

  it("follows multi-step path correctly", () => {
    const path: TileCoord[] = [
      { x: 0, z: 0 },
      { x: 1, z: 0 },
      { x: 1, z: 1 },
      { x: 2, z: 1 },
    ];
    const state = createPathFollow(path);

    // Step 1: heading to (1,0)
    let vec = advancePathFollow(state, { x: 0.5, z: 0 });
    expect(vec.x).toBeGreaterThan(0);
    expect(state.currentIndex).toBe(1);

    // Arrive at (1,0) — should advance to (1,1)
    vec = advancePathFollow(state, { x: 1, z: 0 });
    expect(state.currentIndex).toBe(2);
    expect(vec.z).toBeGreaterThan(0); // heading +Z

    // Arrive at (1,1) — should advance to (2,1)
    vec = advancePathFollow(state, { x: 1, z: 1 });
    expect(state.currentIndex).toBe(3);
    expect(vec.x).toBeGreaterThan(0); // heading +X

    // Arrive at final (2,1)
    vec = advancePathFollow(state, { x: 2, z: 1 });
    expect(state.done).toBe(true);
    expect(vec).toEqual({ x: 0, z: 0 });
  });
});
