/**
 * Tests for NPC walk-cycle animation system.
 * Spec: GAME_SPEC.md §15 — NPC Animation (Lego-style rigid body part rotation)
 */

import type { NpcComponent } from "@/game/ecs/components/npc";
import { advanceNpcAnimation, computeNpcLimbRotations } from "./npcAnimation";

function makeNpc(overrides: Partial<NpcComponent> = {}): NpcComponent {
  return {
    templateId: "test-npc",
    function: "tips",
    interactable: true,
    requiredLevel: 1,
    baseModel: "basemesh",
    useEmission: false,
    items: {},
    colorPalette: "#8B4513",
    name: "Test NPC",
    personality: "cheerful",
    dialogue: "test",
    schedule: [],
    currentAnim: "idle",
    animProgress: 0,
    animSpeed: 1,
    ...overrides,
  };
}

describe("computeNpcLimbRotations (Spec §15)", () => {
  it("returns zero rotations for idle state", () => {
    const npc = makeNpc({ currentAnim: "idle" });
    const rot = computeNpcLimbRotations(npc);
    expect(rot.leftArm).toBe(0);
    expect(rot.rightArm).toBe(0);
    expect(rot.leftLeg).toBe(0);
    expect(rot.rightLeg).toBe(0);
    expect(rot.bounceY).toBe(0);
  });

  it("returns zero rotations for talk state", () => {
    const npc = makeNpc({ currentAnim: "talk", animProgress: 1.5 });
    const rot = computeNpcLimbRotations(npc);
    expect(rot.leftArm).toBe(0);
    expect(rot.rightArm).toBe(0);
    expect(rot.leftLeg).toBe(0);
    expect(rot.rightLeg).toBe(0);
  });

  it("returns zero rotations for sleep state", () => {
    const npc = makeNpc({ currentAnim: "sleep", animProgress: 2.0 });
    const rot = computeNpcLimbRotations(npc);
    expect(rot.leftArm).toBe(0);
    expect(rot.leftLeg).toBe(0);
  });

  it("returns non-zero arm rotation during walk", () => {
    // t=0.5: sin(0.5 * 3.0) = sin(1.5) ≠ 0
    const npc = makeNpc({ currentAnim: "walk", animProgress: 0.5 });
    const rot = computeNpcLimbRotations(npc);
    expect(rot.leftArm).not.toBe(0);
    expect(rot.rightArm).not.toBe(0);
  });

  it("returns non-zero leg rotation during walk", () => {
    const npc = makeNpc({ currentAnim: "walk", animProgress: 0.5 });
    const rot = computeNpcLimbRotations(npc);
    expect(rot.leftLeg).not.toBe(0);
    expect(rot.rightLeg).not.toBe(0);
  });

  it("arms swing in opposition — opposite signs at t=0.5", () => {
    const npc = makeNpc({ currentAnim: "walk", animProgress: 0.5 });
    const rot = computeNpcLimbRotations(npc);
    // leftArm phase=0, rightArm phase=π → product is negative
    expect(rot.leftArm * rot.rightArm).toBeLessThan(0);
  });

  it("legs swing in opposition — opposite signs at t=0.5", () => {
    const npc = makeNpc({ currentAnim: "walk", animProgress: 0.5 });
    const rot = computeNpcLimbRotations(npc);
    // leftLeg phase=π, rightLeg phase=0 → product is negative
    expect(rot.leftLeg * rot.rightLeg).toBeLessThan(0);
  });

  it("bounceY is always non-negative during walk", () => {
    for (let i = 0; i <= 60; i++) {
      const npc = makeNpc({ currentAnim: "walk", animProgress: i * 0.1 });
      const rot = computeNpcLimbRotations(npc);
      expect(rot.bounceY).toBeGreaterThanOrEqual(0);
    }
  });

  it("arm rotations stay within maxAngle (0.6 rad from config)", () => {
    for (let i = 0; i <= 60; i++) {
      const npc = makeNpc({ currentAnim: "walk", animProgress: i * 0.1 });
      const rot = computeNpcLimbRotations(npc);
      expect(Math.abs(rot.leftArm)).toBeLessThanOrEqual(0.6 + 1e-10);
      expect(Math.abs(rot.rightArm)).toBeLessThanOrEqual(0.6 + 1e-10);
    }
  });

  it("leg rotations stay within maxAngle (0.5 rad from config)", () => {
    for (let i = 0; i <= 60; i++) {
      const npc = makeNpc({ currentAnim: "walk", animProgress: i * 0.1 });
      const rot = computeNpcLimbRotations(npc);
      expect(Math.abs(rot.leftLeg)).toBeLessThanOrEqual(0.5 + 1e-10);
      expect(Math.abs(rot.rightLeg)).toBeLessThanOrEqual(0.5 + 1e-10);
    }
  });

  it("produces different rotations at different animProgress values", () => {
    const npc1 = makeNpc({ currentAnim: "walk", animProgress: 0.1 });
    const npc2 = makeNpc({ currentAnim: "walk", animProgress: 0.8 });
    const rot1 = computeNpcLimbRotations(npc1);
    const rot2 = computeNpcLimbRotations(npc2);
    expect(rot1.leftArm).not.toBeCloseTo(rot2.leftArm, 5);
  });
});

