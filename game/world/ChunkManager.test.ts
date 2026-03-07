/**
 * ChunkManager tests (Spec §17.1)
 *
 * Tests cover:
 *  - Pure coordinate helpers (worldToChunkCoords, getChunksInRadius, getChunkKey)
 *  - generateChunkData determinism and output shape
 *  - ChunkManager.update loads 3x3 active + 5x5 buffer ring
 *  - Chunk transitions: new chunks loaded, old chunks removed
 */

import { world } from "@/game/ecs/world";
import {
  ACTIVE_RADIUS,
  BUFFER_RADIUS,
  CHUNK_SIZE,
  ChunkManager,
  generateChunkData,
  getChunkKey,
  getChunksInRadius,
  worldToChunkCoords,
} from "./ChunkManager";

// Clean up all ECS entities between tests
afterEach(() => {
  for (const entity of [...world.entities]) {
    world.remove(entity);
  }
});

// ─── Pure helpers ─────────────────────────────────────────────────────────────

describe("CHUNK_SIZE / radii (Spec §17.1)", () => {
  it("CHUNK_SIZE is 16", () => {
    expect(CHUNK_SIZE).toBe(16);
  });

  it("ACTIVE_RADIUS is 1 (3x3 active ring)", () => {
    expect(ACTIVE_RADIUS).toBe(1);
  });

  it("BUFFER_RADIUS is 2 (5x5 buffer ring)", () => {
    expect(BUFFER_RADIUS).toBe(2);
  });
});

describe("worldToChunkCoords (Spec §17.1)", () => {
  it("maps origin to chunk (0,0)", () => {
    expect(worldToChunkCoords({ x: 0, z: 0 })).toEqual({ chunkX: 0, chunkZ: 0 });
  });

  it("maps (16, 16) to chunk (1, 1)", () => {
    expect(worldToChunkCoords({ x: 16, z: 16 })).toEqual({ chunkX: 1, chunkZ: 1 });
  });

  it("maps (15, 15) to chunk (0, 0) — boundary stays in first chunk", () => {
    expect(worldToChunkCoords({ x: 15, z: 15 })).toEqual({ chunkX: 0, chunkZ: 0 });
  });

  it("maps negative position to negative chunk coords", () => {
    expect(worldToChunkCoords({ x: -1, z: -1 })).toEqual({ chunkX: -1, chunkZ: -1 });
  });

  it("maps (-16, -16) to chunk (-1, -1)", () => {
    expect(worldToChunkCoords({ x: -16, z: -16 })).toEqual({ chunkX: -1, chunkZ: -1 });
  });
});

describe("getChunkKey", () => {
  it("formats (0, 0) as '0,0'", () => {
    expect(getChunkKey(0, 0)).toBe("0,0");
  });

  it("formats (3, -2) as '3,-2'", () => {
    expect(getChunkKey(3, -2)).toBe("3,-2");
  });

  it("formats (-5, 7) as '-5,7'", () => {
    expect(getChunkKey(-5, 7)).toBe("-5,7");
  });
});

describe("getChunksInRadius", () => {
  it("radius 1 returns 9 chunks (3x3)", () => {
    const chunks = getChunksInRadius(0, 0, 1);
    expect(chunks).toHaveLength(9);
  });

  it("radius 2 returns 25 chunks (5x5)", () => {
    const chunks = getChunksInRadius(0, 0, 2);
    expect(chunks).toHaveLength(25);
  });

  it("radius 0 returns 1 chunk (center only)", () => {
    const chunks = getChunksInRadius(0, 0, 0);
    expect(chunks).toHaveLength(1);
    expect(chunks[0]).toEqual({ chunkX: 0, chunkZ: 0 });
  });

  it("includes center chunk", () => {
    const chunks = getChunksInRadius(5, 3, 1);
    expect(chunks).toContainEqual({ chunkX: 5, chunkZ: 3 });
  });

  it("includes all corner chunks at radius 1", () => {
    const chunks = getChunksInRadius(0, 0, 1);
    expect(chunks).toContainEqual({ chunkX: -1, chunkZ: -1 });
    expect(chunks).toContainEqual({ chunkX: 1, chunkZ: -1 });
    expect(chunks).toContainEqual({ chunkX: -1, chunkZ: 1 });
    expect(chunks).toContainEqual({ chunkX: 1, chunkZ: 1 });
  });

  it("offsets center correctly for non-zero origin", () => {
    const chunks = getChunksInRadius(3, 5, 1);
    expect(chunks).toContainEqual({ chunkX: 2, chunkZ: 4 });
    expect(chunks).toContainEqual({ chunkX: 4, chunkZ: 6 });
  });
});

// ─── generateChunkData ────────────────────────────────────────────────────────

