/**
 * RetreatSystem tests — Wave 14/15.
 *
 * Verifies:
 *   - HP=0 OR stamina=0 triggers retreat,
 *   - retreat picks nearest claimed grove (or starter grove if none),
 *   - HP + stamina restored to 50% during the hold,
 *   - phase transitions through fade-out → hold → fade-in → idle,
 *   - overlay opacity rises during fade-out, holds at 1, falls during fade-in.
 */

import { describe, expect, it, vi } from "vitest";
import {
  pickRetreatTarget,
  RetreatSystem,
  STARTER_GROVE_CHUNK,
} from "./RetreatSystem";

function makeFixtures() {
  let vitalsState = { hp: 100, hpMax: 100, stamina: 100, staminaMax: 100 };
  const teleporter = {
    teleport: vi.fn((x: number, z: number) => {
      teleporter.lastX = x;
      teleporter.lastZ = z;
    }),
    lastX: 0,
    lastZ: 0,
  };
  const groves = {
    list: vi.fn(
      () => [] as { groveId: string; worldX: number; worldZ: number }[],
    ),
  };
  const sys = new RetreatSystem({
    vitals: {
      get: () => vitalsState,
      restore: (frac: number) => {
        vitalsState = {
          ...vitalsState,
          hp: vitalsState.hpMax * frac,
          stamina: vitalsState.staminaMax * frac,
        };
      },
    },
    teleporter,
    groves,
    fadeOutMs: 100,
    holdMs: 100,
    fadeInMs: 100,
  });
  return {
    sys,
    teleporter,
    groves,
    setVitals: (next: Partial<typeof vitalsState>) => {
      vitalsState = { ...vitalsState, ...next };
    },
    getVitals: () => vitalsState,
  };
}

describe("pickRetreatTarget", () => {
  it("falls back to the starter grove when no groves are claimed", () => {
    const target = pickRetreatTarget({ x: 100, z: 100 }, []);
    expect(target.worldX).toBe(STARTER_GROVE_CHUNK.x * 16 + 8);
    expect(target.worldZ).toBe(STARTER_GROVE_CHUNK.z * 16 + 8);
  });

  it("picks the nearest claimed grove", () => {
    const claimed = [
      { groveId: "a", worldX: 0, worldZ: 0 },
      { groveId: "b", worldX: 100, worldZ: 0 },
      { groveId: "c", worldX: -50, worldZ: 0 },
    ];
    const t = pickRetreatTarget({ x: 99, z: 0 }, claimed);
    expect(t.worldX).toBe(100);
  });
});

describe("RetreatSystem state machine", () => {
  it("idles while HP and stamina are healthy", () => {
    const f = makeFixtures();
    const state = f.sys.update(16, { x: 0, z: 0 });
    expect(state.phase).toBe("idle");
    expect(state.overlayOpacity).toBe(0);
  });

  it("triggers retreat when HP hits 0", () => {
    const f = makeFixtures();
    f.setVitals({ hp: 0 });
    f.sys.update(16, { x: 0, z: 0 });
    expect(f.sys.state.phase).toBe("fading-out");
  });

  it("triggers retreat when stamina hits 0", () => {
    const f = makeFixtures();
    f.setVitals({ stamina: 0 });
    f.sys.update(16, { x: 0, z: 0 });
    expect(f.sys.state.phase).toBe("fading-out");
  });

  it("transitions fading-out → holding once fadeOutMs elapses", () => {
    const f = makeFixtures();
    f.setVitals({ hp: 0 });
    f.sys.update(16, { x: 0, z: 0 });
    expect(f.sys.state.phase).toBe("fading-out");
    f.sys.update(200, { x: 50, z: 50 });
    expect(f.sys.state.phase).toBe("holding");
    // Teleport happened on the transition.
    expect(f.teleporter.teleport).toHaveBeenCalled();
  });

  it("teleports to the starter grove when no groves are claimed", () => {
    const f = makeFixtures();
    f.setVitals({ hp: 0 });
    f.sys.update(16, { x: 999, z: 999 });
    f.sys.update(200, { x: 999, z: 999 });
    expect(f.teleporter.lastX).toBe(STARTER_GROVE_CHUNK.x * 16 + 8);
    expect(f.teleporter.lastZ).toBe(STARTER_GROVE_CHUNK.z * 16 + 8);
  });

  it("teleports to the nearest claimed grove when one exists", () => {
    const f = makeFixtures();
    f.groves.list.mockReturnValue([
      { groveId: "near", worldX: 64, worldZ: 64 },
      { groveId: "far", worldX: 9999, worldZ: 9999 },
    ]);
    f.setVitals({ hp: 0 });
    f.sys.update(16, { x: 50, z: 50 });
    f.sys.update(200, { x: 50, z: 50 });
    expect(f.teleporter.lastX).toBe(64);
    expect(f.teleporter.lastZ).toBe(64);
  });

  it("restores HP + stamina to 50% during the hold", () => {
    const f = makeFixtures();
    f.setVitals({ hp: 0, stamina: 0 });
    f.sys.update(16, { x: 0, z: 0 });
    f.sys.update(200, { x: 0, z: 0 });
    const v = f.getVitals();
    expect(v.hp).toBe(50);
    expect(v.stamina).toBe(50);
  });

  it("returns to idle after fading-in completes", () => {
    const f = makeFixtures();
    f.setVitals({ hp: 0 });
    f.sys.update(16, { x: 0, z: 0 });
    f.sys.update(200, { x: 0, z: 0 }); // fading-out → holding
    f.sys.update(200, { x: 0, z: 0 }); // holding → fading-in
    f.sys.update(200, { x: 0, z: 0 }); // fading-in → idle
    expect(f.sys.state.phase).toBe("idle");
  });

  it("overlayOpacity rises during fade-out, holds at 1, falls during fade-in", () => {
    const f = makeFixtures();
    f.setVitals({ hp: 0 });
    f.sys.update(0, { x: 0, z: 0 });
    expect(f.sys.state.overlayOpacity).toBe(0);
    f.sys.update(50, { x: 0, z: 0 });
    expect(f.sys.state.overlayOpacity).toBeCloseTo(0.5, 1);
    f.sys.update(100, { x: 0, z: 0 });
    expect(f.sys.state.overlayOpacity).toBe(1);
    f.sys.update(50, { x: 0, z: 0 });
    expect(f.sys.state.overlayOpacity).toBe(1);
    f.sys.update(100, { x: 0, z: 0 }); // hold ends, fade-in starts
    f.sys.update(50, { x: 0, z: 0 });
    expect(f.sys.state.overlayOpacity).toBeLessThan(0.6);
  });

  it("isActive flag toggles correctly", () => {
    const f = makeFixtures();
    expect(f.sys.isActive).toBe(false);
    f.setVitals({ hp: 0 });
    f.sys.update(16, { x: 0, z: 0 });
    expect(f.sys.isActive).toBe(true);
  });
});
