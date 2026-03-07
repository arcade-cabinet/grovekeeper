/**
 * Minimap snapshot builder tests (Spec §17.6).
 *
 * Tests the pure `buildMinimapSnapshot` function with plain objects.
 * No ECS, React-Native, or store mocking required.
 */

import { buildMinimapSnapshot, VIEW_RADIUS } from "./snapshot";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const DEFAULT_PARAMS = {
  activeChunks: [],
  discoveredStore: {},
  campfireEntities: [],
  npcEntities: [],
  labyrinthEntities: [],
  spiritEntities: [],
  playerPos: null,
  chunkSize: 16,
  viewRadius: VIEW_RADIUS,
};

// ---------------------------------------------------------------------------
// Player chunk derivation
// ---------------------------------------------------------------------------

describe("buildMinimapSnapshot (Spec §17.6) — player chunk", () => {
  it("defaults to playerChunkX=0, playerChunkZ=0 with no player", () => {
    const snap = buildMinimapSnapshot(DEFAULT_PARAMS);
    expect(snap.playerChunkX).toBe(0);
    expect(snap.playerChunkZ).toBe(0);
    expect(snap.player).toBeNull();
  });

  it("derives chunk coords from world position", () => {
    const snap = buildMinimapSnapshot({
      ...DEFAULT_PARAMS,
      playerPos: { x: 32, z: 48 }, // chunkX=2, chunkZ=3 with chunkSize=16
    });
    expect(snap.playerChunkX).toBe(2);
    expect(snap.playerChunkZ).toBe(3);
    expect(snap.player).toEqual({ x: 32, z: 48 });
  });
});

// ---------------------------------------------------------------------------
// Chunk grid fog-of-war
// ---------------------------------------------------------------------------

