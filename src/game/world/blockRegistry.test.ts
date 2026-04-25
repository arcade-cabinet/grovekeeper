import { describe, expect, it, vi } from "vitest";
import {
  MEADOW_BLOCK_DEFS,
  MEADOW_BLOCK_IDS,
  MEADOW_TILESET_ID,
  registerMeadowBlocks,
} from "./blockRegistry";

describe("blockRegistry: meadow block definitions", () => {
  it("defines the five meadow blocks plus reserves id 0 for air", () => {
    expect(MEADOW_BLOCK_IDS.air).toBe(0);
    // Air is intentionally NOT in MEADOW_BLOCK_DEFS — block id 0 is
    // reserved by the renderer for "no voxel" and must never be
    // registered.
    const ids = MEADOW_BLOCK_DEFS.map((b) => b.id).sort();
    expect(ids).toEqual([
      MEADOW_BLOCK_IDS.grassFlat,
      MEADOW_BLOCK_IDS.grassTall,
      MEADOW_BLOCK_IDS.dirt,
      MEADOW_BLOCK_IDS.stone,
      MEADOW_BLOCK_IDS.wildflower,
    ]);
  });

  it("marks ground blocks collidable and wildflower non-collidable", () => {
    const byId = new Map(MEADOW_BLOCK_DEFS.map((b) => [b.id, b]));
    expect(byId.get(MEADOW_BLOCK_IDS.grassFlat)?.collidable).toBe(true);
    expect(byId.get(MEADOW_BLOCK_IDS.grassTall)?.collidable).toBe(true);
    expect(byId.get(MEADOW_BLOCK_IDS.dirt)?.collidable).toBe(true);
    expect(byId.get(MEADOW_BLOCK_IDS.stone)?.collidable).toBe(true);
    expect(byId.get(MEADOW_BLOCK_IDS.wildflower)?.collidable).toBe(false);
  });

  it("uses cube shape for every block (Wave 7 simplification)", () => {
    for (const block of MEADOW_BLOCK_DEFS) {
      expect(block.shapeId).toBe("cube");
    }
  });

  it("references the meadow tileset id on every face/default texture", () => {
    for (const block of MEADOW_BLOCK_DEFS) {
      if (block.defaultTexture) {
        expect(block.defaultTexture.tilesetId).toBe(MEADOW_TILESET_ID);
      }
      for (const tex of Object.values(block.faceTextures)) {
        if (tex) expect(tex.tilesetId).toBe(MEADOW_TILESET_ID);
      }
    }
  });

  it("gives grass blocks a separate top-face tile from sides/bottom", () => {
    const grassFlat = MEADOW_BLOCK_DEFS.find(
      (b) => b.id === MEADOW_BLOCK_IDS.grassFlat,
    );
    expect(grassFlat).toBeDefined();
    // FACE.PosY = 2 (top), FACE.NegY = 3 (bottom) per voxel.renderer
    // utils/math.
    expect(grassFlat?.faceTextures[2]).toBeDefined();
    expect(grassFlat?.faceTextures[3]).toBeDefined();
    // Top != bottom (top is grass, bottom is dirt).
    expect(grassFlat?.faceTextures[2]).not.toEqual(
      grassFlat?.faceTextures[3],
    );
  });

  it("registerMeadowBlocks calls register() once per definition", () => {
    const register = vi.fn();
    registerMeadowBlocks({ register });
    expect(register).toHaveBeenCalledTimes(MEADOW_BLOCK_DEFS.length);
    for (const def of MEADOW_BLOCK_DEFS) {
      expect(register).toHaveBeenCalledWith(def);
    }
  });
});
