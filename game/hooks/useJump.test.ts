/**
 * Tests for useJump — space key jump with ground detection raycast (Spec §9).
 *
 * isGrounded is tested as a pure function with mock body/world/rapier args.
 * useJump is smoke-tested only (requires R3F + Rapier context for frame execution).
 */

jest.mock("@react-three/rapier", () => ({
  useRapier: jest.fn().mockReturnValue({
    world: { castRay: jest.fn() },
    rapier: {
      Ray: jest.fn().mockImplementation((origin, dir) => ({ origin, dir })),
    },
  }),
}));

jest.mock("@react-three/fiber", () => ({
  useFrame: jest.fn(),
}));

import { isGrounded, useJump } from "./useJump";
import type { RapierRigidBody } from "@react-three/rapier";

/** Minimal RapierRigidBody mock with translation at given y. */
function makeBody(y: number): RapierRigidBody {
  return {
    translation: jest.fn().mockReturnValue({ x: 0, y, z: 0 }),
    applyImpulse: jest.fn(),
  } as unknown as RapierRigidBody;
}

/** Minimal Rapier world mock — hit controls castRay return value. */
function makeWorld(hit: { toi: number } | null) {
  return { castRay: jest.fn().mockReturnValue(hit) };
}

/** Minimal Rapier module mock with recordable Ray constructor. */
function makeRapier() {
  return {
    Ray: jest.fn().mockImplementation((origin, dir) => ({ origin, dir })),
  };
}

describe("isGrounded (Spec §9)", () => {
  it("returns true when castRay reports a hit (grounded)", () => {
    const body = makeBody(0.9);
    const world = makeWorld({ toi: 0.05 });
    const rapier = makeRapier();

    expect(isGrounded(body, world as never, rapier as never)).toBe(true);
  });

  it("returns false when castRay returns null (airborne)", () => {
    const body = makeBody(5.0);
    const world = makeWorld(null);
    const rapier = makeRapier();

    expect(isGrounded(body, world as never, rapier as never)).toBe(false);
  });

  it("casts ray from just below the capsule bottom", () => {
    // Standing body: center y=0.9, capsule bottom at y=0, ray start at y≈-0.01
    const body = makeBody(0.9);
    const world = makeWorld(null);
    const rapier = makeRapier();

    isGrounded(body, world as never, rapier as never);

    const [[rayOrigin]] = (rapier.Ray as jest.Mock).mock.calls;
    // capsuleHeight/2 = 0.9 → rayStart.y = 0.9 - 0.9 - 0.01 = -0.01
    expect(rayOrigin.y).toBeCloseTo(-0.01);
    expect(rayOrigin.x).toBeCloseTo(0);
    expect(rayOrigin.z).toBeCloseTo(0);
  });

  it("casts ray straight down (direction y = -1)", () => {
    const body = makeBody(0.9);
    const world = makeWorld(null);
    const rapier = makeRapier();

    isGrounded(body, world as never, rapier as never);

    const [, rayDir] = (rapier.Ray as jest.Mock).mock.calls[0];
    expect(rayDir).toEqual({ x: 0, y: -1, z: 0 });
  });

  it("passes solid=true to castRay so ground inside origin counts as hit", () => {
    const body = makeBody(0.9);
    const world = makeWorld({ toi: 0 });
    const rapier = makeRapier();

    isGrounded(body, world as never, rapier as never);

    const castRayCall = (world.castRay as jest.Mock).mock.calls[0];
    expect(castRayCall[2]).toBe(true); // third arg is `solid`
  });
});

describe("useJump (Spec §9)", () => {
  it("exports useJump as a function", () => {
    expect(typeof useJump).toBe("function");
  });
});
