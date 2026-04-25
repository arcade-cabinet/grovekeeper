/**
 * Tests for the Wave 9 ChunkManager.
 *
 * The manager is engine-agnostic — it only needs `world.createActor`
 * and a `playerPosition` POJO — so we mock the `addComponentAndGet`
 * surface and assert on the spawn / despawn diffs.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  class FakeActorComponent {
    // biome-ignore lint/suspicious/noExplicitAny: stub
    protected actor: any;
    needUpdate = false;
    // biome-ignore lint/suspicious/noExplicitAny: stub
    constructor(args: { actor: any }) {
      this.actor = args.actor;
    }
  }
  return {
    FakeActorComponent,
    FakeVoxelRenderer: class {},
  };
});

vi.mock("@jolly-pixel/engine", () => ({
  ActorComponent: mocks.FakeActorComponent,
}));

vi.mock("@jolly-pixel/voxel.renderer", () => ({
  VoxelRenderer: mocks.FakeVoxelRenderer,
}));

import { ChunkManager } from "./ChunkManager";
import { CHUNK_TUNING } from "./chunkGenerator";

interface FakeActor {
  destroy: ReturnType<typeof vi.fn>;
  isDestroyed: () => boolean;
  pendingForDestruction: boolean;
  addComponentAndGet: ReturnType<typeof vi.fn>;
  object3D: { position: { set: ReturnType<typeof vi.fn> } };
}

interface FakeWorld {
  actorsCreated: number;
  // biome-ignore lint/suspicious/noExplicitAny: returns ChunkActor stub.
  createActor: (name: string) => any;
  // Track all spawned actors so tests can assert on disposal.
  liveActors: Map<string, FakeActor>;
}

function makeFakeWorld(): FakeWorld {
  const live = new Map<string, FakeActor>();
  let count = 0;
  return {
    get actorsCreated() {
      return count;
    },
    set actorsCreated(_n) {
      /* read-only proxy */
    },
    liveActors: live,
    createActor(name: string) {
      count++;
      const fakeRenderer = {
        blockRegistry: { register: vi.fn() },
        loadTileset: vi.fn().mockResolvedValue(undefined),
        load: vi.fn().mockResolvedValue(undefined),
      };
      const actor: FakeActor = {
        destroy: vi.fn(),
        isDestroyed: () => false,
        pendingForDestruction: false,
        addComponentAndGet: vi.fn().mockReturnValue(fakeRenderer),
        object3D: { position: { set: vi.fn() } },
      };
      live.set(name, actor);
      // The manager calls actor.addComponentAndGet(ChunkActor, opts).
      // The first call goes through the engine; we mock that path so
      // the *real* ChunkActor constructor runs and returns a real
      // instance bound to `actor`.
      const realAddComponent = actor.addComponentAndGet;
      actor.addComponentAndGet = vi.fn((Klass, opts) => {
        // ChunkActor uses `addComponentAndGet(VoxelRenderer, ...)`
        // internally. For the renderer, return the fake renderer.
        if (Klass === mocks.FakeVoxelRenderer) {
          return fakeRenderer;
        }
        // For ChunkActor itself, instantiate it against this actor.
        // biome-ignore lint/suspicious/noExplicitAny: Klass is opaque.
        const instance = new (Klass as any)(actor, opts);
        return instance;
      });
      // Keep the unused proxy quiet.
      void realAddComponent;
      return actor;
    },
  };
}

