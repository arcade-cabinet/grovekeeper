/**
 * Tests for ambient particle emitters system (Spec §36.1).
 *
 * Validates:
 *   - Firefly condition: night hours + water proximity
 *   - Pollen condition:  spring/summer seasons
 *   - Leaf condition:    autumn + wind speed threshold
 *   - Emitter builders produce correct ParticleEmitterComponent shapes
 *   - tickAmbientParticles: spawn/despawn lifecycle per chunk
 */

import { World } from "miniplex";
import {
  isNightTime,
  isNearWater,
  isPollenSeason,
  isLeafCondition,
  buildFireflyEmitter,
  buildPollenEmitter,
  buildLeavesEmitter,
  initAmbientParticlesState,
  tickAmbientParticles,
  FIREFLY_WATER_PROXIMITY_RADIUS,
  FIREFLY_NIGHT_START,
  FIREFLY_NIGHT_END,
  LEAVES_MIN_WIND_SPEED,
  type WaterRef,
  type ActiveChunk,
  type AmbientEntity,
  type AmbientParticlesState,
} from "./ambientParticles";

// ── Helpers ───────────────────────────────────────────────────────────────────

const makeWaterRef = (x: number, z: number): WaterRef => ({
  position: { x, z },
});

const makeChunk = (key: string, x: number, z: number): ActiveChunk => ({
  chunkKey: key,
  worldX: x,
  worldZ: z,
});

// ── isNightTime ───────────────────────────────────────────────────────────────

describe("isNightTime (Spec §36.1 firefly condition)", () => {
  it("returns true at FIREFLY_NIGHT_START hour (start of night)", () => {
    expect(isNightTime(FIREFLY_NIGHT_START)).toBe(true);
  });

  it("returns false one hour before night start", () => {
    expect(isNightTime(FIREFLY_NIGHT_START - 1)).toBe(false);
  });

  it("returns true just before midnight (23:00)", () => {
    expect(isNightTime(23)).toBe(true);
  });

  it("returns true at midnight (0:00)", () => {
    expect(isNightTime(0)).toBe(true);
  });

  it("returns true just before night end (3:59 ~ hour < NIGHT_END)", () => {
    expect(isNightTime(FIREFLY_NIGHT_END - 1)).toBe(true);
  });

  it("returns false at FIREFLY_NIGHT_END hour (end of night window)", () => {
    expect(isNightTime(FIREFLY_NIGHT_END)).toBe(false);
  });

  it("returns false at noon", () => {
    expect(isNightTime(12)).toBe(false);
  });
});

// ── isNearWater ───────────────────────────────────────────────────────────────

describe("isNearWater (Spec §36.1 firefly water proximity)", () => {
  const pond = makeWaterRef(0, 0);

  it("returns true when chunk center is exactly on a water body", () => {
    expect(isNearWater(0, 0, [pond])).toBe(true);
  });

  it("returns true within FIREFLY_WATER_PROXIMITY_RADIUS", () => {
    const r = FIREFLY_WATER_PROXIMITY_RADIUS - 1;
    expect(isNearWater(r, 0, [pond])).toBe(true);
  });

  it("returns true exactly at FIREFLY_WATER_PROXIMITY_RADIUS (boundary)", () => {
    expect(isNearWater(FIREFLY_WATER_PROXIMITY_RADIUS, 0, [pond])).toBe(true);
  });

  it("returns false just beyond FIREFLY_WATER_PROXIMITY_RADIUS", () => {
    const r = FIREFLY_WATER_PROXIMITY_RADIUS + 0.1;
    expect(isNearWater(r, 0, [pond])).toBe(false);
  });

  it("returns false when no water bodies", () => {
    expect(isNearWater(0, 0, [])).toBe(false);
  });

  it("detects proximity to second water body when first is far", () => {
    const far = makeWaterRef(100, 100);
    expect(isNearWater(100, 100, [pond, far])).toBe(true);
  });

  it("uses 2D distance (ignores Y axis)", () => {
    // X/Z are what matter — chunk at exact radius diagonally
    const diag = FIREFLY_WATER_PROXIMITY_RADIUS / Math.sqrt(2);
    expect(isNearWater(diag, diag, [pond])).toBe(true);
  });
});

// ── isPollenSeason ────────────────────────────────────────────────────────────

describe("isPollenSeason (Spec §36.1 pollen condition)", () => {
  it("returns true for spring", () => {
    expect(isPollenSeason("spring")).toBe(true);
  });

  it("returns true for summer", () => {
    expect(isPollenSeason("summer")).toBe(true);
  });

  it("returns false for autumn", () => {
    expect(isPollenSeason("autumn")).toBe(false);
  });

  it("returns false for winter", () => {
    expect(isPollenSeason("winter")).toBe(false);
  });
});

