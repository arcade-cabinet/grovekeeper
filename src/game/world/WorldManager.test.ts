import { beforeEach, describe, expect, it } from "vitest";
import type { WorldDefinition } from "./types";
import { WorldManager } from "./WorldManager";

const testWorld: WorldDefinition = {
  id: "test-world",
  name: "Test World",
  version: 1,
  zones: [
    {
      id: "zone-a",
      name: "Zone A",
      type: "grove",
      origin: { x: 0, z: 0 },
      size: { width: 10, height: 10 },
      groundMaterial: "soil",
      plantable: true,
      connections: [
        {
          direction: "east",
          targetZoneId: "zone-b",
          localEntry: { x: 9, z: 5 },
        },
      ],
    },
    {
      id: "zone-b",
      name: "Zone B",
      type: "clearing",
      origin: { x: 12, z: 0 },
      size: { width: 6, height: 8 },
      groundMaterial: "grass",
      tiles: [
        { x: 2, z: 2, type: "water" },
        { x: 3, z: 3, type: "rock" },
      ],
      plantable: true,
      connections: [
        {
          direction: "west",
          targetZoneId: "zone-a",
          localEntry: { x: 0, z: 4 },
        },
      ],
    },
  ],
  playerSpawn: { zoneId: "zone-a", localX: 5, localZ: 5 },
};

describe("WorldManager", () => {
  let mgr: WorldManager;

  beforeEach(() => {
    mgr = new WorldManager();
    // init without scene (scene-dependent methods won't create meshes, but queries still work)
    mgr.init(testWorld, null as never);
  });

  describe("world definition", () => {
    it("stores the world definition", () => {
      expect(mgr.world).toBe(testWorld);
    });

    it("has no loaded zones initially", () => {
      expect(mgr.currentZones).toEqual([]);
    });
  });

  describe("worldToLocal", () => {
    it("converts world coords inside zone-a to local", () => {
      const result = mgr.worldToLocal(3, 7);
      expect(result).toEqual({ zoneId: "zone-a", localX: 3, localZ: 7 });
    });

    it("converts world coords inside zone-b to local", () => {
      const result = mgr.worldToLocal(14, 3);
      expect(result).toEqual({ zoneId: "zone-b", localX: 2, localZ: 3 });
    });

    it("returns null for coords outside all zones", () => {
      expect(mgr.worldToLocal(11, 5)).toBeNull(); // gap between zones
      expect(mgr.worldToLocal(-1, 0)).toBeNull();
      expect(mgr.worldToLocal(20, 0)).toBeNull();
    });
  });

  describe("localToWorld", () => {
    it("converts local coords to world for zone-a", () => {
      expect(mgr.localToWorld("zone-a", 5, 5)).toEqual({ x: 5, z: 5 });
    });

    it("converts local coords to world for zone-b", () => {
      expect(mgr.localToWorld("zone-b", 2, 3)).toEqual({ x: 14, z: 3 });
    });

    it("returns null for unknown zone", () => {
      expect(mgr.localToWorld("nonexistent", 0, 0)).toBeNull();
    });
  });

  describe("getWorldBounds", () => {
    it("returns bounding box of all zones", () => {
      const bounds = mgr.getWorldBounds();
      expect(bounds).toEqual({ minX: 0, minZ: 0, maxX: 18, maxZ: 10 });
    });
  });

  describe("getSpawnPosition", () => {
    it("returns world-space spawn position", () => {
      expect(mgr.getSpawnPosition()).toEqual({ x: 5, z: 5 });
    });
  });

  describe("isInBounds", () => {
    it("returns true for position inside a zone", () => {
      expect(mgr.isInBounds(5, 5)).toBe(true);
      expect(mgr.isInBounds(14, 3)).toBe(true);
    });

    it("returns false for position outside all zones", () => {
      expect(mgr.isInBounds(11, 5)).toBe(false);
    });
  });

  describe("isWalkable", () => {
    it("returns true for normal tiles", () => {
      expect(mgr.isWalkable(0, 0)).toBe(true);
    });

    it("returns false for rock tiles", () => {
      // zone-b origin (12,0) + rock at local (3,3) = world (15,3)
      expect(mgr.isWalkable(15, 3)).toBe(false);
    });

    it("returns false for out-of-bounds", () => {
      expect(mgr.isWalkable(-5, -5)).toBe(false);
    });
  });

  describe("getZoneAt", () => {
    it("returns zone definition at position", () => {
      const zone = mgr.getZoneAt(5, 5);
      expect(zone?.id).toBe("zone-a");
    });

    it("returns null for gap between zones", () => {
      expect(mgr.getZoneAt(11, 5)).toBeNull();
    });
  });

  describe("dispose", () => {
    it("clears world definition", () => {
      mgr.dispose();
      expect(mgr.world).toBeNull();
      expect(mgr.currentZones).toEqual([]);
    });
  });
});
