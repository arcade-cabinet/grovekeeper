/**
 * ChunkManager tests (Spec §17.1)
 *
 * Tests cover:
 *  - Pure coordinate helpers (worldToChunkCoords, getChunksInRadius, getChunkKey)
 *  - generateChunkData determinism and output shape
 *  - ChunkManager.update loads 3x3 active + 5x5 buffer ring
 *  - Chunk transitions: new chunks loaded, old chunks removed
 *  - Async generation: chunks queued after update, loaded after flushQueue
 *  - Runtime wiring: update() is called as player position changes (FIX-01)
 *  - applyChunkDiff wiring: player-planted trees survive chunk unload/reload (FIX-02)
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
} from "./ChunkManager.ts";
import { clearAllChunkDiffs, type PlantedTree, recordPlantedTree } from "./chunkPersistence.ts";

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

  it("different seeds produce different heightmaps for same non-origin coords", () => {
    // Note: chunk (0,0) is intentionally flat for all seeds (Rootmere — Spec §17.3a).
    // Use chunk (1,0) where natural terrain varies by seed.
    const a = generateChunkData("seed-A", 1, 0);
    const b = generateChunkData("seed-B", 1, 0);
    expect(Array.from(a.heightmap)).not.toEqual(Array.from(b.heightmap));
  });

  it("chunk (0,0) heightmap is identical for any seed (Rootmere fixed terrain — Spec §17.3a)", () => {
    const a = generateChunkData("seed-A", 0, 0);
    const b = generateChunkData("seed-B", 0, 0);
    expect(Array.from(a.heightmap)).toEqual(Array.from(b.heightmap));
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

// ─── ChunkManager async generation (Spec §17.1) ───────────────────────────────

describe("ChunkManager async generation (Spec §17.1)", () => {
  it("update() queues chunks as pending before generation completes", () => {
    const mgr = new ChunkManager("test-world");
    mgr.update({ x: 0, y: 0, z: 0 });

    // Chunks are queued but not yet loaded (no flushQueue call)
    expect(mgr.getPendingChunkCount()).toBe(25);
    expect(mgr.getLoadedChunks().size).toBe(0);
  });

  it("flushQueue() completes all pending generation", () => {
    const mgr = new ChunkManager("test-world");
    mgr.update({ x: 0, y: 0, z: 0 });
    mgr.flushQueue();

    expect(mgr.getPendingChunkCount()).toBe(0);
    expect(mgr.getLoadedChunks().size).toBe(25);
  });

  it("chunks outside desired range are cancelled before generation", () => {
    const mgr = new ChunkManager("test-world");
    mgr.update({ x: 0, y: 0, z: 0 }); // queues 25 chunks around (0,0)
    // Immediately move far away — old chunks should be cancelled
    mgr.update({ x: 1000, y: 0, z: 1000 }); // chunk (62,62)

    mgr.flushQueue();

    // Old chunks around (0,0) must not be loaded
    const key = getChunkKey(0, 0);
    expect(mgr.getLoadedChunks().has(key)).toBe(false);

    // New chunks around (62,62) must be loaded
    const newCenter = getChunkKey(62, 62);
    expect(mgr.getLoadedChunks().has(newCenter)).toBe(true);
  });

  it("second update before flush only queues new chunks, not already-pending ones", () => {
    const mgr = new ChunkManager("test-world");
    mgr.update({ x: 0, y: 0, z: 0 }); // queues 25

    // Same position — no-op, queue stays at 25
    mgr.update({ x: 5, y: 0, z: 7 });
    expect(mgr.getPendingChunkCount()).toBe(25);
  });
});

// ─── ChunkManager (with flushQueue) ───────────────────────────────────────────

describe("ChunkManager (Spec §17.1)", () => {
  it("update loads 25 ECS entities for 5x5 buffer ring", () => {
    const mgr = new ChunkManager("test-world");
    mgr.update({ x: 0, y: 0, z: 0 });
    mgr.flushQueue();
    expect(mgr.getLoadedChunks().size).toBe(25);
  });

  it("active chunks (3x3) have renderable.visible=true", () => {
    const mgr = new ChunkManager("test-world");
    mgr.update({ x: 0, y: 0, z: 0 });
    mgr.flushQueue();

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
    mgr.flushQueue();

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
    mgr.flushQueue();

    for (const [, entity] of mgr.getLoadedChunks()) {
      expect(entity.terrainChunk).toBeDefined();
      expect(entity.terrainChunk!.heightmap).toBeInstanceOf(Float32Array);
    }
  });

  it("all loaded chunks have chunk component with correct coords", () => {
    const mgr = new ChunkManager("test-world");
    mgr.update({ x: 0, y: 0, z: 0 });
    mgr.flushQueue();

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
    mgr.flushQueue();

    // Move player to chunk (1,0) — one chunk east
    mgr.update({ x: 16, y: 0, z: 0 }); // player at chunk (1,0)
    mgr.flushQueue();

    // New right column at chunkX=3 (buffer radius 2 from center 1)
    for (let cz = -2; cz <= 2; cz++) {
      const key = getChunkKey(3, cz);
      expect(mgr.getLoadedChunks().has(key)).toBe(true);
    }
  });

  it("chunk transition — moving one chunk right removes left column", () => {
    const mgr = new ChunkManager("test-world");
    mgr.update({ x: 0, y: 0, z: 0 }); // player at chunk (0,0)
    mgr.flushQueue();
    mgr.update({ x: 16, y: 0, z: 0 }); // player at chunk (1,0)
    mgr.flushQueue();

    // Old left column at chunkX=-2 should be unloaded
    for (let cz = -2; cz <= 2; cz++) {
      const key = getChunkKey(-2, cz);
      expect(mgr.getLoadedChunks().has(key)).toBe(false);
    }
  });

  it("chunk transition preserves total 25-chunk count", () => {
    const mgr = new ChunkManager("test-world");
    mgr.update({ x: 0, y: 0, z: 0 });
    mgr.flushQueue();
    mgr.update({ x: 16, y: 0, z: 0 });
    mgr.flushQueue();
    expect(mgr.getLoadedChunks().size).toBe(25);
  });

  it("loaded entities are present in the ECS world", () => {
    const mgr = new ChunkManager("test-world");
    mgr.update({ x: 0, y: 0, z: 0 });
    mgr.flushQueue();

    for (const [, entity] of mgr.getLoadedChunks()) {
      expect(world.entities).toContain(entity);
    }
  });

  it("no-op when player stays in same chunk", () => {
    const mgr = new ChunkManager("test-world");
    mgr.update({ x: 0, y: 0, z: 0 });
    mgr.flushQueue();
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

// ─── FIX-01: update() drives streaming as player moves ────────────────────────
//
// These tests verify the runtime contract: calling update() with a changing
// player position causes correct chunk transitions without any external
// orchestration.  They simulate what ChunkStreamer does every frame.

describe("FIX-01 — update() drives streaming as player position changes (Spec §17.1)", () => {
  it("calling update() twice with different chunk coords transitions the world", () => {
    const mgr = new ChunkManager("runtime-test");

    // Frame 1: player at world origin
    mgr.update({ x: 0, y: 0, z: 0 });
    mgr.flushQueue();
    expect(mgr.getLoadedChunks().has(getChunkKey(0, 0))).toBe(true);

    // Frame N: player has walked to chunk (3, 0)
    mgr.update({ x: 3 * CHUNK_SIZE, y: 0, z: 0 });
    mgr.flushQueue();
    expect(mgr.getLoadedChunks().has(getChunkKey(3, 0))).toBe(true);
  });

  it("update() with new chunk position loads 25 chunks centered on new position", () => {
    const mgr = new ChunkManager("runtime-test");
    mgr.update({ x: 5 * CHUNK_SIZE, y: 0, z: 5 * CHUNK_SIZE }); // chunk (5, 5)
    mgr.flushQueue();
    expect(mgr.getLoadedChunks().size).toBe(25);
    // Center chunk must be loaded
    expect(mgr.getLoadedChunks().has(getChunkKey(5, 5))).toBe(true);
  });

  it("repeated update() calls simulating player walking across chunk boundaries", () => {
    const mgr = new ChunkManager("runtime-test");

    // Simulate three sequential frame batches as player walks east
    const positions = [
      { x: 0, y: 0, z: 0 }, // chunk (0, 0)
      { x: CHUNK_SIZE, y: 0, z: 0 }, // chunk (1, 0)
      { x: 2 * CHUNK_SIZE, y: 0, z: 0 }, // chunk (2, 0)
    ];

    for (const pos of positions) {
      mgr.update(pos);
      mgr.flushQueue();
    }

    // After all moves, 25 chunks centred on (2, 0) must be loaded
    expect(mgr.getLoadedChunks().size).toBe(25);
    expect(mgr.getLoadedChunks().has(getChunkKey(2, 0))).toBe(true);

    // Chunks far to the left must have been unloaded
    expect(mgr.getLoadedChunks().has(getChunkKey(-2, 0))).toBe(false);
  });

  it("update() with the same position is a no-op after initialization", () => {
    const mgr = new ChunkManager("runtime-test");
    mgr.update({ x: 0, y: 0, z: 0 });
    mgr.flushQueue();
    const beforeSize = mgr.getLoadedChunks().size;

    // Simulate many frames without moving
    for (let i = 0; i < 10; i++) {
      mgr.update({ x: 0, y: 0, z: 0 });
    }

    // No additional chunks should have been queued
    expect(mgr.getPendingChunkCount()).toBe(0);
    expect(mgr.getLoadedChunks().size).toBe(beforeSize);
  });
});

// ─── FIX-02: applyChunkDiff restores player-planted trees on chunk reload ─────

describe("FIX-02 — applyChunkDiff called in loadChunk restores planted trees (Spec §26.2)", () => {
  beforeEach(() => {
    clearAllChunkDiffs();
    for (const entity of [...world.entities]) {
      world.remove(entity);
    }
  });

  it("player-planted tree survives chunk unload and reload via ChunkManager", () => {
    const tree: PlantedTree = {
      localX: 4,
      localZ: 6,
      speciesId: "white-oak",
      stage: 1,
      progress: 0.4,
      plantedAt: 12345,
      meshSeed: 99,
    };

    // Record a planted tree in chunk (0, 0)
    recordPlantedTree("0,0", tree);

    // Load chunk (0, 0) via ChunkManager — applyChunkDiff must be called inside loadChunk
    const mgr = new ChunkManager("test-world");
    mgr.update({ x: 0, y: 0, z: 0 });
    mgr.flushQueue();

    // The player-planted tree entity must be in the ECS world
    const treeEntities = world
      .with("tree")
      .entities.filter((e) => e.tree?.speciesId === "white-oak" && e.tree.wild === false);
    expect(treeEntities.length).toBeGreaterThanOrEqual(1);
  });

  it("player-planted tree position is correct after chunk reload", () => {
    const chunkX = 1;
    const chunkZ = 0;
    const chunkKey = `${chunkX},${chunkZ}`;
    const localX = 8;
    const localZ = 3;

    const tree: PlantedTree = {
      localX,
      localZ,
      speciesId: "pine",
      stage: 0,
      progress: 0,
      plantedAt: 9999,
      meshSeed: 7,
    };
    recordPlantedTree(chunkKey, tree);

    const mgr = new ChunkManager("test-world");
    // Position player inside chunk (1, 0) — x in [16, 31]
    mgr.update({ x: chunkX * CHUNK_SIZE + 8, y: 0, z: 0 });
    mgr.flushQueue();

    const expectedX = chunkX * CHUNK_SIZE + localX;
    const expectedZ = chunkZ * CHUNK_SIZE + localZ;

    const planted = world
      .with("tree", "position")
      .entities.find(
        (e) =>
          e.tree?.speciesId === "pine" &&
          e.position?.x === expectedX &&
          e.position?.z === expectedZ,
      );
    expect(planted).toBeDefined();
  });

  it("chunk with no diff spawns no extra tree entities from persistence", () => {
    // Chunk (5, 5) has never been modified — no diff entry
    const mgr = new ChunkManager("test-world");
    mgr.update({ x: 5 * CHUNK_SIZE, y: 0, z: 5 * CHUNK_SIZE });
    mgr.flushQueue();

    // All trees in the ECS world should be wild (from entitySpawner), none player-planted
    const playerTrees = world.with("tree").entities.filter((e) => e.tree?.wild === false);
    expect(playerTrees.length).toBe(0);
  });
});
