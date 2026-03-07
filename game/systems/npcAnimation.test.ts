/**
 * Tests for NPC animation system (walk cycle, idle breathing, talk gestures).
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

// ---------------------------------------------------------------------------
// computeNpcLimbRotations — walk cycle (US-043)
// ---------------------------------------------------------------------------

describe("computeNpcLimbRotations walk (Spec §15)", () => {
  it("returns zero walk-limb rotations for idle state", () => {
    const npc = makeNpc({ currentAnim: "idle" });
    const rot = computeNpcLimbRotations(npc);
    expect(rot.leftArm).toBe(0);
    expect(rot.rightArm).toBe(0);
    expect(rot.leftLeg).toBe(0);
    expect(rot.rightLeg).toBe(0);
    expect(rot.bounceY).toBe(0);
  });

  it("returns zero walk-limb rotations for talk state", () => {
    const npc = makeNpc({ currentAnim: "talk", animProgress: 1.5 });
    const rot = computeNpcLimbRotations(npc);
    expect(rot.leftArm).toBe(0);
    expect(rot.rightArm).toBe(0);
    expect(rot.leftLeg).toBe(0);
    expect(rot.rightLeg).toBe(0);
  });

  it("returns zero walk-limb rotations for sleep state", () => {
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

  it("walk returns zero for idle-specific fields", () => {
    const npc = makeNpc({ currentAnim: "walk", animProgress: 0.5 });
    const rot = computeNpcLimbRotations(npc);
    expect(rot.torsoY).toBe(0);
    expect(rot.headSway).toBe(0);
    expect(rot.armGesture).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// computeNpcLimbRotations — idle breathing + head sway (US-044)
// ---------------------------------------------------------------------------

describe("computeNpcLimbRotations idle (Spec §15)", () => {
  it("torsoY is non-zero during idle at non-zero animProgress", () => {
    // t=0.5: sin(0.5 * 1.5) = sin(0.75) ≠ 0
    const npc = makeNpc({ currentAnim: "idle", animProgress: 0.5 });
    const rot = computeNpcLimbRotations(npc);
    expect(rot.torsoY).not.toBe(0);
  });

  it("headSway is non-zero during idle at non-zero animProgress", () => {
    // t=1.0: sin(1.0 * 0.7) = sin(0.7) ≠ 0
    const npc = makeNpc({ currentAnim: "idle", animProgress: 1.0 });
    const rot = computeNpcLimbRotations(npc);
    expect(rot.headSway).not.toBe(0);
  });

  it("torsoY stays within idle bodyBob amplitude (0.02 m)", () => {
    for (let i = 0; i <= 60; i++) {
      const npc = makeNpc({ currentAnim: "idle", animProgress: i * 0.1 });
      const rot = computeNpcLimbRotations(npc);
      expect(Math.abs(rot.torsoY)).toBeLessThanOrEqual(0.02 + 1e-10);
    }
  });

  it("headSway stays within idle headTurn maxAngle (0.08 rad)", () => {
    for (let i = 0; i <= 60; i++) {
      const npc = makeNpc({ currentAnim: "idle", animProgress: i * 0.1 });
      const rot = computeNpcLimbRotations(npc);
      expect(Math.abs(rot.headSway)).toBeLessThanOrEqual(0.08 + 1e-10);
    }
  });

  it("idle does not move walk limbs", () => {
    const npc = makeNpc({ currentAnim: "idle", animProgress: 0.5 });
    const rot = computeNpcLimbRotations(npc);
    expect(rot.leftArm).toBe(0);
    expect(rot.rightArm).toBe(0);
    expect(rot.leftLeg).toBe(0);
    expect(rot.rightLeg).toBe(0);
    expect(rot.bounceY).toBe(0);
    expect(rot.armGesture).toBe(0);
  });

  it("idle torsoY oscillates — can be negative (smooth sine, not abs)", () => {
    // After half a period it should be negative
    const period = (2 * Math.PI) / 1.5; // ~4.19s
    const npc = makeNpc({ currentAnim: "idle", animProgress: period * 0.75 });
    const rot = computeNpcLimbRotations(npc);
    expect(rot.torsoY).toBeLessThan(0);
  });
});

// ---------------------------------------------------------------------------
// computeNpcLimbRotations — talk head nod + arm gesture (US-044)
// ---------------------------------------------------------------------------

describe("computeNpcLimbRotations talk (Spec §15)", () => {
  it("headSway is non-zero during talk at non-zero animProgress", () => {
    // t=0.5: sin(0.5 * 1.0) = sin(0.5) ≠ 0
    const npc = makeNpc({ currentAnim: "talk", animProgress: 0.5 });
    const rot = computeNpcLimbRotations(npc);
    expect(rot.headSway).not.toBe(0);
  });

  it("armGesture is non-zero during talk at non-zero animProgress", () => {
    // t=0.5: sin(0.5 * 1.5) ≠ 0
    const npc = makeNpc({ currentAnim: "talk", animProgress: 0.5 });
    const rot = computeNpcLimbRotations(npc);
    expect(rot.armGesture).not.toBe(0);
  });

  it("torsoY is non-zero during talk at non-zero animProgress", () => {
    // t=0.5: sin(0.5 * 2.0) = sin(1.0) ≠ 0
    const npc = makeNpc({ currentAnim: "talk", animProgress: 0.5 });
    const rot = computeNpcLimbRotations(npc);
    expect(rot.torsoY).not.toBe(0);
  });

  it("talk headSway stays within talk headTurn maxAngle (0.25 rad)", () => {
    for (let i = 0; i <= 60; i++) {
      const npc = makeNpc({ currentAnim: "talk", animProgress: i * 0.1 });
      const rot = computeNpcLimbRotations(npc);
      expect(Math.abs(rot.headSway)).toBeLessThanOrEqual(0.25 + 1e-10);
    }
  });

  it("talk armGesture stays within talk armSwing maxAngle (0.15 rad)", () => {
    for (let i = 0; i <= 60; i++) {
      const npc = makeNpc({ currentAnim: "talk", animProgress: i * 0.1 });
      const rot = computeNpcLimbRotations(npc);
      expect(Math.abs(rot.armGesture)).toBeLessThanOrEqual(0.15 + 1e-10);
    }
  });

  it("talk does not move walk limbs", () => {
    const npc = makeNpc({ currentAnim: "talk", animProgress: 1.5 });
    const rot = computeNpcLimbRotations(npc);
    expect(rot.leftArm).toBe(0);
    expect(rot.rightArm).toBe(0);
    expect(rot.leftLeg).toBe(0);
    expect(rot.rightLeg).toBe(0);
    expect(rot.bounceY).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// advanceNpcAnimation — progress accumulation
// ---------------------------------------------------------------------------

describe("advanceNpcAnimation (Spec §15)", () => {
  it("advances animProgress during walk", () => {
    const npc = makeNpc({ currentAnim: "walk", animProgress: 0, animSpeed: 1 });
    advanceNpcAnimation(npc, 0.016);
    expect(npc.animProgress).toBeCloseTo(0.016);
  });

  it("advances animProgress during idle", () => {
    const npc = makeNpc({ currentAnim: "idle", animProgress: 0, animSpeed: 1 });
    advanceNpcAnimation(npc, 0.016);
    expect(npc.animProgress).toBeCloseTo(0.016);
  });

  it("advances animProgress during talk", () => {
    const npc = makeNpc({ currentAnim: "talk", animProgress: 3.0, animSpeed: 1 });
    advanceNpcAnimation(npc, 0.016);
    expect(npc.animProgress).toBeCloseTo(3.016);
  });

  it("scales animProgress by animSpeed during walk", () => {
    const slow = makeNpc({ currentAnim: "walk", animProgress: 0, animSpeed: 0.5 });
    const fast = makeNpc({ currentAnim: "walk", animProgress: 0, animSpeed: 2.0 });
    advanceNpcAnimation(slow, 0.1);
    advanceNpcAnimation(fast, 0.1);
    // fast has 4x animSpeed → 4x more progress than slow
    expect(fast.animProgress).toBeCloseTo(slow.animProgress * 4);
  });

  it("does NOT advance animProgress during sleep", () => {
    const npc = makeNpc({ currentAnim: "sleep", animProgress: 1.5, animSpeed: 1 });
    advanceNpcAnimation(npc, 0.1);
    expect(npc.animProgress).toBe(1.5);
  });

  it("does NOT advance animProgress during work", () => {
    const npc = makeNpc({ currentAnim: "work", animProgress: 2.0, animSpeed: 1 });
    advanceNpcAnimation(npc, 0.1);
    expect(npc.animProgress).toBe(2.0);
  });

  it("accumulates progress across multiple frames during walk", () => {
    const npc = makeNpc({ currentAnim: "walk", animProgress: 0, animSpeed: 1 });
    advanceNpcAnimation(npc, 0.016);
    advanceNpcAnimation(npc, 0.016);
    advanceNpcAnimation(npc, 0.016);
    expect(npc.animProgress).toBeCloseTo(0.048);
  });

  it("accumulates progress across multiple frames during idle", () => {
    const npc = makeNpc({ currentAnim: "idle", animProgress: 0, animSpeed: 1 });
    advanceNpcAnimation(npc, 0.016);
    advanceNpcAnimation(npc, 0.016);
    expect(npc.animProgress).toBeCloseTo(0.032);
  });

  it("higher animSpeed produces faster limb oscillation during walk", () => {
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
