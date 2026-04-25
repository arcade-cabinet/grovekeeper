/**
 * combatSystem tests — Wave 14/15.
 *
 * Verifies:
 *   - findHostilesInReach picks hostile creatures within reach,
 *   - peaceful creatures are NEVER targeted by player swings,
 *   - swingHit applies damage and reports kills,
 *   - dispatchPlayerHit decrements FarmerState.hp on the player entity.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { koota, spawnPlayer } from "@/koota";
import { FarmerState, IsPlayer } from "@/traits";
import {
  DEFAULT_SWING_DAMAGE,
  DEFAULT_SWING_REACH,
  dispatchPlayerHit,
  findHostilesInReach,
  swingHit,
} from "./combatSystem";

interface FakeCreature {
  state: string;
  species: string;
  hostility: "peaceful" | "hostile";
  position: { x: number; y: number; z: number };
  applyDamage: ReturnType<typeof vi.fn>;
}

function fakeCreature(opts: {
  hostility: "peaceful" | "hostile";
  x: number;
  z: number;
  hp?: number;
}): FakeCreature {
  let dead = false;
  return {
    state: "idle",
    species: opts.hostility === "hostile" ? "wolf-pup" : "rabbit",
    hostility: opts.hostility,
    position: { x: opts.x, y: 0, z: opts.z },
    applyDamage: vi.fn((dmg: number) => {
      const hp = (opts.hp ?? 1) - dmg;
      if (hp <= 0 && !dead) {
        dead = true;
        return true;
      }
      return false;
    }),
  };
}

describe("findHostilesInReach", () => {
  it("picks hostile creatures within reach", () => {
    const c1 = fakeCreature({ hostility: "hostile", x: 0.5, z: 0 });
    const c2 = fakeCreature({ hostility: "hostile", x: 100, z: 0 });
    // biome-ignore lint/suspicious/noExplicitAny: stub
    const out = findHostilesInReach({ x: 0, z: 0 }, [c1, c2] as any, 2);
    expect(out).toHaveLength(1);
    expect(out[0]).toBe(c1);
  });

  it("never picks peaceful creatures even if in range", () => {
    const peaceful = fakeCreature({ hostility: "peaceful", x: 0, z: 0 });
    // biome-ignore lint/suspicious/noExplicitAny: stub
    const out = findHostilesInReach({ x: 0, z: 0 }, [peaceful] as any, 5);
    expect(out).toHaveLength(0);
  });

  it("ignores dead creatures", () => {
    const c = fakeCreature({ hostility: "hostile", x: 0, z: 0 });
    c.state = "dead";
    // biome-ignore lint/suspicious/noExplicitAny: stub
    const out = findHostilesInReach({ x: 0, z: 0 }, [c] as any, 5);
    expect(out).toHaveLength(0);
  });
});

describe("swingHit", () => {
  it("damages every hostile in reach", () => {
    const c1 = fakeCreature({ hostility: "hostile", x: 0.5, z: 0, hp: 5 });
    const c2 = fakeCreature({ hostility: "hostile", x: 1.0, z: 0, hp: 5 });
    // biome-ignore lint/suspicious/noExplicitAny: stub
    const result = swingHit({ x: 0, z: 0 }, [c1, c2] as any);
    expect(result.hits).toHaveLength(2);
    expect(c1.applyDamage).toHaveBeenCalledWith(DEFAULT_SWING_DAMAGE);
    expect(c2.applyDamage).toHaveBeenCalledWith(DEFAULT_SWING_DAMAGE);
  });

  it("misses creatures out of reach", () => {
    const far = fakeCreature({
      hostility: "hostile",
      x: DEFAULT_SWING_REACH + 5,
      z: 0,
    });
    // biome-ignore lint/suspicious/noExplicitAny: stub
    const result = swingHit({ x: 0, z: 0 }, [far] as any);
    expect(result.hits).toHaveLength(0);
    expect(far.applyDamage).not.toHaveBeenCalled();
  });

  it("returns killed list when applyDamage signals death", () => {
    const c = fakeCreature({ hostility: "hostile", x: 0, z: 0, hp: 1 });
    // biome-ignore lint/suspicious/noExplicitAny: stub
    const result = swingHit({ x: 0, z: 0 }, [c] as any, { damage: 1 });
    expect(result.killed).toHaveLength(1);
  });
});

describe("dispatchPlayerHit", () => {
  beforeEach(() => {
    if (!koota.queryFirst(IsPlayer, FarmerState)) spawnPlayer();
    // Reset player FarmerState to full so test order doesn't matter.
    const player = koota.queryFirst(IsPlayer, FarmerState);
    if (player) {
      player.set(FarmerState, {
        hp: 100,
        maxHp: 100,
        stamina: 100,
        maxStamina: 100,
      });
    }
  });

  it("decrements the player FarmerState.hp by the damage amount", () => {
    const result = dispatchPlayerHit(koota, 15);
    expect(result).toBe(85);
    const fs = koota.queryFirst(IsPlayer, FarmerState)?.get(FarmerState);
    expect(fs?.hp).toBe(85);
  });

  it("clamps to zero (no negative hp)", () => {
    const result = dispatchPlayerHit(koota, 999);
    expect(result).toBe(0);
  });

  it("ignores negative damage values", () => {
    const result = dispatchPlayerHit(koota, -50);
    expect(result).toBe(100);
  });
});
