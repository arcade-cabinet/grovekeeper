/**
 * Tests for PropInstances — ECS prop batching via InstancedMesh (Spec §28).
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
  propsQuery: { entities: [] },
  with: () => ({ entities: [] }),
}));

jest.mock("./StaticInstances", () => ({
  StaticModelInstances: jest.fn(() => null),
  groupByModelPath: jest.fn(() => new Map()),
}));

import { PropInstances } from "./PropInstances";

describe("PropInstances (Spec §28)", () => {
  it("exports PropInstances as a function component", () => {
    expect(typeof PropInstances).toBe("function");
  });

  it("has component name PropInstances", () => {
    expect(PropInstances.name).toBe("PropInstances");
  });
});