// ── isLeafCondition ───────────────────────────────────────────────────────────

describe("isLeafCondition (Spec §36.1 leaves condition)", () => {
  it("returns true for autumn with sufficient wind", () => {
    expect(isLeafCondition("autumn", LEAVES_MIN_WIND_SPEED)).toBe(true);
  });

  it("returns true for autumn with wind above threshold", () => {
    expect(isLeafCondition("autumn", LEAVES_MIN_WIND_SPEED + 1)).toBe(true);
  });

  it("returns false for autumn with insufficient wind", () => {
    expect(isLeafCondition("autumn", LEAVES_MIN_WIND_SPEED - 0.1)).toBe(false);
  });

  it("returns false for spring regardless of wind", () => {
    expect(isLeafCondition("spring", 5.0)).toBe(false);
  });

  it("returns false for summer regardless of wind", () => {
    expect(isLeafCondition("summer", 5.0)).toBe(false);
  });

  it("returns false for winter regardless of wind", () => {
    expect(isLeafCondition("winter", 5.0)).toBe(false);
  });
});

// ── buildFireflyEmitter ───────────────────────────────────────────────────────

describe("buildFireflyEmitter (Spec §36.1)", () => {
  const emitter = buildFireflyEmitter();

  it('has particleType "fireflies"', () => {
    expect(emitter.particleType).toBe("fireflies");
  });

  it("has negative gravity (particles float upward slightly)", () => {
    expect(emitter.gravity).toBeLessThan(0);
  });

  it("is NOT wind-affected per spec §36.1", () => {
    expect(emitter.windAffected).toBe(false);
  });

  it("has maxParticles 30 per spec §36.1", () => {
    expect(emitter.maxParticles).toBe(30);
  });

  it("is active on creation", () => {
    expect(emitter.active).toBe(true);
  });

  it("has positive emissionRadius", () => {
    expect(emitter.emissionRadius).toBeGreaterThan(0);
  });
});

// ── buildPollenEmitter ────────────────────────────────────────────────────────

describe("buildPollenEmitter (Spec §36.1)", () => {
  const emitter = buildPollenEmitter();

  it('has particleType "pollen"', () => {
    expect(emitter.particleType).toBe("pollen");
  });

  it("has very slight negative gravity (drifts upward gently)", () => {
    expect(emitter.gravity).toBeLessThan(0);
  });

  it("is wind-affected per spec §36.1", () => {
    expect(emitter.windAffected).toBe(true);
  });

  it("has maxParticles 40 per spec §36.1", () => {
    expect(emitter.maxParticles).toBe(40);
  });

  it("is active on creation", () => {
    expect(emitter.active).toBe(true);
  });
});

// ── buildLeavesEmitter ────────────────────────────────────────────────────────

describe("buildLeavesEmitter (Spec §36.1)", () => {
  const emitter = buildLeavesEmitter();

  it('has particleType "leaves"', () => {
    expect(emitter.particleType).toBe("leaves");
  });

  it("has positive gravity (leaves fall downward)", () => {
    expect(emitter.gravity).toBeGreaterThan(0);
  });

  it("is wind-affected per spec §36.1", () => {
    expect(emitter.windAffected).toBe(true);
  });

  it("has maxParticles 50 per spec §36.1", () => {
    expect(emitter.maxParticles).toBe(50);
  });

  it("is active on creation", () => {
    expect(emitter.active).toBe(true);
  });
});

// ── tickAmbientParticles ──────────────────────────────────────────────────────

