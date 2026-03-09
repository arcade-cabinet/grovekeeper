import { world } from "@/game/ecs/world";
import type { ZoneDefinition } from "./types.ts";
import { loadZoneEntities, unloadZoneEntities } from "./ZoneLoader.ts";

// Helper to create a minimal zone definition
function makeZone(overrides: Partial<ZoneDefinition> = {}): ZoneDefinition {
  return {
    id: "test-zone",
    name: "Test Zone",
    type: "grove",
    origin: { x: 0, z: 0 },
    size: { width: 4, height: 4 },
    groundMaterial: "grass",
    plantable: true,
    connections: [],
    ...overrides,
  };
}

// Clean up all entities between tests
afterEach(() => {
  for (const entity of [...world.entities]) {
    world.remove(entity);
  }
});

describe("loadZoneEntities", () => {
  it("creates grid cell entities for all tiles", () => {
    const zone = makeZone({ size: { width: 3, height: 3 } });
    const entities = loadZoneEntities(zone);
    // 3x3 = 9 grid cells
    const cellEntities = entities.filter((e) => e.gridCell);
    expect(cellEntities.length).toBe(9);
  });

  it("applies tile overrides", () => {
    const zone = makeZone({
      size: { width: 4, height: 4 },
      tiles: [
        { x: 0, z: 0, type: "water" },
        { x: 1, z: 1, type: "rock" },
      ],
    });
    const entities = loadZoneEntities(zone);
    const waterCells = entities.filter((e) => e.gridCell?.type === "water");
    const rockCells = entities.filter((e) => e.gridCell?.type === "rock");
    expect(waterCells.length).toBe(1);
    expect(rockCells.length).toBe(1);
  });

  it("sets default cell type from ground material", () => {
    const zone = makeZone({
      size: { width: 2, height: 2 },
      groundMaterial: "stone",
    });
    const entities = loadZoneEntities(zone);
    const pathCells = entities.filter((e) => e.gridCell?.type === "path");
    // stone maps to "path" — all 4 cells should be path
    expect(pathCells.length).toBe(4);
  });

  it("does not duplicate existing cells", () => {
    const zone = makeZone({ size: { width: 2, height: 2 } });
    const first = loadZoneEntities(zone);
    const second = loadZoneEntities(zone);
    // Second call should create 0 new cells since they already exist
    const secondCells = second.filter((e) => e.gridCell);
    expect(secondCells.length).toBe(0);
    // But first should have created 4
    const firstCells = first.filter((e) => e.gridCell);
    expect(firstCells.length).toBe(4);
  });

  it("uses zone origin as offset for grid positions", () => {
    const zone = makeZone({
      size: { width: 2, height: 2 },
      origin: { x: 10, z: 20 },
    });
    const entities = loadZoneEntities(zone);
    const positions = entities
      .filter((e) => e.gridCell)
      .map((e) => ({ x: e.gridCell!.gridX, z: e.gridCell!.gridZ }));
    expect(positions).toContainEqual({ x: 10, z: 20 });
    expect(positions).toContainEqual({ x: 11, z: 21 });
  });

  it("returns all created entities", () => {
    const zone = makeZone({ size: { width: 2, height: 2 } });
    const entities = loadZoneEntities(zone);
    expect(entities.length).toBeGreaterThanOrEqual(4);
    // All returned entities should exist in the ECS world
    for (const entity of entities) {
      expect(world.entities).toContain(entity);
    }
  });
});

describe("unloadZoneEntities", () => {
  it("removes all provided entities from the world", () => {
    const zone = makeZone({ size: { width: 2, height: 2 } });
    const entities = loadZoneEntities(zone);
    expect(world.entities.length).toBeGreaterThan(0);

    unloadZoneEntities(entities);
    // All created entities should be removed
    for (const entity of entities) {
      expect(world.entities).not.toContain(entity);
    }
  });

  it("handles empty array gracefully", () => {
    expect(() => unloadZoneEntities([])).not.toThrow();
  });
});
