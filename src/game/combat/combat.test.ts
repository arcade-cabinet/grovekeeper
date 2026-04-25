/**
 * Combat reducer tests — Wave 14/15.
 *
 * Pure function checks: applyHit, isDead. No engine refs.
 */

import { describe, expect, it } from "vitest";
import { applyHit, isDead } from "./combat";
import type { Combatant, HitEvent } from "./types";

const C = (hp: number): Combatant => ({ id: "x", hp, hpMax: 100 });

describe("applyHit", () => {
  it("subtracts damage from target hp", () => {
    const next = applyHit(C(50), { attackerId: "a", targetId: "x", damage: 5 });
    expect(next.hp).toBe(45);
  });

  it("does not allow hp to drop below zero", () => {
    const next = applyHit(C(3), { attackerId: "a", targetId: "x", damage: 99 });
    expect(next.hp).toBe(0);
  });

  it("ignores negative damage values (no healing through this path)", () => {
    const next = applyHit(C(50), {
      attackerId: "a",
      targetId: "x",
      damage: -100,
    });
    expect(next.hp).toBe(50);
  });

  it("does not mutate the input", () => {
    const target = C(50);
    const hit: HitEvent = { attackerId: "a", targetId: "x", damage: 5 };
    applyHit(target, hit);
    expect(target.hp).toBe(50);
  });

  it("preserves id and hpMax", () => {
    const next = applyHit(C(50), { attackerId: "a", targetId: "x", damage: 5 });
    expect(next.id).toBe("x");
    expect(next.hpMax).toBe(100);
  });
});

describe("isDead", () => {
  it("returns true at hp 0", () => {
    expect(isDead(C(0))).toBe(true);
  });

  it("returns false at hp 1", () => {
    expect(isDead(C(1))).toBe(false);
  });

  it("returns true at negative hp (defensive)", () => {
    expect(isDead(C(-5))).toBe(true);
  });
});
