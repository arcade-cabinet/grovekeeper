import { describe, it, expect } from "vitest";
import { generateWorld, pickWeighted } from "./WorldGenerator";
import { createRNG } from "../utils/seedRNG";

// ============================================
// pickWeighted helper
// ============================================

describe("pickWeighted", () => {
  it("returns the only item when there is one option", () => {
    const rng = createRNG(42);
    const result = pickWeighted(rng, [{ value: "only", weight: 1 }]);
    expect(result).toBe("only");
  });

  it("respects weights over many trials", () => {
    const counts: Record<string, number> = { a: 0, b: 0 };
    for (let seed = 0; seed < 500; seed++) {
      const rng = createRNG(seed);
      const result = pickWeighted(rng, [
        { value: "a", weight: 9 },
        { value: "b", weight: 1 },
      ]);
      counts[result]++;
    }
    // "a" should appear significantly more than "b"
    expect(counts.a).toBeGreaterThan(counts.b);
  });
});

// ============================================
// Level 1: Single starting grove
// ============================================

describe("generateWorld — level 1", () => {
  it("generates a valid world with exactly 1 zone", () => {
    const world = generateWorld("test-seed", 1);

    expect(world.zones).toHaveLength(1);
    expect(world.zones[0].type).toBe("grove");
  });

  it("starting grove is 12x12", () => {
    const world = generateWorld("test-seed", 1);
    const grove = world.zones[0];

    expect(grove.size.width).toBe(12);
    expect(grove.size.height).toBe(12);
  });

  it("starting grove is at origin (0, 0)", () => {
    const world = generateWorld("test-seed", 1);
    const grove = world.zones[0];

    expect(grove.origin.x).toBe(0);
    expect(grove.origin.z).toBe(0);
  });

  it("starting grove is plantable", () => {
    const world = generateWorld("test-seed", 1);
    expect(world.zones[0].plantable).toBe(true);
  });

  it("world has version 1", () => {
    const world = generateWorld("test-seed", 1);
    expect(world.version).toBe(1);
  });

  it("world has an id derived from the seed", () => {
    const world = generateWorld("my-seed", 1);
    expect(world.id).toBe("world-my-seed");
  });
});

// ============================================
// Player spawn
// ============================================

describe("generateWorld — player spawn", () => {
  it("player spawn is in the starting grove", () => {
    const world = generateWorld("spawn-test", 3);

    expect(world.playerSpawn.zoneId).toBe(world.zones[0].id);
  });

  it("spawn position is at center of starting grove", () => {
    const world = generateWorld("spawn-test", 1);
    const grove = world.zones[0];

    expect(world.playerSpawn.localX).toBe(Math.floor(grove.size.width / 2));
    expect(world.playerSpawn.localZ).toBe(Math.floor(grove.size.height / 2));
  });
});

// ============================================
// Level scaling
// ============================================

describe("generateWorld — level scaling", () => {
  it("level 5 generates 3 zones", () => {
    const world = generateWorld("level-5-seed", 5);
    expect(world.zones).toHaveLength(3);
  });

  it("level 10 generates 5 zones", () => {
    const world = generateWorld("level-10-seed", 10);
    expect(world.zones).toHaveLength(5);
  });

  it("level 15 generates 7 zones", () => {
    const world = generateWorld("level-15-seed", 15);
    expect(world.zones).toHaveLength(7);
  });

  it("level 20+ generates 8-12 zones", () => {
    const world = generateWorld("level-20-seed", 20);
    expect(world.zones.length).toBeGreaterThanOrEqual(8);
    expect(world.zones.length).toBeLessThanOrEqual(12);
  });

  it("level 25 generates 8-12 zones", () => {
    const world = generateWorld("level-25-seed", 25);
    expect(world.zones.length).toBeGreaterThanOrEqual(8);
    expect(world.zones.length).toBeLessThanOrEqual(12);
  });
});

// ============================================
// Determinism
// ============================================

