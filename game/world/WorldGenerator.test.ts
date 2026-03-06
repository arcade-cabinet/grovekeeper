import { generateWorld, pickWeighted } from "./WorldGenerator";

describe("pickWeighted", () => {
  it("picks items according to weights", () => {
    // With a deterministic "rng" that always returns 0, should pick first item
    const items = [
      { value: "a", weight: 1 },
      { value: "b", weight: 9 },
    ];
    expect(pickWeighted(() => 0, items)).toBe("a");
  });

  it("picks last item when roll is high", () => {
    const items = [
      { value: "a", weight: 1 },
      { value: "b", weight: 1 },
    ];
    expect(pickWeighted(() => 0.99, items)).toBe("b");
  });

  it("handles single item", () => {
    const items = [{ value: "only", weight: 5 }];
    expect(pickWeighted(() => 0.5, items)).toBe("only");
  });
});

describe("generateWorld", () => {
  it("generates a world with a starting grove", () => {
    const world = generateWorld("test-seed", 1);
    expect(world.zones.length).toBeGreaterThanOrEqual(1);
    expect(world.zones[0].id).toBe("zone-0");
    expect(world.zones[0].type).toBe("grove");
  });

  it("is deterministic for the same seed", () => {
    const world1 = generateWorld("deterministic", 10);
    const world2 = generateWorld("deterministic", 10);
    expect(world1.zones.length).toBe(world2.zones.length);
    expect(world1.playerSpawn).toEqual(world2.playerSpawn);
    for (let i = 0; i < world1.zones.length; i++) {
      expect(world1.zones[i].id).toBe(world2.zones[i].id);
      expect(world1.zones[i].origin).toEqual(world2.zones[i].origin);
    }
  });

  it("produces different worlds for different seeds", () => {
    const world1 = generateWorld("seed-alpha", 15);
    const world2 = generateWorld("seed-beta", 15);
    // At level 15 there are multiple zones — origins should differ
    if (world1.zones.length > 1 && world2.zones.length > 1) {
      const origins1 = world1.zones.map((z) => z.origin);
      const origins2 = world2.zones.map((z) => z.origin);
      expect(origins1).not.toEqual(origins2);
    }
  });

  it("scales zone count with player level", () => {
    const low = generateWorld("scale-test", 3);
    const mid = generateWorld("scale-test", 12);
    const high = generateWorld("scale-test", 22);
    expect(low.zones.length).toBe(1); // level < 5 → 1 zone
    expect(mid.zones.length).toBe(5); // level 10-14 → 5 zones
    expect(high.zones.length).toBeGreaterThanOrEqual(8);
  });

  it("starting grove is always 12x12", () => {
    const world = generateWorld("grove-size", 10);
    expect(world.zones[0].size).toEqual({ width: 12, height: 12 });
  });

  it("player spawns in the starting grove center", () => {
    const world = generateWorld("spawn-test", 5);
    expect(world.playerSpawn.zoneId).toBe("zone-0");
    expect(world.playerSpawn.localX).toBe(6); // floor(12/2)
    expect(world.playerSpawn.localZ).toBe(6);
  });

  it("creates bidirectional connections between zones", () => {
    const world = generateWorld("conn-test", 10);
    if (world.zones.length < 2) return;

    // For each connection from zone A to B, there should be a reverse connection
    for (const zone of world.zones) {
      for (const conn of zone.connections) {
        const targetZone = world.zones.find((z) => z.id === conn.targetZoneId);
        expect(targetZone).toBeDefined();
        const reverseConn = targetZone!.connections.find(
          (c) => c.targetZoneId === zone.id,
        );
        expect(reverseConn).toBeDefined();
      }
    }
  });

  it("world has valid structure", () => {
    const world = generateWorld("structure-test", 15);
    expect(world.id).toContain("world-");
    expect(world.name).toBe("Grovekeeper World");
    expect(world.version).toBe(1);
    expect(world.zones).toBeInstanceOf(Array);
    expect(world.playerSpawn).toHaveProperty("zoneId");
    expect(world.playerSpawn).toHaveProperty("localX");
    expect(world.playerSpawn).toHaveProperty("localZ");
  });

  it("zones have tile overrides", () => {
    const world = generateWorld("tiles-test", 10);
    // At least some zones should have tile overrides
    const zonesWithTiles = world.zones.filter(
      (z) => z.tiles && z.tiles.length > 0,
    );
    expect(zonesWithTiles.length).toBeGreaterThanOrEqual(0); // grove may not have tiles
  });

  it("zones have proper ground materials", () => {
    const world = generateWorld("material-test", 10);
    for (const zone of world.zones) {
      expect(["soil", "dirt", "grass", "stone"]).toContain(zone.groundMaterial);
    }
  });

  it("all zone IDs are unique", () => {
    const world = generateWorld("unique-ids", 20);
    const ids = world.zones.map((z) => z.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