describe("buildMinimapSnapshot (Spec §17.6) — fog of war", () => {
  it("produces (2*VIEW_RADIUS+1)^2 chunk cells", () => {
    const snap = buildMinimapSnapshot(DEFAULT_PARAMS);
    const diameter = VIEW_RADIUS * 2 + 1;
    expect(snap.chunks).toHaveLength(diameter * diameter);
  });

  it("marks undiscovered chunks as discovered=false", () => {
    const snap = buildMinimapSnapshot(DEFAULT_PARAMS);
    expect(snap.chunks.every((c) => !c.discovered)).toBe(true);
  });

  it("marks active chunks as discovered=true with biomeColor", () => {
    const snap = buildMinimapSnapshot({
      ...DEFAULT_PARAMS,
      playerPos: { x: 0, z: 0 },
      activeChunks: [{ chunkX: 0, chunkZ: 0, baseColor: "#2D6A4F" }],
    });
    const origin = snap.chunks.find((c) => c.chunkX === 0 && c.chunkZ === 0);
    expect(origin?.discovered).toBe(true);
    expect(origin?.biomeColor).toBe("#2D6A4F");
  });

  it("marks store-discovered chunks as discovered=true", () => {
    const snap = buildMinimapSnapshot({
      ...DEFAULT_PARAMS,
      playerPos: { x: 0, z: 0 },
      discoveredStore: { "1,0": "#52B788" },
    });
    const chunk = snap.chunks.find((c) => c.chunkX === 1 && c.chunkZ === 0);
    expect(chunk?.discovered).toBe(true);
    expect(chunk?.biomeColor).toBe("#52B788");
  });

  it("active chunk takes precedence over store color", () => {
    const snap = buildMinimapSnapshot({
      ...DEFAULT_PARAMS,
      playerPos: { x: 0, z: 0 },
      activeChunks: [{ chunkX: 0, chunkZ: 0, baseColor: "#FRESH" }],
      discoveredStore: { "0,0": "#STALE" },
    });
    const origin = snap.chunks.find((c) => c.chunkX === 0 && c.chunkZ === 0);
    expect(origin?.biomeColor).toBe("#FRESH");
  });

  it("chunk outside view radius is not included", () => {
    const snap = buildMinimapSnapshot({
      ...DEFAULT_PARAMS,
      playerPos: { x: 0, z: 0 },
      activeChunks: [{ chunkX: 99, chunkZ: 99, baseColor: "#FAR" }],
    });
    const farChunk = snap.chunks.find((c) => c.chunkX === 99);
    expect(farChunk).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Campfire filtering
// ---------------------------------------------------------------------------

describe("buildMinimapSnapshot (Spec §17.6) — campfire markers", () => {
  it("includes campfires within view range", () => {
    const snap = buildMinimapSnapshot({
      ...DEFAULT_PARAMS,
      playerPos: { x: 0, z: 0 },
      campfireEntities: [
        { worldX: 10, worldZ: 10, fastTravelId: "cf-1", lit: true },
      ],
    });
    expect(snap.campfires).toHaveLength(1);
    expect(snap.campfires[0].fastTravelId).toBe("cf-1");
  });

  it("excludes campfires outside view range", () => {
    const viewWorldRadius = VIEW_RADIUS * 16; // chunkSize=16
    const snap = buildMinimapSnapshot({
      ...DEFAULT_PARAMS,
      playerPos: { x: 0, z: 0 },
      campfireEntities: [
        { worldX: viewWorldRadius + 1, worldZ: 0, fastTravelId: "cf-far", lit: false },
      ],
    });
    expect(snap.campfires).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// NPC dots filtering
// ---------------------------------------------------------------------------

describe("buildMinimapSnapshot (Spec §17.6) — NPC dots", () => {
  it("includes nearby NPCs", () => {
    const snap = buildMinimapSnapshot({
      ...DEFAULT_PARAMS,
      playerPos: { x: 0, z: 0 },
      npcEntities: [{ worldX: 8, worldZ: 8 }],
    });
    expect(snap.npcs).toHaveLength(1);
  });

  it("excludes distant NPCs", () => {
    const viewWorldRadius = VIEW_RADIUS * 16;
    const snap = buildMinimapSnapshot({
      ...DEFAULT_PARAMS,
      playerPos: { x: 0, z: 0 },
      npcEntities: [{ worldX: viewWorldRadius + 50, worldZ: 0 }],
    });
    expect(snap.npcs).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Labyrinth markers
// ---------------------------------------------------------------------------

describe("buildMinimapSnapshot (Spec §17.6) — labyrinth markers", () => {
  it("includes labyrinths within view range", () => {
    const snap = buildMinimapSnapshot({
      ...DEFAULT_PARAMS,
      playerPos: { x: 0, z: 0 },
      labyrinthEntities: [{ worldX: 10, worldZ: 10, explored: false }],
    });
    expect(snap.labyrinths).toHaveLength(1);
    expect(snap.labyrinths[0].explored).toBe(false);
  });

  it("excludes labyrinths outside view range", () => {
    const viewWorldRadius = VIEW_RADIUS * 16;
    const snap = buildMinimapSnapshot({
      ...DEFAULT_PARAMS,
      playerPos: { x: 0, z: 0 },
      labyrinthEntities: [{ worldX: viewWorldRadius + 1, worldZ: 0, explored: true }],
    });
    expect(snap.labyrinths).toHaveLength(0);
  });

  it("carries explored flag correctly for an explored labyrinth", () => {
    const snap = buildMinimapSnapshot({
      ...DEFAULT_PARAMS,
      playerPos: { x: 0, z: 0 },
      labyrinthEntities: [{ worldX: 5, worldZ: 5, explored: true }],
    });
    expect(snap.labyrinths[0].explored).toBe(true);
  });

  it("carries explored flag correctly for an unexplored labyrinth", () => {
    const snap = buildMinimapSnapshot({
      ...DEFAULT_PARAMS,
      playerPos: { x: 0, z: 0 },
      labyrinthEntities: [{ worldX: 5, worldZ: 5, explored: false }],
    });
    expect(snap.labyrinths[0].explored).toBe(false);
  });

  it("multiple labyrinths are all included when within view", () => {
    const snap = buildMinimapSnapshot({
      ...DEFAULT_PARAMS,
      playerPos: { x: 0, z: 0 },
      labyrinthEntities: [
        { worldX: 5, worldZ: 5, explored: true },
        { worldX: -5, worldZ: 3, explored: false },
      ],
    });
    expect(snap.labyrinths).toHaveLength(2);
  });

  it("snapshot has empty labyrinths array when no labyrinth entities provided", () => {
    const snap = buildMinimapSnapshot(DEFAULT_PARAMS);
    expect(snap.labyrinths).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Spirit markers
// ---------------------------------------------------------------------------

describe("buildMinimapSnapshot (Spec §17.6) — spirit markers", () => {
  it("includes spirits within view range", () => {
    const snap = buildMinimapSnapshot({
      ...DEFAULT_PARAMS,
      playerPos: { x: 0, z: 0 },
      spiritEntities: [{ worldX: 8, worldZ: 8, spiritId: "spirit-0", discovered: false }],
    });
    expect(snap.spirits).toHaveLength(1);
    expect(snap.spirits[0].spiritId).toBe("spirit-0");
  });

  it("excludes spirits outside view range", () => {
    const viewWorldRadius = VIEW_RADIUS * 16;
    const snap = buildMinimapSnapshot({
      ...DEFAULT_PARAMS,
      playerPos: { x: 0, z: 0 },
      spiritEntities: [
        { worldX: viewWorldRadius + 1, worldZ: 0, spiritId: "spirit-far", discovered: true },
      ],
    });
    expect(snap.spirits).toHaveLength(0);
  });

  it("carries discovered=false for undiscovered spirit", () => {
    const snap = buildMinimapSnapshot({
      ...DEFAULT_PARAMS,
      playerPos: { x: 0, z: 0 },
      spiritEntities: [{ worldX: 4, worldZ: 4, spiritId: "spirit-1", discovered: false }],
    });
    expect(snap.spirits[0].discovered).toBe(false);
  });

  it("carries discovered=true for discovered spirit", () => {
    const snap = buildMinimapSnapshot({
      ...DEFAULT_PARAMS,
      playerPos: { x: 0, z: 0 },
      spiritEntities: [{ worldX: 4, worldZ: 4, spiritId: "spirit-2", discovered: true }],
    });
    expect(snap.spirits[0].discovered).toBe(true);
  });

  it("spiritId is preserved from entity", () => {
    const snap = buildMinimapSnapshot({
      ...DEFAULT_PARAMS,
      playerPos: { x: 0, z: 0 },
      spiritEntities: [{ worldX: 0, worldZ: 0, spiritId: "spirit-maze-3", discovered: false }],
    });
    expect(snap.spirits[0].spiritId).toBe("spirit-maze-3");
  });

  it("snapshot has empty spirits array when no spirit entities provided", () => {
    const snap = buildMinimapSnapshot(DEFAULT_PARAMS);
    expect(snap.spirits).toHaveLength(0);
  });

  it("multiple spirits are all included when within view", () => {
    const snap = buildMinimapSnapshot({
      ...DEFAULT_PARAMS,
      playerPos: { x: 0, z: 0 },
      spiritEntities: [
        { worldX: 3, worldZ: 3, spiritId: "spirit-a", discovered: true },
        { worldX: -3, worldZ: 3, spiritId: "spirit-b", discovered: false },
        { worldX: 0, worldZ: -3, spiritId: "spirit-c", discovered: true },
      ],
    });
    expect(snap.spirits).toHaveLength(3);
  });
});
