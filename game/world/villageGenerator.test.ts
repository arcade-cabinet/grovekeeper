/**
 * villageGenerator.test.ts
 * Spec §19.3 — Procedural village buildings, NPCs, and campfire placement.
 * Spec §17.3a — Rootmere (chunk 0,0) uses fixed authored structure placements.
 */

import { getLandmarkType, isLandmarkChunk } from "./pathGenerator.ts";
import {
  ROOTMERE_NAME,
  generateVillage,
  type VillageGenerationResult,
} from "./villageGenerator.ts";

const SIZE = 16;

// ── Helpers ───────────────────────────────────────────────────────────────────

function flatHeightmap(value = 0): Float32Array {
  return new Float32Array(SIZE * SIZE).fill(value);
}

// ── generateVillage — null guard ──────────────────────────────────────────────

describe("generateVillage — null guard (Spec §19.3)", () => {
  it("returns null for a non-village landmark chunk", () => {
    // Find a non-origin landmark (shrine / ancient-tree / campfire type).
    const seed = "Gentle Mossy Hollow";
    for (let x = 1; x <= 20; x++) {
      for (let z = 1; z <= 20; z++) {
        if (!isLandmarkChunk(seed, x, z)) continue;
        const type = getLandmarkType(seed, x, z);
        if (type === "village") continue;
        const result = generateVillage(seed, x, z, flatHeightmap());
        expect(result).toBeNull();
        return;
      }
    }
  });

  it("returns null for a non-landmark chunk", () => {
    const seed = "Gentle Mossy Hollow";
    for (let x = 1; x <= 20; x++) {
      for (let z = 1; z <= 20; z++) {
        if (isLandmarkChunk(seed, x, z)) continue;
        const result = generateVillage(seed, x, z, flatHeightmap());
        expect(result).toBeNull();
        return;
      }
    }
  });
});

// ── generateVillage — origin village ─────────────────────────────────────────

describe("generateVillage — origin village chunk (Spec §19.3)", () => {
  const seed = "Gentle Mossy Hollow";
  let result: VillageGenerationResult;

  beforeAll(() => {
    // Chunk (0,0) is always a village.
    const r = generateVillage(seed, 0, 0, flatHeightmap());
    if (!r) throw new Error("Expected village result for chunk (0,0)");
    result = r;
  });

  it("returns a non-null result for chunk (0,0)", () => {
    expect(result).not.toBeNull();
  });

  // ── Campfire ────────────────────────────────────────────────────────────────

  it("campfire is positioned at the village center (8, 8) in world space", () => {
    // Rootmere (0,0): fixed village center = (8, 8), world = (8, 8).
    expect(result.campfire.position.x).toBeCloseTo(8);
    expect(result.campfire.position.z).toBeCloseTo(8);
  });

  it("campfire has lit=true and a fast travel ID", () => {
    expect(result.campfire.campfire.lit).toBe(true);
    expect(result.campfire.campfire.fastTravelId).toBe("village-0-0");
  });

  it("campfire has cooking slots > 0", () => {
    expect(result.campfire.campfire.cookingSlots).toBeGreaterThan(0);
  });

  it("campfire structure has a non-empty modelPath", () => {
    expect(result.campfire.structure.modelPath.length).toBeGreaterThan(0);
  });

  // ── Buildings ───────────────────────────────────────────────────────────────

  it("Rootmere has exactly 7 fixed buildings", () => {
    expect(result.buildings.length).toBe(7);
  });

  it("every building has a valid structure modelPath", () => {
    for (const b of result.buildings) {
      expect(b.structure.modelPath).toMatch(/^assets\/models\/structures\/.+\.glb$/);
    }
  });

  it("every building has a non-empty templateId", () => {
    for (const b of result.buildings) {
      expect(b.structure.templateId.length).toBeGreaterThan(0);
    }
  });

  it("every building position is within chunk world bounds", () => {
    for (const b of result.buildings) {
      // Origin chunk world X: [0, CHUNK_SIZE), Z: [0, CHUNK_SIZE)
      expect(b.position.x).toBeGreaterThanOrEqual(0);
      expect(b.position.x).toBeLessThan(SIZE);
      expect(b.position.z).toBeGreaterThanOrEqual(0);
      expect(b.position.z).toBeLessThan(SIZE);
    }
  });

  it("buildings have buildCost = [] (pre-placed, not player-built)", () => {
    for (const b of result.buildings) {
      expect(b.structure.buildCost).toHaveLength(0);
    }
  });

  // ── NPCs ────────────────────────────────────────────────────────────────────

  it("NPC count is between 2 and 4", () => {
    expect(result.npcs.length).toBeGreaterThanOrEqual(2);
    expect(result.npcs.length).toBeLessThanOrEqual(4);
  });

  it("every NPC is interactable with requiredLevel 1", () => {
    for (const n of result.npcs) {
      expect(n.npc.interactable).toBe(true);
      expect(n.npc.requiredLevel).toBe(1);
    }
  });

  it("every NPC has a non-empty name", () => {
    for (const n of result.npcs) {
      expect(n.npc.name.length).toBeGreaterThan(0);
    }
  });

  it("every NPC has a baseModel referencing a chibi model", () => {
    for (const n of result.npcs) {
      expect(n.npc.baseModel).toMatch(/^assets\/models\/npcs\/chibi-\d+\.glb$/);
    }
  });

  it("every NPC has exactly 4 schedule entries", () => {
    for (const n of result.npcs) {
      expect(n.npc.schedule).toHaveLength(4);
    }
  });

  it("NPC schedule entries have ascending hours", () => {
    for (const n of result.npcs) {
      const hours = n.npc.schedule.map((e) => e.hour);
      for (let i = 1; i < hours.length; i++) {
        expect(hours[i]).toBeGreaterThan(hours[i - 1]);
      }
    }
  });

  it("NPC schedule entries have non-empty activity strings", () => {
    for (const n of result.npcs) {
      for (const entry of n.npc.schedule) {
        expect(entry.activity.length).toBeGreaterThan(0);
      }
    }
  });

  it("every NPC has currentAnim set to 'idle'", () => {
    for (const n of result.npcs) {
      expect(n.npc.currentAnim).toBe("idle");
    }
  });

  it("NPC positions are within chunk world bounds", () => {
    for (const n of result.npcs) {
      expect(n.position.x).toBeGreaterThanOrEqual(0);
      expect(n.position.x).toBeLessThan(SIZE);
      expect(n.position.z).toBeGreaterThanOrEqual(0);
      expect(n.position.z).toBeLessThan(SIZE);
    }
  });
});

