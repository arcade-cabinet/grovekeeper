import type * as THREE from "three";

// Mock useFrame to capture the callback
type FrameCallback = (state: unknown, delta: number) => void;
const frameCallbacks: FrameCallback[] = [];

jest.mock("@react-three/fiber", () => ({
  useFrame: (cb: FrameCallback) => {
    frameCallbacks.push(cb);
  },
}));

jest.mock("@/config/game/grid.json", () => ({
  playerSpeed: 3,
  defaultSize: 12,
}));

// Mock useRef to return the value directly
jest.mock("react", () => ({
  useRef: (val: unknown) => ({ current: val }),
}));

import { useMovement } from "./useMovement.ts";

function createMockPlayerRef(x = 0, z = 0) {
  const group = {
    position: { x, y: 0, z },
  } as unknown as THREE.Group;
  return { current: group };
}

function getLastFrameCallback(): FrameCallback {
  const cb = frameCallbacks[frameCallbacks.length - 1];
  if (!cb) throw new Error("No frame callback registered");
  return cb;
}

describe("useMovement", () => {
  beforeEach(() => {
    frameCallbacks.length = 0;
  });

  it("does not move when direction is zero", () => {
    const ref = createMockPlayerRef(5, 5);
    useMovement(ref, { x: 0, z: 0 });
    const cb = getLastFrameCallback();

    cb({}, 1 / 60);
    expect(ref.current!.position.x).toBe(5);
    expect(ref.current!.position.z).toBe(5);
  });

  it("moves player by speed * delta in the X direction", () => {
    const ref = createMockPlayerRef(5, 5);
    useMovement(ref, { x: 1, z: 0 });
    const cb = getLastFrameCallback();

    const delta = 0.5;
    cb({}, delta);

    // playerSpeed = 3, so movement = 1 * 3 * 0.5 = 1.5
    expect(ref.current!.position.x).toBeCloseTo(6.5, 5);
    expect(ref.current!.position.z).toBe(5);
  });

  it("moves player by speed * delta in the Z direction", () => {
    const ref = createMockPlayerRef(5, 5);
    useMovement(ref, { x: 0, z: 1 });
    const cb = getLastFrameCallback();

    cb({}, 1.0);

    // movement = 1 * 3 * 1.0 = 3
    expect(ref.current!.position.x).toBe(5);
    expect(ref.current!.position.z).toBeCloseTo(8, 5);
  });

  it("clamps position to maximum world bounds", () => {
    const ref = createMockPlayerRef(11, 11);
    const bounds = { minX: 0, minZ: 0, maxX: 12, maxZ: 12 };
    useMovement(ref, { x: 1, z: 1 }, bounds);
    const cb = getLastFrameCallback();

    cb({}, 10);

    expect(ref.current!.position.x).toBe(12);
    expect(ref.current!.position.z).toBe(12);
  });

  it("clamps position to minimum world bounds", () => {
    const ref = createMockPlayerRef(1, 1);
    const bounds = { minX: 0, minZ: 0, maxX: 12, maxZ: 12 };
    useMovement(ref, { x: -1, z: -1 }, bounds);
    const cb = getLastFrameCallback();

    cb({}, 10);

    expect(ref.current!.position.x).toBe(0);
    expect(ref.current!.position.z).toBe(0);
  });

  it("does nothing when playerRef is null", () => {
    const ref = { current: null };
    useMovement(ref, { x: 1, z: 1 });
    const cb = getLastFrameCallback();

    expect(() => cb({}, 1 / 60)).not.toThrow();
  });

  it("applies diagonal movement correctly", () => {
    const ref = createMockPlayerRef(5, 5);
    const normalized = 1 / Math.SQRT2;
    useMovement(ref, { x: normalized, z: normalized });
    const cb = getLastFrameCallback();

    cb({}, 1.0);

    // movement per axis = (1/sqrt2) * 3 * 1.0
    const expected = 5 + normalized * 3;
    expect(ref.current!.position.x).toBeCloseTo(expected, 5);
    expect(ref.current!.position.z).toBeCloseTo(expected, 5);
  });
});
