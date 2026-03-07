/**
 * Tests for StructureInstances — ECS structure batching via InstancedMesh (Spec §28).
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
  structuresQuery: { entities: [] },
  with: () => ({ entities: [] }),
}));

jest.mock("./StaticInstances", () => ({
  StaticModelInstances: jest.fn(() => null),
  groupByModelPath: jest.fn(() => new Map()),
}));

import { StructureInstances } from "./StructureInstances";

describe("StructureInstances (Spec §28)", () => {
  it("exports StructureInstances as a function component", () => {
    expect(typeof StructureInstances).toBe("function");
  });

  it("has component name StructureInstances", () => {
    expect(StructureInstances.name).toBe("StructureInstances");
  });
});