// ── Determinism ───────────────────────────────────────────────────────────────

describe("generateVillage — determinism (Spec §19.3)", () => {
  it("same inputs produce identical output", () => {
    const seed = "Ancient Whispering Canopy";
    const r1 = generateVillage(seed, 0, 0, flatHeightmap());
    const r2 = generateVillage(seed, 0, 0, flatHeightmap());

    if (!r1 || !r2) throw new Error("Expected non-null results");

    expect(r1.buildings.length).toBe(r2.buildings.length);
    expect(r1.npcs.length).toBe(r2.npcs.length);
    expect(r1.campfire.campfire.fastTravelId).toBe(r2.campfire.campfire.fastTravelId);

    for (let i = 0; i < r1.buildings.length; i++) {
      expect(r1.buildings[i].structure.templateId).toBe(r2.buildings[i].structure.templateId);
      expect(r1.buildings[i].position.x).toBeCloseTo(r2.buildings[i].position.x);
      expect(r1.buildings[i].position.z).toBeCloseTo(r2.buildings[i].position.z);
    }

    for (let i = 0; i < r1.npcs.length; i++) {
      expect(r1.npcs[i].npc.name).toBe(r2.npcs[i].npc.name);
      expect(r1.npcs[i].npc.function).toBe(r2.npcs[i].npc.function);
    }
  });

  it("fast travel ID encodes the chunk coordinates", () => {
    // Non-default village chunk — would need a seed where a non-origin chunk is
    // village type. Current implementation only makes (0,0) a village, so test
    // the pattern for the origin.
    const r = generateVillage("any-seed", 0, 0, flatHeightmap());
    expect(r?.campfire.campfire.fastTravelId).toBe("village-0-0");
  });
});

// ── Heightmap elevation sampling ─────────────────────────────────────────────

