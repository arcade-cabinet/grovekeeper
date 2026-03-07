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

import { EYE_HEIGHT, FPSCamera } from "./FPSCamera";

describe("FPSCamera (Spec §9)", () => {
  it("exports EYE_HEIGHT as 1.6m above ground", () => {
    expect(EYE_HEIGHT).toBe(1.6);
  });

  it("exports FPSCamera as a function component", () => {
    expect(typeof FPSCamera).toBe("function");
  });
});
