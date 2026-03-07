/**
 * Tests for FenceInstances — ECS fence batching via InstancedMesh (Spec §28).
 */

jest.mock("@react-three/drei", () => ({
  useGLTF: jest.fn().mockReturnValue({
    scene: { traverse: jest.fn() },
  }),
}));

jest.mock("@react-three/fiber", () => ({
  useFrame: jest.fn(),
}));

jest.mock("@/game/ecs/world", () => ({
  fencesQuery: { entities: [] },
  with: () => ({ entities: [] }),
}));

jest.mock("./StaticInstances", () => ({
  StaticModelInstances: jest.fn(() => null),
  groupByModelPath: jest.fn(() => new Map()),
}));

import { FenceInstances } from "./FenceInstances.tsx";

describe("FenceInstances (Spec §28)", () => {
  it("exports FenceInstances as a function component", () => {
    expect(typeof FenceInstances).toBe("function");
  });

  it("has component name FenceInstances", () => {
    expect(FenceInstances.name).toBe("FenceInstances");
  });
});
