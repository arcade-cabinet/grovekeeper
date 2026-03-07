/**
 * Tests for PlayerCapsule physics body (Spec §9).
 *
 * Tests exported constants and module structure without rendering
 * (R3F / Rapier require WebGL context, mocked here).
 */

jest.mock("@react-three/rapier", () => ({
  RigidBody: jest.fn(),
  CapsuleCollider: jest.fn(),
}));

import {
  CAPSULE_HALF_HEIGHT,
  CAPSULE_HEIGHT,
  CAPSULE_RADIUS,
  PlayerCapsule,
} from "./PlayerCapsule";

describe("PlayerCapsule (Spec §9)", () => {
  it("exports CAPSULE_HEIGHT as 1.8m (full standing height)", () => {
    expect(CAPSULE_HEIGHT).toBe(1.8);
  });

  it("exports CAPSULE_RADIUS as 0.3m", () => {
    expect(CAPSULE_RADIUS).toBe(0.3);
  });

  it("computes CAPSULE_HALF_HEIGHT correctly for Rapier CapsuleCollider", () => {
    // Rapier's halfHeight = (totalHeight - 2*radius) / 2
    expect(CAPSULE_HALF_HEIGHT).toBeCloseTo(0.6);
    // Verify: 2 * radius + 2 * halfHeight == total height
    expect(2 * CAPSULE_RADIUS + 2 * CAPSULE_HALF_HEIGHT).toBeCloseTo(CAPSULE_HEIGHT);
  });

  it("exports PlayerCapsule as a function component", () => {
    expect(typeof PlayerCapsule).toBe("function");
  });
});
