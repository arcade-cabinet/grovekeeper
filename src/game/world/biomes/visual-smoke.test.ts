/**
 * Visual smoke test — runs `SingleChunkActor` against every biome with
 * the `@jolly-pixel/*` boundary mocked, and asserts the right tileset
 * is requested, the right blocks are registered, and the surface block
 * dominates the chunk JSON's surface row.
 *
 * Lives in `biomes/` rather than alongside `SingleChunkActor.test.ts`
 * because it's the registry contract that's being verified — the actor
 * is just the integration point. The dedicated actor test focuses on
 * orchestration (mock ordering, error swallowing).
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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
  VoxelRenderer: mocks.FakeVoxelRenderer,
}));

import { _resetBiomeTilesetCacheFor } from "../BiomeTilesetLoader";
import { CHUNK_TUNING, countSurfaceBlocksAtY } from "../chunkGenerator";
import { SingleChunkActor } from "../SingleChunkActor";
import { BIOME_IDS, getBiome } from "./index";

describe("visual smoke: SingleChunkActor renders every RC biome", () => {
  let registerMock: ReturnType<typeof vi.fn>;
  let loadTilesetMock: ReturnType<typeof vi.fn>;
  let loadMock: ReturnType<typeof vi.fn>;
  let renderer: object;

  beforeEach(() => {
    registerMock = vi.fn();
    loadTilesetMock = vi.fn().mockResolvedValue(undefined);
    loadMock = vi.fn().mockResolvedValue(undefined);
    renderer = {
      blockRegistry: { register: registerMock },
      loadTileset: loadTilesetMock,
      load: loadMock,
    };
    _resetBiomeTilesetCacheFor(renderer);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  for (const id of BIOME_IDS) {
    it(`biome=${id} requests the right tileset, registers the right blocks, dominates with surface block`, async () => {
      const biome = getBiome(id);
      const actor = {
        addComponentAndGet: vi.fn().mockReturnValue(renderer),
      };
      // biome-ignore lint/suspicious/noExplicitAny: opaque Actor type for a stub.
      const sc = new SingleChunkActor(actor as any, { biome: id });
      sc.awake();
      await sc.whenLoaded();

      // Right tileset asked for.
      expect(loadTilesetMock).toHaveBeenCalledTimes(1);
      const tilesetArg = loadTilesetMock.mock.calls[0]?.[0];
      expect(tilesetArg?.id).toBe(id);
      expect(tilesetArg?.src).toContain(`/assets/tilesets/biomes/${id}.png`);

      // Right blocks registered (every block from the biome, no stragglers).
      expect(registerMock).toHaveBeenCalledTimes(biome.blocks.length);

      // Right chunk pushed in (version 1, biome's blocks embedded,
      // surface block dominates the surface row).
      const chunkArg = loadMock.mock.calls[0]?.[0];
      expect(chunkArg.version).toBe(1);
      expect(chunkArg.tilesets?.[0]?.id).toBe(id);
      expect(chunkArg.blocks).toEqual(biome.blocks);

      const expectedFootprint = CHUNK_TUNING.size * CHUNK_TUNING.size;
      const flat = countSurfaceBlocksAtY(
        chunkArg,
        biome.surfaceBlock,
        biome.groundY,
      );
      const raised = countSurfaceBlocksAtY(
        chunkArg,
        biome.surfaceBlock,
        biome.groundY + 1,
      );
      // Surface block should occupy every cell in the surface row
      // (decorations stack ABOVE — see chunkGenerator). Any deviation
      // means the wrong block was chosen as surfaceBlock.
      expect(flat + raised).toBe(expectedFootprint);
    });
  }
});
