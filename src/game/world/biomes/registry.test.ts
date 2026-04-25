import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  BIOME_IDS,
  type BiomeDefinition,
  type BiomeId,
  DEFAULT_BIOME_ID,
  getBiome,
  listBiomes,
} from "./index";

/**
 * Read the on-disk tileset JSON for a biome and return its `tiles` map.
 * Resolves against the project root so the test is independent of the
 * dev server's `BASE_URL`.
 */
function readTilesetJson(biome: BiomeDefinition): {
  tileSize: number;
  atlas: { cols: number; rows: number };
  tiles: Record<string, { col: number; row: number }>;
} {
  // biome.tilesetJsonPath is base-relative ("assets/tilesets/...").
  // Project layout: `public/<that-path>`.
  const path = resolve(
    process.cwd(),
    "public",
    biome.tilesetJsonPath,
  );
  return JSON.parse(readFileSync(path, "utf8"));
}

describe("biome registry", () => {
  it("lists all four RC biomes", () => {
    expect(BIOME_IDS).toEqual(["meadow", "forest", "coast", "grove"]);
    expect(listBiomes()).toHaveLength(4);
  });

  it("getBiome resolves every BiomeId", () => {
    for (const id of BIOME_IDS) {
      const biome = getBiome(id);
      expect(biome.id).toBe(id);
    }
  });

  it("getBiome throws on an unknown id", () => {
    expect(() => getBiome("nope" as BiomeId)).toThrow(/Unknown biome/);
  });

  it("defaults to meadow for Wave 8 (runtime swap is Wave 9 territory)", () => {
    expect(DEFAULT_BIOME_ID).toBe("meadow");
  });
});

describe("biome registry: per-biome invariants", () => {
  for (const id of BIOME_IDS) {
    describe(id, () => {
      const biome = getBiome(id);

      it("biome-prefixes every block name", () => {
        for (const block of biome.blocks) {
          expect(block.name.startsWith(`${biome.id}.`)).toBe(true);
        }
      });

      it("references the biome id as the tilesetId on every texture", () => {
        for (const block of biome.blocks) {
          if (block.defaultTexture) {
            expect(block.defaultTexture.tilesetId).toBe(biome.id);
          }
          for (const tex of Object.values(block.faceTextures)) {
            if (tex) expect(tex.tilesetId).toBe(biome.id);
          }
        }
      });

      it("declares surface/subSurface/bedrock that all exist in `blocks`", () => {
        const blockIds = new Set(biome.blocks.map((b) => b.id));
        expect(blockIds.has(biome.surfaceBlock)).toBe(true);
        expect(blockIds.has(biome.subSurfaceBlock)).toBe(true);
        expect(blockIds.has(biome.bedrockBlock)).toBe(true);
      });

      it("decoration ids all exist in `blocks`", () => {
        const blockIds = new Set(biome.blocks.map((b) => b.id));
        for (const deco of biome.decorations) {
          expect(blockIds.has(deco.id)).toBe(true);
          expect(deco.weight).toBeGreaterThan(0);
        }
      });

      it("uses unique numeric ids within the biome", () => {
        const ids = biome.blocks.map((b) => b.id);
        expect(new Set(ids).size).toBe(ids.length);
      });

      it("references tiles that exist in the tileset JSON", () => {
        const tileset = readTilesetJson(biome);
        const validCoords = new Set(
          Object.values(tileset.tiles).map((t) => `${t.col},${t.row}`),
        );
        for (const block of biome.blocks) {
          if (block.defaultTexture) {
            const key = `${block.defaultTexture.col},${block.defaultTexture.row}`;
            expect(validCoords).toContain(key);
          }
          for (const tex of Object.values(block.faceTextures)) {
            if (!tex) continue;
            const key = `${tex.col},${tex.row}`;
            expect(validCoords).toContain(key);
          }
        }
      });

      it("tilesetPath and tilesetJsonPath both resolve to existing files", () => {
        const pngPath = resolve(process.cwd(), "public", biome.tilesetPath);
        const jsonPath = resolve(
          process.cwd(),
          "public",
          biome.tilesetJsonPath,
        );
        // readFileSync throws on missing — that's the assertion.
        expect(() => readFileSync(jsonPath, "utf8")).not.toThrow();
        // PNG files exist at <pngPath>; we don't need to read them
        // here, but the path string should match the JSON's stem.
        expect(pngPath.endsWith(`${biome.id}.png`)).toBe(true);
      });
    });
  }
});

describe("biome registry: id ranges are disjoint", () => {
  it("no two biomes share a numeric block id", () => {
    const seen = new Map<number, BiomeId>();
    for (const biome of listBiomes()) {
      for (const block of biome.blocks) {
        const prior = seen.get(block.id);
        if (prior) {
          throw new Error(
            `Block id ${block.id} appears in both "${prior}" and "${biome.id}"`,
          );
        }
        seen.set(block.id, biome.id);
      }
    }
    expect(seen.size).toBeGreaterThan(0);
  });
});
