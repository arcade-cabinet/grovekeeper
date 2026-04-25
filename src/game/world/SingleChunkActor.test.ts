import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// We can't drive a real `@jolly-pixel/engine` Actor here without a
// THREE.WebGLRenderer (and thus a real DOM canvas). Mock the two
// engine imports SingleChunkActor uses so the test stays in node and
// only exercises our orchestration logic. Mock factories are hoisted
// by Vitest, so all helpers must be created via `vi.hoisted` to dodge
// the temporal dead zone.

const mocks = vi.hoisted(() => {
  class FakeActorComponent {
    // biome-ignore lint/suspicious/noExplicitAny: stub for tests only.
    protected actor: any;
    needUpdate = false;
    // biome-ignore lint/suspicious/noExplicitAny: stub for tests only.
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
  // Exported as a value so SingleChunkActor's
  // `addComponentAndGet(VoxelRenderer, ...)` has something to pass.
  VoxelRenderer: mocks.FakeVoxelRenderer,
}));

import { _resetBiomeTilesetCacheFor } from "./BiomeTilesetLoader";
import { BIOME_IDS, getBiome } from "./biomes";
import { CHUNK_TUNING } from "./chunkGenerator";
import { SingleChunkActor } from "./SingleChunkActor";

describe("SingleChunkActor", () => {
  let registerMock: ReturnType<typeof vi.fn>;
  let loadTilesetMock: ReturnType<typeof vi.fn>;
  let loadMock: ReturnType<typeof vi.fn>;
  let addComponentAndGetMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    registerMock = vi.fn();
    loadTilesetMock = vi.fn().mockResolvedValue(undefined);
    loadMock = vi.fn().mockResolvedValue(undefined);
    addComponentAndGetMock = vi.fn();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  function makeActor() {
    const fakeRenderer = {
      blockRegistry: { register: registerMock },
      loadTileset: loadTilesetMock,
      load: loadMock,
    };
    addComponentAndGetMock.mockReturnValue(fakeRenderer);
    // Reset the per-renderer tileset cache so each test re-issues the
    // load call (otherwise the second test would see 0 calls).
    _resetBiomeTilesetCacheFor(fakeRenderer);
    return {
      actor: { addComponentAndGet: addComponentAndGetMock },
      renderer: fakeRenderer,
    };
  }

  it("defaults to meadow when no biome option is passed", async () => {
    const { actor } = makeActor();
    // biome-ignore lint/suspicious/noExplicitAny: opaque Actor type for a stub.
    const sc = new SingleChunkActor(actor as any);
    sc.awake();
    await sc.whenLoaded();

    expect(sc.biomeId).toBe("meadow");
    const meadow = getBiome("meadow");
    expect(registerMock).toHaveBeenCalledTimes(meadow.blocks.length);
  });

  it("registers all of the chosen biome's blocks on awake", async () => {
    for (const id of BIOME_IDS) {
      const localRegister = vi.fn();
      const localLoadTileset = vi.fn().mockResolvedValue(undefined);
      const localLoad = vi.fn().mockResolvedValue(undefined);
      const localRenderer = {
        blockRegistry: { register: localRegister },
        loadTileset: localLoadTileset,
        load: localLoad,
      };
      _resetBiomeTilesetCacheFor(localRenderer);
      const localActor = {
        addComponentAndGet: vi.fn().mockReturnValue(localRenderer),
      };

      // biome-ignore lint/suspicious/noExplicitAny: opaque Actor type for a stub.
      const sc = new SingleChunkActor(localActor as any, { biome: id });
      sc.awake();
      await sc.whenLoaded();

      const biome = getBiome(id);
      expect(localRegister).toHaveBeenCalledTimes(biome.blocks.length);
      for (const block of biome.blocks) {
        expect(localRegister).toHaveBeenCalledWith(block);
      }
    }
  });

  it("requests the chosen biome's tileset before pushing the chunk JSON", async () => {
    const { actor } = makeActor();
    // biome-ignore lint/suspicious/noExplicitAny: opaque Actor type for a stub.
    const sc = new SingleChunkActor(actor as any, { biome: "forest" });
    sc.awake();
    await sc.whenLoaded();

    expect(loadTilesetMock).toHaveBeenCalledTimes(1);
    expect(loadMock).toHaveBeenCalledTimes(1);
    const tilesetArg = loadTilesetMock.mock.calls[0]?.[0];
    expect(tilesetArg?.id).toBe("forest");
    // Tileset must complete before chunk load — assert ordering by mock
    // invocation order numbers.
    const tilesetOrder = loadTilesetMock.mock.invocationCallOrder[0];
    const loadOrder = loadMock.mock.invocationCallOrder[0];
    expect(tilesetOrder).toBeLessThan(loadOrder);
  });

  it("passes a self-contained chunk JSON (version 1, embedded blocks) into renderer.load", async () => {
    const { actor } = makeActor();
    // biome-ignore lint/suspicious/noExplicitAny: opaque Actor type for a stub.
    const sc = new SingleChunkActor(actor as any);
    sc.awake();
    await sc.whenLoaded();

    const arg = loadMock.mock.calls[0]?.[0];
    expect(arg).toBeDefined();
    expect(arg.version).toBe(1);
    expect(arg.chunkSize).toBe(CHUNK_TUNING.size);
    expect(arg.blocks?.length).toBeGreaterThan(0);
    expect(arg.layers.length).toBe(2);
  });

  it("the chunk JSON's tileset id matches the chosen biome", async () => {
    for (const id of BIOME_IDS) {
      const localLoad = vi.fn().mockResolvedValue(undefined);
      const localRenderer = {
        blockRegistry: { register: vi.fn() },
        loadTileset: vi.fn().mockResolvedValue(undefined),
        load: localLoad,
      };
      _resetBiomeTilesetCacheFor(localRenderer);
      const localActor = {
        addComponentAndGet: vi.fn().mockReturnValue(localRenderer),
      };
      // biome-ignore lint/suspicious/noExplicitAny: opaque Actor type for a stub.
      const sc = new SingleChunkActor(localActor as any, { biome: id });
      sc.awake();
      await sc.whenLoaded();
      const arg = localLoad.mock.calls[0]?.[0];
      expect(arg.tilesets?.[0]?.id).toBe(id);
    }
  });

  it("exposes SURFACE_Y above groundY so the player spawns clear of the hill bump", () => {
    expect(SingleChunkActor.SURFACE_Y).toBeGreaterThan(CHUNK_TUNING.groundY);
  });

  it("swallows load errors instead of rejecting", async () => {
    const { actor, renderer } = makeActor();
    renderer.load = vi.fn().mockRejectedValue(new Error("boom"));
    addComponentAndGetMock.mockReturnValue(renderer);

    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    // biome-ignore lint/suspicious/noExplicitAny: opaque Actor type for a stub.
    const sc = new SingleChunkActor(actor as any);
    sc.awake();
    // Should resolve, not reject.
    await expect(sc.whenLoaded()).resolves.toBeUndefined();
    expect(errSpy).toHaveBeenCalled();
    errSpy.mockRestore();
  });
});
