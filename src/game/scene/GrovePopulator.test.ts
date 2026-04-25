/**
 * GrovePopulator tests — Wave 11b.
 *
 * Mocks `@jolly-pixel/engine` the same way the actor tests do so the
 * populator can run end-to-end without touching THREE / GLTFLoader.
 *
 * Verifies:
 *   - Spirit spawns at chunk centre,
 *   - villager count is in [1, 4] and deterministic for the same seed,
 *   - villager spawn positions are deterministic for the same seed,
 *   - id helpers match the `groveDiscovery` id format so dialogue
 *     history persists against the same row,
 *   - dispose() is idempotent.
 */

import { describe, expect, it, vi } from "vitest";

interface MockActor {
  object3D: {
    position: {
      x: number;
      y: number;
      z: number;
      set: (x: number, y: number, z: number) => void;
    };
    rotation: { x: number; y: number; z: number };
  };
  addComponentAndGet: ReturnType<typeof vi.fn>;
}

vi.mock("@jolly-pixel/engine", () => ({
  ActorComponent: class {
    public actor: MockActor;
    public typeName: string;
    public needUpdate = true;
    constructor(opts: { actor: MockActor; typeName: string }) {
      this.actor = opts.actor;
      this.typeName = opts.typeName;
    }
  },
  ModelRenderer: vi.fn(),
}));

function createMockActor(): MockActor {
  const pos = {
    x: 0,
    y: 0,
    z: 0,
    set(x: number, y: number, z: number) {
      this.x = x;
      this.y = y;
      this.z = z;
    },
  };
  return {
    object3D: { position: pos, rotation: { x: 0, y: 0, z: 0 } },
    addComponentAndGet: vi.fn(() => ({
      animation: { play: vi.fn() },
    })),
  };
}

function makeFactory() {
  const actors: MockActor[] = [];
  return {
    createActor: () => {
      const a = createMockActor();
      actors.push(a);
      return a;
    },
    actors,
  };
}