describe("ChunkManager", () => {
  let position: { x: number; y: number; z: number };
  beforeEach(() => {
    position = { x: 0, y: 0, z: 0 };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function manager(world: FakeWorld, overrides?: Partial<{
    activeRadius: number;
    bufferRadius: number;
    spawnsPerFrame: number;
    despawnsPerFrame: number;
  }>): ChunkManager {
    return new ChunkManager({
      world,
      playerPosition: position,
      worldSeed: 0,
      streaming: {
        activeRadius: overrides?.activeRadius ?? 1,
        bufferRadius: overrides?.bufferRadius ?? 2,
        spawnsPerFrame: overrides?.spawnsPerFrame ?? 100,
        despawnsPerFrame: overrides?.despawnsPerFrame ?? 100,
      },
    });
  }

  it("spawns the (2*r+1)^2 chunks around the player at first update", () => {
    const world = makeFakeWorld();
    const m = manager(world, { activeRadius: 1, spawnsPerFrame: 100 });
    m.update();
    // Active radius 1 ⇒ a 3x3 = 9 chunk square.
    expect(m.loadedChunkCount).toBe(9);
  });

  it("respects the spawnsPerFrame cap", () => {
    const world = makeFakeWorld();
    const m = manager(world, { activeRadius: 2, spawnsPerFrame: 3 });
    m.update();
    expect(m.loadedChunkCount).toBe(3);
    // Subsequent updates fill the rest.
    m.update();
    expect(m.loadedChunkCount).toBe(6);
  });

  it("shifts the active set when the player moves a full chunk over", () => {
    const world = makeFakeWorld();
    const m = manager(world, { activeRadius: 1, bufferRadius: 1 });
    m.update();
    const before = new Set(m.loadedChunkCoords().map((c) => c.join(",")));
    expect(before.has("0,0")).toBe(true);

    // Walk player 2 chunks east — buffer radius 1, so chunks at -1 col
    // are now outside the buffer and should despawn.
    position.x = 2 * CHUNK_TUNING.size + 0.5;
    position.z = 0;
    m.update();
    const after = new Set(m.loadedChunkCoords().map((c) => c.join(",")));
    expect(after.has("2,0")).toBe(true);
    // Old far-west chunk (-1, 0) gone.
    expect(after.has("-1,0")).toBe(false);
  });

  it("disposes chunks that drift outside bufferRadius", () => {
    const world = makeFakeWorld();
    const m = manager(world, {
      activeRadius: 1,
      bufferRadius: 1,
      spawnsPerFrame: 100,
      despawnsPerFrame: 100,
    });
    m.update();
    // Capture the actor that owns chunk (-1, 0) before it leaves.
    const farActor = world.liveActors.get("chunk:-1,0");
    expect(farActor).toBeDefined();
    expect(farActor?.destroy).not.toHaveBeenCalled();

    // Move player far east; chunk(-1,0) is now > bufferRadius away.
    position.x = 5 * CHUNK_TUNING.size;
    m.update();
    expect(farActor?.destroy).toHaveBeenCalledTimes(1);
  });

  it("respects the despawnsPerFrame cap", () => {
    const world = makeFakeWorld();
    const m = manager(world, {
      activeRadius: 1,
      bufferRadius: 1,
      spawnsPerFrame: 100,
      despawnsPerFrame: 1,
    });
    m.update();
    const initialCount = m.loadedChunkCount;
    expect(initialCount).toBeGreaterThan(0);
    // Move very far so EVERY existing chunk is now off-buffer.
    position.x = 100 * CHUNK_TUNING.size;
    position.z = 100 * CHUNK_TUNING.size;
    m.update();
    // Cap was 1 despawn this frame, but we ALSO spawn fresh ones at
    // the new location. The despawn-budget assertion is: at most 1
    // despawn this frame. We check by counting how many old-region
    // actors still have destroy=0 calls.
    let stillAlive = 0;
    for (const [name, actor] of world.liveActors) {
      if (!name.startsWith("chunk:")) continue;
      // Check if this actor's coords are in the old region.
      const coords = name.slice("chunk:".length).split(",").map(Number);
      const [cx, cz] = coords;
      const isOld = Math.abs(cx) <= 1 && Math.abs(cz) <= 1;
      if (isOld && actor.destroy.mock.calls.length === 0) stillAlive++;
    }
    // Started with `initialCount` chunks in the old region; despawned
    // at most 1 → at least initialCount-1 still have destroy uncalled.
    expect(stillAlive).toBeGreaterThanOrEqual(initialCount - 1);
  });

  it("dispose() destroys every live chunk and is idempotent", () => {
    const world = makeFakeWorld();
    const m = manager(world, { activeRadius: 1 });
    m.update();
    const actorRefs = Array.from(world.liveActors.values());
    m.dispose();
    for (const a of actorRefs) {
      expect(a.destroy).toHaveBeenCalled();
    }
    // Second dispose is a no-op.
    expect(() => m.dispose()).not.toThrow();
  });

  it("biome assignment is deterministic for the same worldSeed", () => {
    const worldA = makeFakeWorld();
    const worldB = makeFakeWorld();
    const a = manager(worldA, { activeRadius: 1 });
    const b = manager(worldB, { activeRadius: 1 });
    a.update();
    b.update();
    const biomesA = a
      .loadedChunkCoords()
      .map(([x, z]) => `${x},${z}=${a.getChunk(x, z)?.biomeId}`)
      .sort();
    const biomesB = b
      .loadedChunkCoords()
      .map(([x, z]) => `${x},${z}=${b.getChunk(x, z)?.biomeId}`)
      .sort();
    expect(biomesA).toEqual(biomesB);
  });

  it("fires onChunkSpawned and onChunkDespawned hooks (Wave 10 integration point)", () => {
    const world = makeFakeWorld();
    const onChunkSpawned = vi.fn();
    const onChunkDespawned = vi.fn();
    const m = new ChunkManager({
      world,
      playerPosition: position,
      worldSeed: 0,
      streaming: {
        activeRadius: 1,
        bufferRadius: 1,
        spawnsPerFrame: 100,
        despawnsPerFrame: 100,
      },
      hooks: { onChunkSpawned, onChunkDespawned },
    });
    m.update();
    expect(onChunkSpawned).toHaveBeenCalledTimes(9);
    onChunkSpawned.mockClear();

    position.x = 10 * CHUNK_TUNING.size;
    m.update();
    // Old chunks beyond bufferRadius despawned; fresh ones spawned.
    expect(onChunkDespawned).toHaveBeenCalled();
    expect(onChunkSpawned).toHaveBeenCalled();
  });
});