describe("tickAmbientParticles (Spec §36.1)", () => {
  let world: World<AmbientEntity>;
  let state: AmbientParticlesState;
  const pond = makeWaterRef(0, 0);
  const chunkAtPond = makeChunk("0,0", 0, 0);

  // Night conditions
  const NIGHT_HOUR = FIREFLY_NIGHT_START;
  const DAY_HOUR = 12;
  const SPRING = "spring";
  const SUMMER = "summer";
  const AUTUMN = "autumn";
  const WINTER = "winter";
  const HIGH_WIND = LEAVES_MIN_WIND_SPEED + 1;
  const NO_WIND = 0;

  beforeEach(() => {
    world = new World<AmbientEntity>();
    state = initAmbientParticlesState();
  });

  // ── Fireflies ──────────────────────────────────────────────────────────────

  describe("firefly emitters", () => {
    it("spawns firefly emitter at night near water", () => {
      tickAmbientParticles(world, [chunkAtPond], state, NIGHT_HOUR, SPRING, NO_WIND, [pond]);

      const set = state.emitters.get("0,0");
      expect(set?.fireflyEntity).not.toBeNull();
      expect(set?.fireflyEntity?.particleEmitter?.particleType).toBe("fireflies");
    });

    it("does NOT spawn firefly emitter during daytime", () => {
      tickAmbientParticles(world, [chunkAtPond], state, DAY_HOUR, SPRING, NO_WIND, [pond]);

      expect(state.emitters.get("0,0")?.fireflyEntity).toBeNull();
    });

    it("does NOT spawn firefly emitter at night without water nearby", () => {
      const farChunk = makeChunk("10,10", 100, 100); // far from pond at (0,0)
      tickAmbientParticles(world, [farChunk], state, NIGHT_HOUR, SPRING, NO_WIND, [pond]);

      expect(state.emitters.get("10,10")?.fireflyEntity).toBeNull();
    });

    it("despawns firefly emitter when night ends", () => {
      // Night: spawn
      tickAmbientParticles(world, [chunkAtPond], state, NIGHT_HOUR, SPRING, NO_WIND, [pond]);
      expect(state.emitters.get("0,0")?.fireflyEntity).not.toBeNull();

      // Day: despawn
      tickAmbientParticles(world, [chunkAtPond], state, DAY_HOUR, SPRING, NO_WIND, [pond]);
      expect(state.emitters.get("0,0")?.fireflyEntity).toBeNull();
    });

    it("does not re-create firefly emitter if already active", () => {
      tickAmbientParticles(world, [chunkAtPond], state, NIGHT_HOUR, SPRING, NO_WIND, [pond]);
      const firstRef = state.emitters.get("0,0")?.fireflyEntity;

      tickAmbientParticles(world, [chunkAtPond], state, NIGHT_HOUR, SPRING, NO_WIND, [pond]);
      expect(state.emitters.get("0,0")?.fireflyEntity).toBe(firstRef);
    });

    it("positions firefly emitter at chunk center", () => {
      const chunk = makeChunk("2,3", 32, 48);
      tickAmbientParticles(world, [chunk], state, NIGHT_HOUR, SPRING, NO_WIND, [makeWaterRef(32, 48)]);

      const entity = state.emitters.get("2,3")?.fireflyEntity;
      expect(entity?.position?.x).toBe(32);
      expect(entity?.position?.z).toBe(48);
    });
  });

  // ── Pollen ─────────────────────────────────────────────────────────────────

  describe("pollen emitters", () => {
    it("spawns pollen emitter in spring", () => {
      tickAmbientParticles(world, [chunkAtPond], state, DAY_HOUR, SPRING, NO_WIND, []);

      expect(state.emitters.get("0,0")?.pollenEntity?.particleEmitter?.particleType).toBe("pollen");
    });

    it("spawns pollen emitter in summer", () => {
      tickAmbientParticles(world, [chunkAtPond], state, DAY_HOUR, SUMMER, NO_WIND, []);

      expect(state.emitters.get("0,0")?.pollenEntity?.particleEmitter?.particleType).toBe("pollen");
    });

    it("does NOT spawn pollen in autumn", () => {
      tickAmbientParticles(world, [chunkAtPond], state, DAY_HOUR, AUTUMN, NO_WIND, []);

      expect(state.emitters.get("0,0")?.pollenEntity).toBeNull();
    });

    it("does NOT spawn pollen in winter", () => {
      tickAmbientParticles(world, [chunkAtPond], state, DAY_HOUR, WINTER, NO_WIND, []);

      expect(state.emitters.get("0,0")?.pollenEntity).toBeNull();
    });

    it("despawns pollen emitter when season changes to autumn", () => {
      // Spring: spawn
      tickAmbientParticles(world, [chunkAtPond], state, DAY_HOUR, SPRING, NO_WIND, []);
      expect(state.emitters.get("0,0")?.pollenEntity).not.toBeNull();

      // Autumn: despawn
      tickAmbientParticles(world, [chunkAtPond], state, DAY_HOUR, AUTUMN, NO_WIND, []);
      expect(state.emitters.get("0,0")?.pollenEntity).toBeNull();
    });
  });

  // ── Leaves ─────────────────────────────────────────────────────────────────

  describe("leaves emitters", () => {
    it("spawns leaves emitter in autumn with wind", () => {
      tickAmbientParticles(world, [chunkAtPond], state, DAY_HOUR, AUTUMN, HIGH_WIND, []);

      expect(state.emitters.get("0,0")?.leavesEntity?.particleEmitter?.particleType).toBe("leaves");
    });

    it("does NOT spawn leaves emitter in autumn without wind", () => {
      tickAmbientParticles(world, [chunkAtPond], state, DAY_HOUR, AUTUMN, NO_WIND, []);

      expect(state.emitters.get("0,0")?.leavesEntity).toBeNull();
    });

    it("does NOT spawn leaves emitter in spring even with wind", () => {
      tickAmbientParticles(world, [chunkAtPond], state, DAY_HOUR, SPRING, HIGH_WIND, []);

      expect(state.emitters.get("0,0")?.leavesEntity).toBeNull();
    });

    it("leaves emitter is wind-affected", () => {
      tickAmbientParticles(world, [chunkAtPond], state, DAY_HOUR, AUTUMN, HIGH_WIND, []);

      expect(state.emitters.get("0,0")?.leavesEntity?.particleEmitter?.windAffected).toBe(true);
    });

    it("despawns leaves emitter when wind drops below threshold", () => {
      // Wind: spawn
      tickAmbientParticles(world, [chunkAtPond], state, DAY_HOUR, AUTUMN, HIGH_WIND, []);
      expect(state.emitters.get("0,0")?.leavesEntity).not.toBeNull();

      // No wind: despawn
      tickAmbientParticles(world, [chunkAtPond], state, DAY_HOUR, AUTUMN, NO_WIND, []);
      expect(state.emitters.get("0,0")?.leavesEntity).toBeNull();
    });
  });

  // ── Multi-type co-existence ────────────────────────────────────────────────

  describe("multi-type co-existence", () => {
    it("can have all three emitters active simultaneously (autumn night near water + wind)", () => {
      // autumn + night + near water + wind
      tickAmbientParticles(world, [chunkAtPond], state, NIGHT_HOUR, AUTUMN, HIGH_WIND, [pond]);

      const set = state.emitters.get("0,0");
      // Autumn is not a pollen season, so pollen is null
      expect(set?.fireflyEntity).not.toBeNull();
      expect(set?.pollenEntity).toBeNull();
      expect(set?.leavesEntity).not.toBeNull();
    });

    it("can have pollen and fireflies active in spring near water at night", () => {
      tickAmbientParticles(world, [chunkAtPond], state, NIGHT_HOUR, SPRING, NO_WIND, [pond]);

      const set = state.emitters.get("0,0");
      expect(set?.fireflyEntity).not.toBeNull();
      expect(set?.pollenEntity).not.toBeNull();
      expect(set?.leavesEntity).toBeNull();
    });
  });

  // ── Chunk lifecycle ────────────────────────────────────────────────────────

  describe("chunk lifecycle", () => {
    it("removes all emitters when chunk is unloaded", () => {
      // Spawn emitters on chunk
      tickAmbientParticles(world, [chunkAtPond], state, NIGHT_HOUR, SPRING, NO_WIND, [pond]);
      expect(state.emitters.has("0,0")).toBe(true);

      // Unload chunk (empty activeChunks)
      tickAmbientParticles(world, [], state, NIGHT_HOUR, SPRING, NO_WIND, [pond]);
      expect(state.emitters.has("0,0")).toBe(false);
    });

    it("removes entities from world when chunk is unloaded", () => {
      tickAmbientParticles(world, [chunkAtPond], state, NIGHT_HOUR, SPRING, NO_WIND, [pond]);
      const countBefore = world.with("particleEmitter").entities.length;
      expect(countBefore).toBeGreaterThan(0);

      tickAmbientParticles(world, [], state, NIGHT_HOUR, SPRING, NO_WIND, [pond]);
      expect(world.with("particleEmitter").entities.length).toBe(0);
    });

    it("handles multiple chunks independently", () => {
      const chunkA = makeChunk("0,0", 0, 0);
      const chunkB = makeChunk("1,0", 16, 0);
      const pondAtB = makeWaterRef(16, 0);

      // Both chunks near water at night
      tickAmbientParticles(world, [chunkA, chunkB], state, NIGHT_HOUR, SPRING, NO_WIND, [pond, pondAtB]);

      expect(state.emitters.get("0,0")?.fireflyEntity).not.toBeNull();
      expect(state.emitters.get("1,0")?.fireflyEntity).not.toBeNull();
    });

    it("only unloads the chunk that left the active set", () => {
      const chunkA = makeChunk("0,0", 0, 0);
      const chunkB = makeChunk("1,0", 16, 0);
      const pondAtB = makeWaterRef(16, 0);

      tickAmbientParticles(world, [chunkA, chunkB], state, NIGHT_HOUR, SPRING, NO_WIND, [pond, pondAtB]);

      // Unload chunkA only
      tickAmbientParticles(world, [chunkB], state, NIGHT_HOUR, SPRING, NO_WIND, [pondAtB]);

      expect(state.emitters.has("0,0")).toBe(false);
      expect(state.emitters.has("1,0")).toBe(true);
    });
  });
});
