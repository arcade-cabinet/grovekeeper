import { describe, expect, it } from "vitest";
import { BIOME_IDS, getBiome, MEADOW_BLOCK_IDS } from "./biomes";
import {
  buildChunkJSON,
  CHUNK_TUNING,
  countDecorationBlocks,
  countSurfaceBlocksAtY,
} from "./chunkGenerator";

describe("buildChunkJSON: core invariants (default = meadow)", () => {
  it("emits version 1 payload with the meadow tileset and embedded blocks", () => {
    const json = buildChunkJSON();
    expect(json.version).toBe(1);
    expect(json.chunkSize).toBe(CHUNK_TUNING.size);
    expect(json.tilesets).toHaveLength(1);
    expect(json.tilesets[0]?.id).toBe("meadow");
    // Embedded blocks make the chunk JSON self-contained — Wave 9's
    // streamer relies on this so it doesn't need to keep the registry
    // in sync with on-disk saves.
    expect(json.blocks).toBeDefined();
    expect(json.blocks?.length).toBeGreaterThan(0);
  });

  it("declares two layers: surface and decorations", () => {
    const json = buildChunkJSON();
    const ids = json.layers.map((l) => l.id).sort();
    expect(ids).toEqual(["decorations", "surface"]);
  });

  it("places bedrock from y=0 to y=stoneFloorThickness-1", () => {
    const json = buildChunkJSON();
    const expected = CHUNK_TUNING.size * CHUNK_TUNING.size;
    for (let y = 0; y < CHUNK_TUNING.stoneFloorThickness; y++) {
      expect(countSurfaceBlocksAtY(json, MEADOW_BLOCK_IDS.stone, y)).toBe(
        expected,
      );
    }
  });

  it("places sub-surface (dirt) above bedrock for `dirtThickness` layers", () => {
    const json = buildChunkJSON();
    const expected = CHUNK_TUNING.size * CHUNK_TUNING.size;
    const start = CHUNK_TUNING.stoneFloorThickness;
    for (let i = 0; i < CHUNK_TUNING.dirtThickness; i++) {
      expect(
        countSurfaceBlocksAtY(json, MEADOW_BLOCK_IDS.dirt, start + i),
      ).toBe(expected);
    }
  });

  it("has at least one surface block raised to groundY+1 (hill bump)", () => {
    const json = buildChunkJSON();
    const meadow = getBiome("meadow");
    const raised = countSurfaceBlocksAtY(
      json,
      meadow.surfaceBlock,
      meadow.groundY + 1,
    );
    expect(raised).toBeGreaterThan(0);
  });

  it("is deterministic for the same (biome, chunkX, chunkZ, worldSeed)", () => {
    const a = buildChunkJSON({ chunkX: 0, chunkZ: 0, worldSeed: 42 });
    const b = buildChunkJSON({ chunkX: 0, chunkZ: 0, worldSeed: 42 });
    expect(JSON.stringify(a)).toEqual(JSON.stringify(b));
  });

  it("varies decorations when the worldSeed changes", () => {
    const a = buildChunkJSON({ chunkX: 0, chunkZ: 0, worldSeed: 1 });
    const b = buildChunkJSON({ chunkX: 0, chunkZ: 0, worldSeed: 2 });
    const decoA = a.layers.find((l) => l.id === "decorations")?.voxels ?? {};
    const decoB = b.layers.find((l) => l.id === "decorations")?.voxels ?? {};
    expect(decoA).not.toEqual(decoB);
  });

  it("offsets voxel coordinates by chunkX*size and chunkZ*size", () => {
    const json = buildChunkJSON({ chunkX: 1, chunkZ: 0 });
    const surface = json.layers.find((l) => l.id === "surface");
    expect(surface).toBeDefined();
    const xs = Object.keys(surface!.voxels).map((k) =>
      Number.parseInt(k.split(",")[0], 10),
    );
    const minX = Math.min(...xs);
    expect(minX).toBeGreaterThanOrEqual(CHUNK_TUNING.size);
  });
});