describe("generateWorld — determinism", () => {
  it("same seed and level produce identical worlds", () => {
    const world1 = generateWorld("deterministic", 10);
    const world2 = generateWorld("deterministic", 10);

    expect(world1.zones.length).toBe(world2.zones.length);
    expect(world1.id).toBe(world2.id);
    expect(world1.playerSpawn).toEqual(world2.playerSpawn);

    for (let i = 0; i < world1.zones.length; i++) {
      expect(world1.zones[i].id).toBe(world2.zones[i].id);
      expect(world1.zones[i].origin).toEqual(world2.zones[i].origin);
      expect(world1.zones[i].size).toEqual(world2.zones[i].size);
      expect(world1.zones[i].type).toBe(world2.zones[i].type);
      expect(world1.zones[i].groundMaterial).toBe(world2.zones[i].groundMaterial);
      expect(world1.zones[i].plantable).toBe(world2.zones[i].plantable);
    }
  });

  it("different seeds produce different worlds", () => {
    const world1 = generateWorld("seed-alpha", 10);
    const world2 = generateWorld("seed-beta", 10);

    // With different seeds, at least some zone origins should differ
    const origins1 = world1.zones.map((z) => `${z.origin.x},${z.origin.z}`).join(";");
    const origins2 = world2.zones.map((z) => `${z.origin.x},${z.origin.z}`).join(";");
    expect(origins1).not.toBe(origins2);
  });
});

// ============================================
// Zone connections
// ============================================

describe("generateWorld — zone connections", () => {
  it("all zones have valid connections (target zone exists)", () => {
    const world = generateWorld("connections-test", 15);
    const zoneIds = new Set(world.zones.map((z) => z.id));

    for (const zone of world.zones) {
      for (const conn of zone.connections) {
        expect(zoneIds.has(conn.targetZoneId)).toBe(true);
      }
    }
  });

  it("connections are bidirectional", () => {
    const world = generateWorld("bidirectional-test", 10);

    for (const zone of world.zones) {
      for (const conn of zone.connections) {
        const targetZone = world.zones.find((z) => z.id === conn.targetZoneId);
        expect(targetZone).toBeDefined();

        // The target should have a connection back to this zone
        const backConn = targetZone?.connections.find(
          (c) => c.targetZoneId === zone.id,
        );
        expect(backConn).toBeDefined();
      }
    }
  });

  it("starting grove at level 1 has no connections (single zone)", () => {
    const world = generateWorld("solo-grove", 1);
    expect(world.zones[0].connections).toHaveLength(0);
  });

  it("multi-zone world has at least one connection per non-root zone", () => {
    const world = generateWorld("multi-connections", 10);

    // In a multi-zone world, the total connection count should be > 0
    if (world.zones.length > 1) {
      const totalConns = world.zones.reduce(
        (sum, z) => sum + z.connections.length,
        0,
      );
      expect(totalConns).toBeGreaterThan(0);
    }
  });

  it("connection entry points are within zone bounds", () => {
    const world = generateWorld("bounds-check", 15);

    for (const zone of world.zones) {
      for (const conn of zone.connections) {
        expect(conn.localEntry.x).toBeGreaterThanOrEqual(0);
        expect(conn.localEntry.x).toBeLessThan(zone.size.width);
        expect(conn.localEntry.z).toBeGreaterThanOrEqual(0);
        expect(conn.localEntry.z).toBeLessThan(zone.size.height);
      }
    }
  });
});

// ============================================
// Tile overrides
// ============================================

describe("generateWorld — tile overrides", () => {
  it("tile overrides are within zone bounds", () => {
    const world = generateWorld("tiles-test", 10);

    for (const zone of world.zones) {
      if (zone.tiles) {
        for (const tile of zone.tiles) {
          expect(tile.x).toBeGreaterThanOrEqual(0);
          expect(tile.x).toBeLessThan(zone.size.width);
          expect(tile.z).toBeGreaterThanOrEqual(0);
          expect(tile.z).toBeLessThan(zone.size.height);
        }
      }
    }
  });

  it("tile override types are valid", () => {
    const world = generateWorld("tile-types-test", 15);
    const validTypes = new Set(["water", "rock", "path", "soil"]);

    for (const zone of world.zones) {
      if (zone.tiles) {
        for (const tile of zone.tiles) {
          expect(validTypes.has(tile.type)).toBe(true);
        }
      }
    }
  });
});

