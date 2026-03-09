/**
 * Player teleportation tests.
 * Spec §12.5 (respawn at campfire), §17.6 (fast travel).
 */

import { registerPlayerBody, teleportPlayer, unregisterPlayerBody } from "./teleport.ts";

// Mock the ECS world so we can verify ECS sync without R3F.
// The entities array is mutable so tests can control its contents.
const mockEntities: Array<{ position: { x: number; y: number; z: number } }> = [];

jest.mock("@/game/ecs/world", () => ({
  playerQuery: {
    get entities() {
      return mockEntities;
    },
  },
}));

// Minimal mock for RapierRigidBody
function createMockRigidBody() {
  return {
    setTranslation: jest.fn(),
    setLinvel: jest.fn(),
    translation: jest.fn(() => ({ x: 0, y: 0, z: 0 })),
  };
}

describe("Player Teleport (Spec §12.5, §17.6)", () => {
  beforeEach(() => {
    unregisterPlayerBody();
    mockEntities.length = 0;
    mockEntities.push({ position: { x: 0, y: 0, z: 0 } });
  });

  it("returns false when no rigid body is registered", () => {
    const result = teleportPlayer(10, 1, 20);
    expect(result).toBe(false);
  });

  it("returns true and sets Rapier translation when body is registered", () => {
    const body = createMockRigidBody();
    registerPlayerBody(body as never);

    const result = teleportPlayer(10, 1, 20);

    expect(result).toBe(true);
    expect(body.setTranslation).toHaveBeenCalledWith({ x: 10, y: 1, z: 20 }, true);
  });

  it("zeros linear velocity to prevent carry-over momentum", () => {
    const body = createMockRigidBody();
    registerPlayerBody(body as never);

    teleportPlayer(5, 0, 5);

    expect(body.setLinvel).toHaveBeenCalledWith({ x: 0, y: 0, z: 0 }, true);
  });

  it("syncs ECS player entity position immediately", () => {
    const body = createMockRigidBody();
    registerPlayerBody(body as never);

    teleportPlayer(15, 2, 25);

    expect(mockEntities[0].position).toEqual({ x: 15, y: 2, z: 25 });
  });

  it("returns false after unregisterPlayerBody is called", () => {
    const body = createMockRigidBody();
    registerPlayerBody(body as never);
    unregisterPlayerBody();

    const result = teleportPlayer(10, 1, 20);
    expect(result).toBe(false);
    expect(body.setTranslation).not.toHaveBeenCalled();
  });
});