describe("buildChunkJSON: every biome renders a valid chunk", () => {
  for (const id of BIOME_IDS) {
    it(`biome=${id} produces a chunk with the right surface/sub-surface/bedrock`, () => {
      const biome = getBiome(id);
      const json = buildChunkJSON({ biome: id, worldSeed: 7 });
      // tileset id matches the biome id
      expect(json.tilesets[0]?.id).toBe(id);
      // embedded blocks come from the biome
      expect(json.blocks).toEqual(biome.blocks);

      const expected = CHUNK_TUNING.size * CHUNK_TUNING.size;
      // bedrock fills the lowest stoneFloorThickness rows
      expect(countSurfaceBlocksAtY(json, biome.bedrockBlock, 0)).toBe(expected);
      // sub-surface fills above bedrock
      expect(
        countSurfaceBlocksAtY(
          json,
          biome.subSurfaceBlock,
          CHUNK_TUNING.stoneFloorThickness,
        ),
      ).toBe(expected);
      // surface block is the dominant tile at groundY (or groundY+1 due
      // to the hill). Sum should equal full grid minus the hill
      // footprint at groundY.
      const flat = countSurfaceBlocksAtY(
        json,
        biome.surfaceBlock,
        biome.groundY,
      );
      const raised = countSurfaceBlocksAtY(
        json,
        biome.surfaceBlock,
        biome.groundY + 1,
      );
      // Some surface cells may be replaced by alt-surface decorations
      // (eg meadow.grass-tall is in the decoration list as a stack-on-top
      // entry, not a swap — so flat+raised is exactly size*size minus
      // any decorations that landed at groundY's slot). For our default
      // generator decorations stack ABOVE, so flat+raised = size*size.
      expect(flat + raised).toBe(expected);
    });
  }
});

describe("buildChunkJSON: per-biome decoration distributions", () => {
  it("meadow scatters wildflowers", () => {
    const json = buildChunkJSON({ biome: "meadow", worldSeed: 9 });
    const meadow = getBiome("meadow");
    const wildflowerId = meadow.decorations.find((d) =>
      meadow.blocks.find((b) => b.id === d.id)?.name.endsWith("wildflower"),
    )?.id;
    expect(wildflowerId).toBeDefined();
    if (wildflowerId !== undefined) {
      expect(countDecorationBlocks(json, wildflowerId)).toBeGreaterThan(0);
    }
  });

  it("forest scatters ferns / mushrooms / moss", () => {
    const json = buildChunkJSON({ biome: "forest", worldSeed: 11 });
    const forest = getBiome("forest");
    const total = forest.decorations
      .map((d) => countDecorationBlocks(json, d.id))
      .reduce((a, b) => a + b, 0);
    expect(total).toBeGreaterThan(0);
  });

  it("coast scatters shells / seagrass / coral", () => {
    const json = buildChunkJSON({ biome: "coast", worldSeed: 13 });
    const coast = getBiome("coast");
    const total = coast.decorations
      .map((d) => countDecorationBlocks(json, d.id))
      .reduce((a, b) => a + b, 0);
    expect(total).toBeGreaterThan(0);
  });

  it("grove scatters spirit blooms / spirit-moss", () => {
    const json = buildChunkJSON({ biome: "grove", worldSeed: 17 });
    const grove = getBiome("grove");
    const total = grove.decorations
      .map((d) => countDecorationBlocks(json, d.id))
      .reduce((a, b) => a + b, 0);
    expect(total).toBeGreaterThan(0);
  });
});

describe("buildChunkJSON: biome accepts both id and definition", () => {
  it("string id and BiomeDefinition produce identical output", () => {
    const meadow = getBiome("meadow");
    const a = buildChunkJSON({ biome: "meadow", worldSeed: 5 });
    const b = buildChunkJSON({ biome: meadow, worldSeed: 5 });
    expect(JSON.stringify(a)).toEqual(JSON.stringify(b));
  });
});