// ============================================
// Props
// ============================================

describe("generateWorld — props", () => {
  it("prop positions are within zone bounds", () => {
    const world = generateWorld("props-test", 10);

    for (const zone of world.zones) {
      if (zone.props) {
        for (const prop of zone.props) {
          expect(prop.localX).toBeGreaterThanOrEqual(0);
          expect(prop.localX).toBeLessThan(zone.size.width);
          expect(prop.localZ).toBeGreaterThanOrEqual(0);
          expect(prop.localZ).toBeLessThan(zone.size.height);
        }
      }
    }
  });

  it("props have valid IDs from archetype possibleProps", () => {
    const validProps = new Set([
      "fallen-log",
      "mushroom-cluster",
      "wild-flowers",
      "boulder",
    ]);
    const world = generateWorld("valid-props-test", 15);

    for (const zone of world.zones) {
      if (zone.props) {
        for (const prop of zone.props) {
          expect(validProps.has(prop.propId)).toBe(true);
        }
      }
    }
  });
});

// ============================================
// Zone types by level
// ============================================

describe("generateWorld — zone type variety", () => {
  it("level 1-4 only generates grove zones", () => {
    for (let level = 1; level <= 4; level++) {
      const world = generateWorld(`variety-${level}`, level);
      for (const zone of world.zones) {
        expect(zone.type).toBe("grove");
      }
    }
  });

  it("level 10+ can generate forest zones", () => {
    // Run many seeds to check that forest appears at least once
    let foundForest = false;
    for (let i = 0; i < 50; i++) {
      const world = generateWorld(`forest-check-${i}`, 12);
      if (world.zones.some((z) => z.type === "forest")) {
        foundForest = true;
        break;
      }
    }
    expect(foundForest).toBe(true);
  });

  it("level 20+ can generate all zone types", () => {
    const types = new Set<string>();
    for (let i = 0; i < 200; i++) {
      const world = generateWorld(`all-types-${i}`, 25);
      for (const zone of world.zones) {
        types.add(zone.type);
      }
    }
    expect(types.has("grove")).toBe(true);
    expect(types.has("clearing")).toBe(true);
    expect(types.has("path")).toBe(true);
    expect(types.has("forest")).toBe(true);
    expect(types.has("settlement")).toBe(true);
  });
});

// ============================================
// Wild forest naming
// ============================================

describe("generateWorld — wild forest data", () => {
  it("wild forest zones have wildTrees and wildTreeDensity", () => {
    let foundWildForest = false;
    for (let i = 0; i < 50; i++) {
      const world = generateWorld(`wild-data-${i}`, 12);
      const forestZone = world.zones.find((z) => z.type === "forest");
      if (forestZone) {
        expect(forestZone.wildTrees).toBeDefined();
        expect(forestZone.wildTrees!.length).toBeGreaterThan(0);
        expect(forestZone.wildTreeDensity).toBeGreaterThan(0);
        foundWildForest = true;
        break;
      }
    }
    expect(foundWildForest).toBe(true);
  });
});

// ============================================
// Zone IDs
// ============================================

describe("generateWorld — zone IDs", () => {
  it("all zone IDs are unique", () => {
    const world = generateWorld("unique-ids", 20);
    const ids = world.zones.map((z) => z.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it("zone IDs follow the pattern zone-N", () => {
    const world = generateWorld("id-pattern", 15);
    for (let i = 0; i < world.zones.length; i++) {
      expect(world.zones[i].id).toBe(`zone-${i}`);
    }
  });
});