describe("GrovePopulator", () => {
  it("spawns one Spirit at the chunk centre", async () => {
    const { populateGrove } = await import("./GrovePopulator");
    const { default: worldConfig } = await import(
      "@/game/world/world.config.json"
    );
    const factory = makeFactory();
    const handle = populateGrove({
      worldSeed: 42,
      chunkX: 3,
      chunkZ: 0,
      surfaceY: 6,
      // biome-ignore lint/suspicious/noExplicitAny: stub factory matches engine surface
      factory: factory as any,
    });
    const expectedX = 3 * worldConfig.chunkSize + worldConfig.chunkSize / 2;
    const expectedZ = 0 * worldConfig.chunkSize + worldConfig.chunkSize / 2;
    expect(handle.spirit.position.x).toBeCloseTo(expectedX, 5);
    expect(handle.spirit.position.z).toBeCloseTo(expectedZ, 5);
    expect(handle.spirit.position.y).toBeCloseTo(6, 5);
  });

  it("spawns 1 to 4 villagers deterministically by chunk seed (when claimed)", async () => {
    const { populateGrove } = await import("./GrovePopulator");
    const factoryA = makeFactory();
    const a = populateGrove({
      worldSeed: 42,
      chunkX: 5,
      chunkZ: 7,
      surfaceY: 6,
      // biome-ignore lint/suspicious/noExplicitAny: stub factory
      factory: factoryA as any,
      groveState: "claimed",
    });
    const factoryB = makeFactory();
    const b = populateGrove({
      worldSeed: 42,
      chunkX: 5,
      chunkZ: 7,
      surfaceY: 6,
      // biome-ignore lint/suspicious/noExplicitAny: stub factory
      factory: factoryB as any,
      groveState: "claimed",
    });
    expect(a.villagers.length).toBe(b.villagers.length);
    expect(a.villagers.length).toBeGreaterThanOrEqual(1);
    expect(a.villagers.length).toBeLessThanOrEqual(4);
    // Same seed → same spawn positions.
    for (let i = 0; i < a.villagers.length; i++) {
      expect(a.villagers[i].position.x).toBeCloseTo(
        b.villagers[i].position.x,
        5,
      );
      expect(a.villagers[i].position.z).toBeCloseTo(
        b.villagers[i].position.z,
        5,
      );
    }
  });

  it("different seeds produce (probabilistically) different villager counts/positions", async () => {
    const { populateGrove } = await import("./GrovePopulator");
    // Two seeds chosen so the villager count xor a position differs.
    const a = populateGrove({
      worldSeed: 1,
      chunkX: 0,
      chunkZ: 0,
      surfaceY: 6,
      // biome-ignore lint/suspicious/noExplicitAny: stub factory
      factory: makeFactory() as any,
      groveState: "claimed",
    });
    const b = populateGrove({
      worldSeed: 99999,
      chunkX: 0,
      chunkZ: 0,
      surfaceY: 6,
      // biome-ignore lint/suspicious/noExplicitAny: stub factory
      factory: makeFactory() as any,
      groveState: "claimed",
    });
    const sameCount = a.villagers.length === b.villagers.length;
    const samePos =
      sameCount &&
      a.villagers.every(
        (v, i) =>
          Math.abs(v.position.x - b.villagers[i].position.x) < 1e-6 &&
          Math.abs(v.position.z - b.villagers[i].position.z) < 1e-6,
      );
    expect(samePos && sameCount).toBe(false);
  });

  it("groveId matches the groveDiscovery format `grove-<x>-<z>`", async () => {
    const { groveId } = await import("./GrovePopulator");
    expect(groveId(3, 0)).toBe("grove-3-0");
    expect(groveId(-1, 5)).toBe("grove--1-5");
  });

  it("dispose() is idempotent", async () => {
    const { populateGrove } = await import("./GrovePopulator");
    const handle = populateGrove({
      worldSeed: 0,
      chunkX: 0,
      chunkZ: 0,
      surfaceY: 6,
      // biome-ignore lint/suspicious/noExplicitAny: stub factory
      factory: makeFactory() as any,
    });
    expect(() => {
      handle.dispose();
      handle.dispose();
    }).not.toThrow();
  });

  it("forwards lastPhraseId from history to spawned actors", async () => {
    const { populateGrove, groveSpiritId } = await import("./GrovePopulator");
    const spiritId = groveSpiritId(3, 0);
    const handle = populateGrove({
      worldSeed: 0,
      chunkX: 3,
      chunkZ: 0,
      surfaceY: 6,
      // biome-ignore lint/suspicious/noExplicitAny: stub factory
      factory: makeFactory() as any,
      history: {
        getLastPhraseId: (id) =>
          id === spiritId ? "spirit:returning-greet:2" : null,
        hasMet: (id) => id === spiritId,
      },
    });
    expect(handle.spirit.lastPhrase).toBe("spirit:returning-greet:2");
    expect(handle.spirit.firstMeetConsumed).toBe(true);
  });

  describe("Sub-wave A — claim gate", () => {
    it("does NOT spawn villagers when groveState is omitted (default discovered)", async () => {
      const { populateGrove } = await import("./GrovePopulator");
      const handle = populateGrove({
        worldSeed: 42,
        chunkX: 3,
        chunkZ: 0,
        surfaceY: 6,
        // biome-ignore lint/suspicious/noExplicitAny: stub factory
        factory: makeFactory() as any,
      });
      expect(handle.villagers.length).toBe(0);
      expect(handle.spirit).toBeDefined();
    });

    it("does NOT spawn villagers when groveState='discovered'", async () => {
      const { populateGrove } = await import("./GrovePopulator");
      const handle = populateGrove({
        worldSeed: 42,
        chunkX: 3,
        chunkZ: 0,
        surfaceY: 6,
        // biome-ignore lint/suspicious/noExplicitAny: stub factory
        factory: makeFactory() as any,
        groveState: "discovered",
      });
      expect(handle.villagers.length).toBe(0);
    });

    it("DOES spawn villagers when groveState='claimed'", async () => {
      const { populateGrove } = await import("./GrovePopulator");
      const handle = populateGrove({
        worldSeed: 42,
        chunkX: 3,
        chunkZ: 0,
        surfaceY: 6,
        // biome-ignore lint/suspicious/noExplicitAny: stub factory
        factory: makeFactory() as any,
        groveState: "claimed",
      });
      expect(handle.villagers.length).toBeGreaterThanOrEqual(1);
      expect(handle.villagers.length).toBeLessThanOrEqual(4);
    });

    it("dispose() is idempotent on a discovered (no-villager) grove", async () => {
      const { populateGrove } = await import("./GrovePopulator");
      const handle = populateGrove({
        worldSeed: 0,
        chunkX: 0,
        chunkZ: 0,
        surfaceY: 6,
        // biome-ignore lint/suspicious/noExplicitAny: stub factory
        factory: makeFactory() as any,
        groveState: "discovered",
      });
      expect(() => {
        handle.dispose();
        handle.dispose();
      }).not.toThrow();
    });
  });
});
