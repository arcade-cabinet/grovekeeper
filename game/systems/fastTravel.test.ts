/**
 * Fast Travel System tests -- Spec §17.6 (Map & Navigation)
 *
 * Campfire network: discover by visiting, max 8 points, teleport to destination.
 */

import {
  canDiscoverMore,
  discoverCampfire,
  type FastTravelPoint,
  getTeleportTarget,
  isCampfireDiscovered,
} from "./fastTravel.ts";

const MAX_POINTS = 8;

function makePoint(id: string, x = 0, z = 0, label = id): FastTravelPoint {
  return { id, label, worldX: x, worldZ: z };
}

// ── discoverCampfire ──────────────────────────────────────────────────────────

describe("discoverCampfire (Spec §17.6)", () => {
  it("adds a new campfire to an empty list", () => {
    const point = makePoint("village-0-0", 8, 8, "Tutorial Village");
    const result = discoverCampfire([], point);
    expect(result.newPoints).toHaveLength(1);
    expect(result.newPoints[0]).toEqual(point);
    expect(result.isNew).toBe(true);
    expect(result.isFull).toBe(false);
  });

  it("returns isNew:false when campfire already discovered", () => {
    const point = makePoint("village-0-0", 8, 8);
    const result = discoverCampfire([point], point);
    expect(result.isNew).toBe(false);
    expect(result.newPoints).toHaveLength(1);
  });

  it("returns same array reference for duplicate discovery", () => {
    const point = makePoint("village-0-0");
    const existing = [point];
    const result = discoverCampfire(existing, point);
    expect(result.newPoints).toBe(existing);
  });

  it("does not mutate original array", () => {
    const original: FastTravelPoint[] = [];
    discoverCampfire(original, makePoint("village-1-0"));
    expect(original).toHaveLength(0);
  });

  it("preserves existing campfires when adding a new one", () => {
    const a = makePoint("village-0-0");
    const b = makePoint("village-1-0");
    const result = discoverCampfire([a], b);
    expect(result.newPoints).toEqual([a, b]);
    expect(result.isNew).toBe(true);
  });

  it("respects max 8 point limit", () => {
    const full: FastTravelPoint[] = Array.from({ length: MAX_POINTS }, (_, i) =>
      makePoint(`village-${i}-0`),
    );
    const extra = makePoint("village-99-0");
    const result = discoverCampfire(full, extra);
    expect(result.isNew).toBe(false);
    expect(result.isFull).toBe(true);
    expect(result.newPoints).toHaveLength(MAX_POINTS);
  });

  it("reports isFull after adding the 8th point", () => {
    const existing: FastTravelPoint[] = Array.from({ length: MAX_POINTS - 1 }, (_, i) =>
      makePoint(`village-${i}-0`),
    );
    const last = makePoint("village-7-0");
    const result = discoverCampfire(existing, last);
    expect(result.isNew).toBe(true);
    expect(result.isFull).toBe(true);
    expect(result.newPoints).toHaveLength(MAX_POINTS);
  });

  it("is not full when below max capacity", () => {
    const point = makePoint("village-0-0");
    const result = discoverCampfire([], point);
    expect(result.isFull).toBe(false);
  });
});

// ── isCampfireDiscovered ──────────────────────────────────────────────────────

describe("isCampfireDiscovered (Spec §17.6)", () => {
  it("returns true for a known campfire", () => {
    const points = [makePoint("village-0-0"), makePoint("village-1-0")];
    expect(isCampfireDiscovered(points, "village-0-0")).toBe(true);
  });

  it("returns false for an unknown campfire", () => {
    const points = [makePoint("village-0-0")];
    expect(isCampfireDiscovered(points, "village-99-0")).toBe(false);
  });

  it("returns false for empty list", () => {
    expect(isCampfireDiscovered([], "village-0-0")).toBe(false);
  });
});

// ── canDiscoverMore ───────────────────────────────────────────────────────────

describe("canDiscoverMore (Spec §17.6)", () => {
  it("returns true when below max capacity", () => {
    expect(canDiscoverMore([])).toBe(true);
    expect(canDiscoverMore([makePoint("a"), makePoint("b")])).toBe(true);
  });

  it("returns false when at max capacity", () => {
    const full = Array.from({ length: MAX_POINTS }, (_, i) => makePoint(`p${i}`));
    expect(canDiscoverMore(full)).toBe(false);
  });

  it("returns false when above max (guard)", () => {
    const over = Array.from({ length: MAX_POINTS + 1 }, (_, i) => makePoint(`p${i}`));
    expect(canDiscoverMore(over)).toBe(false);
  });
});

// ── getTeleportTarget ─────────────────────────────────────────────────────────

describe("getTeleportTarget (Spec §17.6)", () => {
  it("returns the world position of a discovered campfire", () => {
    const points = [makePoint("village-0-0", 128, 64, "Tutorial Village")];
    const target = getTeleportTarget(points, "village-0-0");
    expect(target).toEqual({ x: 128, z: 64 });
  });

  it("returns null for an undiscovered campfire", () => {
    expect(getTeleportTarget([], "village-0-0")).toBeNull();
  });

  it("returns null when id not in list", () => {
    const points = [makePoint("village-0-0", 10, 20)];
    expect(getTeleportTarget(points, "village-99-0")).toBeNull();
  });

  it("returns correct position when multiple campfires exist", () => {
    const points = [
      makePoint("village-0-0", 0, 0),
      makePoint("village-1-0", 256, 0),
      makePoint("village-0-1", 0, 256),
    ];
    expect(getTeleportTarget(points, "village-1-0")).toEqual({ x: 256, z: 0 });
    expect(getTeleportTarget(points, "village-0-1")).toEqual({ x: 0, z: 256 });
  });
});