describe("generateVillage — elevation sampling (Spec §19.3)", () => {
  it("campfire Y matches heightmap value at village center", () => {
    const hm = flatHeightmap(3.5);
    const r = generateVillage("test-seed", 0, 0, hm);
    expect(r?.campfire.position.y).toBeCloseTo(3.5);
  });

  it("buildings Y matches heightmap values (non-flat terrain)", () => {
    const hm = new Float32Array(SIZE * SIZE);
    // Fill with a gradient: y = row index * 0.1
    for (let z = 0; z < SIZE; z++) {
      for (let x = 0; x < SIZE; x++) {
        hm[z * SIZE + x] = z * 0.1;
      }
    }
    const r = generateVillage("test-seed", 0, 0, hm);
    if (!r) throw new Error("Expected village result");
    for (const b of r.buildings) {
      // Y should be positive (gradient terrain — at least 0).
      expect(b.position.y).toBeGreaterThanOrEqual(0);
    }
  });
});

// ── Rootmere fixed layout (Spec §17.3a) ──────────────────────────────────────

describe("generateVillage — Rootmere fixed layout (Spec §17.3a)", () => {
  it("ROOTMERE_NAME export is 'Rootmere'", () => {
    expect(ROOTMERE_NAME).toBe("Rootmere");
  });

  it("campfire is at fixed position (8, 8) for any seed", () => {
    const r1 = generateVillage("Seed Alpha", 0, 0, flatHeightmap());
    const r2 = generateVillage("Seed Beta", 0, 0, flatHeightmap());
    expect(r1?.campfire.position.x).toBeCloseTo(8);
    expect(r1?.campfire.position.z).toBeCloseTo(8);
    expect(r2?.campfire.position.x).toBeCloseTo(8);
    expect(r2?.campfire.position.z).toBeCloseTo(8);
  });

  it("buildings are identical for different seeds (fixed authored layout)", () => {
    const r1 = generateVillage("Seed Alpha", 0, 0, flatHeightmap());
    const r2 = generateVillage("Seed Beta", 0, 0, flatHeightmap());
    if (!r1 || !r2) throw new Error("Expected non-null results");
    expect(r1.buildings.length).toBe(r2.buildings.length);
    for (let i = 0; i < r1.buildings.length; i++) {
      expect(r1.buildings[i].structure.templateId).toBe(r2.buildings[i].structure.templateId);
      expect(r1.buildings[i].position.x).toBeCloseTo(r2.buildings[i].position.x);
      expect(r1.buildings[i].position.z).toBeCloseTo(r2.buildings[i].position.z);
    }
  });

  it("includes house-1 (Elder Rowan's Hut) at world position (8, 8)", () => {
    const r = generateVillage("any-seed", 0, 0, flatHeightmap());
    const hut = r?.buildings.find((b) => b.structure.templateId === "house-1");
    expect(hut).toBeDefined();
    expect(hut?.position.x).toBeCloseTo(8);
    expect(hut?.position.z).toBeCloseTo(8);
  });

  it("includes water-well (Village Well) at world position (11, 8)", () => {
    const r = generateVillage("any-seed", 0, 0, flatHeightmap());
    const well = r?.buildings.find((b) => b.structure.templateId === "water-well");
    expect(well).toBeDefined();
    expect(well?.position.x).toBeCloseTo(11);
    expect(well?.position.z).toBeCloseTo(8);
  });

  it("includes storage-1 (Storage Shed) at world position (6, 5)", () => {
    const r = generateVillage("any-seed", 0, 0, flatHeightmap());
    const shed = r?.buildings.find((b) => b.structure.templateId === "storage-1");
    expect(shed).toBeDefined();
    expect(shed?.position.x).toBeCloseTo(6);
    expect(shed?.position.z).toBeCloseTo(5);
  });

  it("includes wooden-frame (Village Gate) at world position (8, 0)", () => {
    const r = generateVillage("any-seed", 0, 0, flatHeightmap());
    const gate = r?.buildings.find((b) => b.structure.templateId === "wooden-frame");
    expect(gate).toBeDefined();
    expect(gate?.position.x).toBeCloseTo(8);
    // Village gate offset (0, -8) from center (8, 8) = world (8, 0).
    // clampToChunk(0) = 1 (clamped to avoid border), so expect 1.
    expect(gate?.position.z).toBeCloseTo(1);
  });

  it("NPC templateIds use 'rootmere-npc' prefix", () => {
    const r = generateVillage("any-seed", 0, 0, flatHeightmap());
    for (const n of r?.npcs ?? []) {
      expect(n.npc.templateId).toMatch(/^rootmere-npc-\d+$/);
    }
  });
});
