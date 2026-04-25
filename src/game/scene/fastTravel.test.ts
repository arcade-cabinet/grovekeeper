/**
 * fastTravel tests — Sub-wave A.
 *
 * Covers `listClaimedGroves` (filters by state) and
 * `FastTravelController` (fade-out → hold + teleport → fade-in,
 * idempotent under double-start).
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  FAST_TRAVEL_TIMING,
  FastTravelController,
  type ClaimedGroveNode,
  listClaimedGroves,
} from "./fastTravel";

// Mock the repo so we don't need a real SQLite handle.
vi.mock("@/db/repos/grovesRepo", () => ({
  listGrovesByWorld: vi.fn(),
}));

import { listGrovesByWorld } from "@/db/repos/grovesRepo";

describe("listClaimedGroves", () => {
  it("forwards worldId + 'claimed' state filter to the repo", () => {
    const db = {} as Parameters<typeof listClaimedGroves>[0];
    vi.mocked(listGrovesByWorld).mockReturnValueOnce([]);
    listClaimedGroves(db, "world-1");
    expect(listGrovesByWorld).toHaveBeenCalledWith(db, "world-1", "claimed");
  });

  it("maps Grove rows to ClaimedGroveNode with computed world centre", () => {
    const db = {} as Parameters<typeof listClaimedGroves>[0];
    vi.mocked(listGrovesByWorld).mockReturnValueOnce([
      {
        id: "grove-3-0",
        worldId: "world-1",
        chunkX: 3,
        chunkZ: 0,
        biome: "meadow",
        state: "claimed",
        discoveredAt: 0,
        claimedAt: 100,
        hearthLitAt: 100,
      },
      {
        id: "grove--1-2",
        worldId: "world-1",
        chunkX: -1,
        chunkZ: 2,
        biome: "forest",
        state: "claimed",
        discoveredAt: 0,
        claimedAt: 200,
        hearthLitAt: 200,
      },
    ]);
    const out = listClaimedGroves(db, "world-1");
    expect(out).toHaveLength(2);
    // chunkSize=16 → centre at chunk*16 + 8.
    expect(out[0].worldX).toBe(56);
    expect(out[0].worldZ).toBe(8);
    expect(out[0].biome).toBe("meadow");
    expect(out[0].name).toContain("(3, 0)");
    expect(out[1].worldX).toBe(-8);
    expect(out[1].worldZ).toBe(40);
  });
});

describe("FastTravelController", () => {
  const target: ClaimedGroveNode = {
    groveId: "grove-3-0",
    worldId: "world-1",
    chunkX: 3,
    chunkZ: 0,
    biome: "meadow",
    name: "Grove (3, 0)",
    worldX: 56,
    worldZ: 8,
  };

  let teleporter: { teleport: ReturnType<typeof vi.fn> };
  let overlay: { setFadeOpacity: ReturnType<typeof vi.fn> };
  let ctl: FastTravelController;

  beforeEach(() => {
    teleporter = { teleport: vi.fn() };
    overlay = { setFadeOpacity: vi.fn() };
    ctl = new FastTravelController({ teleporter, overlay });
  });

  it("starts idle", () => {
    expect(ctl.isActive).toBe(false);
    expect(ctl.currentPhase).toBe("idle");
  });

  it("transitions to fade-out on start, opacity ramps 0 → 1", () => {
    ctl.start(target, 0);
    expect(ctl.currentPhase).toBe("fade-out");
    ctl.tick(FAST_TRAVEL_TIMING.fadeOutMs / 2);
    const half = overlay.setFadeOpacity.mock.calls.at(-1)?.[0] as number;
    expect(half).toBeCloseTo(0.5, 5);
    ctl.tick(FAST_TRAVEL_TIMING.fadeOutMs);
    const full = overlay.setFadeOpacity.mock.calls.at(-1)?.[0] as number;
    expect(full).toBe(1);
    expect(ctl.currentPhase).toBe("hold");
  });

  it("teleports during the hold phase, exactly once", () => {
    ctl.start(target, 0);
    ctl.tick(FAST_TRAVEL_TIMING.fadeOutMs);
    expect(teleporter.teleport).toHaveBeenCalledTimes(1);
    expect(teleporter.teleport).toHaveBeenCalledWith(56, 8);
    // Re-tick during hold should not re-teleport.
    ctl.tick(FAST_TRAVEL_TIMING.fadeOutMs + 100);
    expect(teleporter.teleport).toHaveBeenCalledTimes(1);
  });

  it("returns to idle after fade-in completes", () => {
    ctl.start(target, 0);
    ctl.tick(FAST_TRAVEL_TIMING.totalMs);
    expect(ctl.currentPhase).toBe("idle");
    expect(ctl.isActive).toBe(false);
    // Final opacity should be 0 (fully cleared).
    const final = overlay.setFadeOpacity.mock.calls.at(-1)?.[0] as number;
    expect(final).toBe(0);
  });

  it("is idempotent under double-start (queued click)", () => {
    ctl.start(target, 0);
    ctl.start(target, 100);
    ctl.tick(FAST_TRAVEL_TIMING.fadeOutMs);
    expect(teleporter.teleport).toHaveBeenCalledTimes(1);
  });

  it("can run a second transition after the first completes", () => {
    ctl.start(target, 0);
    ctl.tick(FAST_TRAVEL_TIMING.totalMs);
    expect(ctl.currentPhase).toBe("idle");

    const target2: ClaimedGroveNode = { ...target, worldX: 100, worldZ: 200 };
    ctl.start(target2, 5_000);
    ctl.tick(5_000 + FAST_TRAVEL_TIMING.fadeOutMs);
    expect(teleporter.teleport).toHaveBeenLastCalledWith(100, 200);
  });
});
