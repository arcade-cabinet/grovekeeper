/**
 * Tests for FPSCamera first-person camera component (Spec §9).
 *
 * Tests exported constants and module structure without rendering
 * (R3F / drei require WebGL context, mocked here).
 */

jest.mock("@react-three/drei", () => ({
  PerspectiveCamera: jest.fn(),
}));

jest.mock("@react-three/fiber", () => ({
  useFrame: jest.fn(),
}));

jest.mock("three", () => ({
  PerspectiveCamera: jest.fn(),
  Vector3: jest.fn().mockImplementation((x = 0, y = 0, z = 0) => ({ x, y, z, copy: jest.fn(), set: jest.fn() })),
}));

jest.mock("@/game/ecs/world", () => ({
  playerQuery: { entities: [] },
}));

jest.mock("@/game/hooks/useMouseLook", () => ({
  useMouseLook: jest.fn(),
}));

import { EYE_HEIGHT, FPSCamera, getCameraPosition } from "./FPSCamera";

describe("FPSCamera (Spec §9)", () => {
  it("exports EYE_HEIGHT as 1.6m above ground", () => {
    expect(EYE_HEIGHT).toBe(1.6);
  });

  it("exports FPSCamera as a function component", () => {
    expect(typeof FPSCamera).toBe("function");
  });
});

describe("getCameraPosition (Spec §9)", () => {
  const DEFAULT_POS = { x: 0, y: EYE_HEIGHT, z: 0 };

  it("returns player x position unchanged", () => {
    const result = getCameraPosition([{ position: { x: 7, y: 0, z: 0 } }], EYE_HEIGHT, DEFAULT_POS);
    expect(result.x).toBe(7);
  });

  it("returns player y offset by eye height", () => {
    const result = getCameraPosition([{ position: { x: 0, y: 2, z: 0 } }], EYE_HEIGHT, DEFAULT_POS);
    expect(result.y).toBeCloseTo(2 + EYE_HEIGHT);
  });

  it("returns player z position unchanged", () => {
    const result = getCameraPosition([{ position: { x: 0, y: 0, z: -5 } }], EYE_HEIGHT, DEFAULT_POS);
    expect(result.z).toBe(-5);
  });

  it("returns eye height as y when no player entity exists", () => {
    const result = getCameraPosition([], EYE_HEIGHT, DEFAULT_POS);
    expect(result.y).toBe(EYE_HEIGHT);
    expect(result.x).toBe(0);
    expect(result.z).toBe(0);
  });

  it("handles negative player coordinates correctly", () => {
    const result = getCameraPosition([{ position: { x: -3, y: -1, z: -8 } }], EYE_HEIGHT, DEFAULT_POS);
    expect(result.x).toBe(-3);
    expect(result.y).toBeCloseTo(-1 + EYE_HEIGHT);
    expect(result.z).toBe(-8);
  });

  it("uses first entity when multiple player entities exist", () => {
    const entities = [
      { position: { x: 1, y: 0, z: 2 } },
      { position: { x: 99, y: 99, z: 99 } },
    ];
    const result = getCameraPosition(entities, EYE_HEIGHT, DEFAULT_POS);
    expect(result.x).toBe(1);
    expect(result.z).toBe(2);
  });
});
