import { describe, expect, it } from "vitest";
import { MEADOW_BLOCK_IDS, MEADOW_TILESET_ID } from "./blockRegistry";
import {
  buildMeadowChunkJSON,
  countSurfaceBlocksAtY,
  MEADOW_CHUNK_TUNING,
} from "./meadowChunk";

describe("buildMeadowChunkJSON", () => {
  it("emits version 1 payload with the meadow tileset and block defs", () => {
    const json = buildMeadowChunkJSON();
    expect(json.version).toBe(1);
    expect(json.chunkSize).toBe(MEADOW_CHUNK_TUNING.size);
    expect(json.tilesets).toHaveLength(1);
    expect(json.tilesets[0]?.id).toBe(MEADOW_TILESET_ID);
    // Embedded blocks make the chunk JSON self-contained — Wave 9's
    // streamer relies on this so it doesn't need to keep the registry
    // in sync with on-disk saves.
    expect(json.blocks).toBeDefined();
    expect(json.blocks?.length).toBeGreaterThan(0);
  });

  it("declares two layers: surface and decorations", () => {
    const json = buildMeadowChunkJSON();
    const ids = json.layers.map((l) => l.id).sort();
    expect(ids).toEqual(["decorations", "surface"]);
  });

  it("places stone bedrock from y=0 to y=stoneFloorThickness-1", () => {
    const json = buildMeadowChunkJSON();
    const expected =
      MEADOW_CHUNK_TUNING.size *
      MEADOW_CHUNK_TUNING.size; // 16x16 cells per stone layer.
    for (let y = 0; y < MEADOW_CHUNK_TUNING.stoneFloorThickness; y++) {
      expect(countSurfaceBlocksAtY(json, MEADOW_BLOCK_IDS.stone, y)).toBe(
        expected,
      );
    }
  });

  it("places dirt above the stone floor for `dirtThickness` layers", () => {
    const json = buildMeadowChunkJSON();
    const expected =
      MEADOW_CHUNK_TUNING.size * MEADOW_CHUNK_TUNING.size;
    const start = MEADOW_CHUNK_TUNING.stoneFloorThickness;
    for (let i = 0; i < MEADOW_CHUNK_TUNING.dirtThickness; i++) {
      expect(
        countSurfaceBlocksAtY(json, MEADOW_BLOCK_IDS.dirt, start + i),
      ).toBe(expected);
    }
  });

  it("has grass-flat or grass-tall on the surface row at y=groundY", () => {
    const json = buildMeadowChunkJSON();
    const flat = countSurfaceBlocksAtY(
      json,
      MEADOW_BLOCK_IDS.grassFlat,
      MEADOW_CHUNK_TUNING.groundY,
    );
    const tall = countSurfaceBlocksAtY(
      json,
      MEADOW_BLOCK_IDS.grassTall,
      MEADOW_CHUNK_TUNING.groundY,
    );
    // Some grassFlat cells get bumped up to groundY+1 by the hill —
    // the ones still at groundY plus any tall grass should account for
    // the rest of the (size*size) surface minus the hill footprint.
    // Hill is `Math.abs(lx - center) < 2` which is a 3x3 region (lx
    // in {center-1, center, center+1}).
    const hillFootprint = 3 * 3;
    expect(flat + tall).toBe(
      MEADOW_CHUNK_TUNING.size * MEADOW_CHUNK_TUNING.size - hillFootprint,
    );
  });

  it("has at least one grass-flat block raised to groundY+1 (hill bump)", () => {
    const json = buildMeadowChunkJSON();
    const raised = countSurfaceBlocksAtY(
      json,
      MEADOW_BLOCK_IDS.grassFlat,
      MEADOW_CHUNK_TUNING.groundY + 1,
    );
    expect(raised).toBeGreaterThan(0);
  });

  it("is deterministic for the same (chunkX, chunkZ, worldSeed)", () => {
    const a = buildMeadowChunkJSON({ chunkX: 0, chunkZ: 0, worldSeed: 42 });
    const b = buildMeadowChunkJSON({ chunkX: 0, chunkZ: 0, worldSeed: 42 });
    expect(JSON.stringify(a)).toEqual(JSON.stringify(b));
  });

  it("varies decorations when the worldSeed changes", () => {
    const a = buildMeadowChunkJSON({ chunkX: 0, chunkZ: 0, worldSeed: 1 });
    const b = buildMeadowChunkJSON({ chunkX: 0, chunkZ: 0, worldSeed: 2 });
    const decoA = a.layers.find((l) => l.id === "decorations")?.voxels ?? {};
    const decoB = b.layers.find((l) => l.id === "decorations")?.voxels ?? {};
    expect(decoA).not.toEqual(decoB);
  });

  it("offsets voxel coordinates by chunkX*size and chunkZ*size", () => {
    const json = buildMeadowChunkJSON({ chunkX: 1, chunkZ: 0 });
    const surface = json.layers.find((l) => l.id === "surface");
    expect(surface).toBeDefined();
    const xs = Object.keys(surface!.voxels).map((k) =>
      Number.parseInt(k.split(",")[0], 10),
    );
    const minX = Math.min(...xs);
    expect(minX).toBeGreaterThanOrEqual(MEADOW_CHUNK_TUNING.size);
  });
});