describe("advanceNpcAnimation (Spec §15)", () => {
  it("advances animProgress during walk", () => {
    const npc = makeNpc({ currentAnim: "walk", animProgress: 0, animSpeed: 1 });
    advanceNpcAnimation(npc, 0.016);
    expect(npc.animProgress).toBeCloseTo(0.016);
  });

  it("scales animProgress by animSpeed", () => {
    const slow = makeNpc({ currentAnim: "walk", animProgress: 0, animSpeed: 0.5 });
    const fast = makeNpc({ currentAnim: "walk", animProgress: 0, animSpeed: 2.0 });
    advanceNpcAnimation(slow, 0.1);
    advanceNpcAnimation(fast, 0.1);
    // fast has 4x animSpeed → 4x more progress than slow
    expect(fast.animProgress).toBeCloseTo(slow.animProgress * 4);
  });

  it("does NOT advance animProgress during idle", () => {
    const npc = makeNpc({ currentAnim: "idle", animProgress: 0, animSpeed: 1 });
    advanceNpcAnimation(npc, 0.016);
    expect(npc.animProgress).toBe(0);
  });

  it("does NOT advance animProgress during talk", () => {
    const npc = makeNpc({ currentAnim: "talk", animProgress: 3.0, animSpeed: 1 });
    advanceNpcAnimation(npc, 0.016);
    expect(npc.animProgress).toBe(3.0);
  });

  it("does NOT advance animProgress during sleep", () => {
    const npc = makeNpc({ currentAnim: "sleep", animProgress: 1.5, animSpeed: 1 });
    advanceNpcAnimation(npc, 0.1);
    expect(npc.animProgress).toBe(1.5);
  });

  it("accumulates progress across multiple frames", () => {
    const npc = makeNpc({ currentAnim: "walk", animProgress: 0, animSpeed: 1 });
    advanceNpcAnimation(npc, 0.016);
    advanceNpcAnimation(npc, 0.016);
    advanceNpcAnimation(npc, 0.016);
    expect(npc.animProgress).toBeCloseTo(0.048);
  });

  it("higher animSpeed produces faster limb oscillation", () => {
    const slow = makeNpc({ currentAnim: "walk", animProgress: 0, animSpeed: 1 });
    const fast = makeNpc({ currentAnim: "walk", animProgress: 0, animSpeed: 3 });
    // Advance both by same dt
    advanceNpcAnimation(slow, 0.1);
    advanceNpcAnimation(fast, 0.1);
    const rotSlow = computeNpcLimbRotations(slow);
    const rotFast = computeNpcLimbRotations(fast);
    // Different progress → different angle (not guaranteed same sign, just different)
    expect(rotFast.leftArm).not.toBeCloseTo(rotSlow.leftArm, 5);
  });
});
