/**
 * Tests for usePhysicsMovement — WASD velocity applied to Rapier capsule (Spec §23).
 *
 * rotateByYaw is a pure function and tested without mocks.
 * usePhysicsMovement itself is exported as a hook (smoke test only — R3F requires
 * WebGL context for frame execution).
 */

jest.mock("@react-three/fiber", () => ({
  useFrame: jest.fn(),
}));

jest.mock("three", () => ({
  Vector3: jest.fn().mockImplementation((x = 0, y = 0, z = 0) => ({
    x,
    y,
    z,
    set: jest.fn(),
    normalize: jest.fn().mockReturnThis(),
  })),
}));

import { rotateByYaw, usePhysicsMovement } from "./usePhysicsMovement";

describe("rotateByYaw (Spec §23)", () => {
  it("maps W-forward to -Z world at yaw=0 (camera faces -Z)", () => {
    // W pressed = input {x:0, z:1}
    const result = rotateByYaw({ x: 0, z: 1 }, 0);
    expect(result.x).toBeCloseTo(0);
    expect(result.z).toBeCloseTo(-1);
  });

  it("maps D-strafe to +X world at yaw=0", () => {
    // D pressed = input {x:1, z:0}
    const result = rotateByYaw({ x: 1, z: 0 }, 0);
    expect(result.x).toBeCloseTo(1);
    expect(result.z).toBeCloseTo(0);
  });

  it("maps W-forward to -X world at yaw=π/2 (camera faces -X)", () => {
    const result = rotateByYaw({ x: 0, z: 1 }, Math.PI / 2);
    expect(result.x).toBeCloseTo(-1);
    expect(result.z).toBeCloseTo(0);
  });

  it("maps W-forward to +Z world at yaw=π (camera faces +Z, 180° turn)", () => {
    const result = rotateByYaw({ x: 0, z: 1 }, Math.PI);
    expect(result.x).toBeCloseTo(0);
    expect(result.z).toBeCloseTo(1);
  });

  it("returns zero vector when input is zero regardless of yaw", () => {
    const result = rotateByYaw({ x: 0, z: 0 }, Math.PI / 3);
    expect(result.x).toBeCloseTo(0);
    expect(result.z).toBeCloseTo(0);
  });

  it("preserves magnitude 1 for unit input across arbitrary yaw", () => {
    const yaw = 1.23; // arbitrary
    const result = rotateByYaw({ x: 0, z: 1 }, yaw);
    const mag = Math.sqrt(result.x * result.x + result.z * result.z);
    expect(mag).toBeCloseTo(1);
  });
});

describe("usePhysicsMovement (Spec §23)", () => {
  it("exports usePhysicsMovement as a function", () => {
    expect(typeof usePhysicsMovement).toBe("function");
  });
});