describe("generateChunkData (Spec §17.1)", () => {
  it("returns a heightmap of size CHUNK_SIZE * CHUNK_SIZE", () => {
    const data = generateChunkData("test-seed", 0, 0);
    expect(data.heightmap).toBeInstanceOf(Float32Array);
    expect(data.heightmap.length).toBe(CHUNK_SIZE * CHUNK_SIZE);
  });

  it("is deterministic — same seed+coords → same heightmap", () => {
    const a = generateChunkData("my-seed", 3, -2);
    const b = generateChunkData("my-seed", 3, -2);
    expect(Array.from(a.heightmap)).toEqual(Array.from(b.heightmap));
  });

  it("different chunks produce different heightmaps", () => {
    const a = generateChunkData("my-seed", 0, 0);
    const b = generateChunkData("my-seed", 1, 0);
    // At least one value differs (global coord shift changes noise output)
    const aArr = Array.from(a.heightmap);
    const bArr = Array.from(b.heightmap);
    expect(aArr).not.toEqual(bArr);
  });

  it("different seeds produce different heightmaps for same coords", () => {
    const a = generateChunkData("seed-A", 0, 0);
    const b = generateChunkData("seed-B", 0, 0);
    expect(Array.from(a.heightmap)).not.toEqual(Array.from(b.heightmap));
  });

  it("returns dirty=false (freshly generated)", () => {
    const data = generateChunkData("test-seed", 0, 0);
    expect(data.dirty).toBe(false);
  });

  it("returns biomeBlend with 4 elements", () => {
    const data = generateChunkData("test-seed", 0, 0);
    expect(data.biomeBlend).toHaveLength(4);
  });

  it("returns a non-empty baseColor hex string", () => {
    const data = generateChunkData("test-seed", 0, 0);
    expect(data.baseColor).toMatch(/^#[0-9a-f]{6}$/i);
  });
});

// ─── ChunkManager ─────────────────────────────────────────────────────────────

describe("ChunkManager (Spec §17.1)", () => {
  it("update loads 25 ECS entities for 5x5 buffer ring", () => {
    const mgr = new ChunkManager("test-world");
    mgr.update({ x: 0, y: 0, z: 0 });
    expect(mgr.getLoadedChunks().size).toBe(25);
  });

  it("active chunks (3x3) have renderable.visible=true", () => {
    const mgr = new ChunkManager("test-world");
    mgr.update({ x: 0, y: 0, z: 0 });

    // Active = radius-1 = chunks (-1,-1) to (1,1)
    for (const { chunkX, chunkZ } of getChunksInRadius(0, 0, ACTIVE_RADIUS)) {
      const key = getChunkKey(chunkX, chunkZ);
      const entity = mgr.getLoadedChunks().get(key);
      expect(entity).toBeDefined();
      expect(entity!.renderable!.visible).toBe(true);
    }
  });

  it("buffer-only chunks (outside 3x3, inside 5x5) have renderable.visible=false", () => {
    const mgr = new ChunkManager("test-world");
    mgr.update({ x: 0, y: 0, z: 0 });

    const activeKeys = new Set(
      getChunksInRadius(0, 0, ACTIVE_RADIUS).map(({ chunkX, chunkZ }) =>
        getChunkKey(chunkX, chunkZ),
      ),
    );

    for (const [key, entity] of mgr.getLoadedChunks()) {
      if (!activeKeys.has(key)) {
        expect(entity.renderable!.visible).toBe(false);
      }
    }
  });

  it("all loaded chunks have terrainChunk ECS component", () => {
    const mgr = new ChunkManager("test-world");
    mgr.update({ x: 0, y: 0, z: 0 });

    for (const [, entity] of mgr.getLoadedChunks()) {
      expect(entity.terrainChunk).toBeDefined();
      expect(entity.terrainChunk!.heightmap).toBeInstanceOf(Float32Array);
    }
  });

  it("all loaded chunks have chunk component with correct coords", () => {
    const mgr = new ChunkManager("test-world");
    mgr.update({ x: 0, y: 0, z: 0 });

    for (const [key, entity] of mgr.getLoadedChunks()) {
      const [cx, cz] = key.split(",").map(Number);
      expect(entity.chunk).toBeDefined();
      expect(entity.chunk!.chunkX).toBe(cx);
      expect(entity.chunk!.chunkZ).toBe(cz);
    }
  });

  it("chunk transition — moving one chunk right loads right column", () => {
    const mgr = new ChunkManager("test-world");
    mgr.update({ x: 0, y: 0, z: 0 }); // player at chunk (0,0)

    // Move player to chunk (1,0) — one chunk east
    mgr.update({ x: 16, y: 0, z: 0 }); // player at chunk (1,0)

    // New right column at chunkX=3 (buffer radius 2 from center 1)
    for (let cz = -2; cz <= 2; cz++) {
      const key = getChunkKey(3, cz);
      expect(mgr.getLoadedChunks().has(key)).toBe(true);
    }
  });

  it("chunk transition — moving one chunk right removes left column", () => {
    const mgr = new ChunkManager("test-world");
    mgr.update({ x: 0, y: 0, z: 0 }); // player at chunk (0,0)
    mgr.update({ x: 16, y: 0, z: 0 }); // player at chunk (1,0)

    // Old left column at chunkX=-2 should be unloaded
    for (let cz = -2; cz <= 2; cz++) {
      const key = getChunkKey(-2, cz);
      expect(mgr.getLoadedChunks().has(key)).toBe(false);
    }
  });

  it("chunk transition preserves total 25-chunk count", () => {
    const mgr = new ChunkManager("test-world");
    mgr.update({ x: 0, y: 0, z: 0 });
    mgr.update({ x: 16, y: 0, z: 0 });
    expect(mgr.getLoadedChunks().size).toBe(25);
  });

  it("loaded entities are present in the ECS world", () => {
    const mgr = new ChunkManager("test-world");
    mgr.update({ x: 0, y: 0, z: 0 });

    for (const [, entity] of mgr.getLoadedChunks()) {
      expect(world.entities).toContain(entity);
    }
  });

  it("no-op when player stays in same chunk", () => {
    const mgr = new ChunkManager("test-world");
    mgr.update({ x: 0, y: 0, z: 0 });
    const firstMap = new Map(mgr.getLoadedChunks());

    // Same chunk, different world position within it
    mgr.update({ x: 5, y: 0, z: 7 });

    // Same entities should still be loaded
    expect(mgr.getLoadedChunks().size).toBe(firstMap.size);
    for (const [key, entity] of firstMap) {
      expect(mgr.getLoadedChunks().get(key)).toBe(entity);
    }
  });
});
