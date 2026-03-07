/**
 * Kitbashing system tests.
 * Tests modular base building: snap validation, placement, base value, unlocks.
 */

import {
  getAvailableSnapPoints,
  validatePlacement,
  calculateBaseValue,
  getUnlockedPieces,
  getUnlockedMaterials,
  checkSnapDirectionMatch,
  checkClearance,
  checkGroundContact,
  validatePlacementWithRapier,
} from "./kitbashing";
import type { KitbashRapierWorld, KitbashRapierModule } from "./kitbashing";
import type { Entity } from "../ecs/world";
import type { ModularPieceComponent, SnapPoint } from "../ecs/components/building";

function makePiece(overrides: Partial<ModularPieceComponent> = {}): ModularPieceComponent {
  return {
    pieceType: "wall",
    variant: "wood-01",
    modelPath: "assets/models/modular/walls/wall_hr_1.glb",
    gridX: 0,
    gridY: 0,
    gridZ: 0,
    rotation: 0,
    snapPoints: [
      { localPosition: { x: -0.5, y: 0, z: 0 }, direction: "west", accepts: ["wall", "pillar", "door", "window"] },
      { localPosition: { x: 0.5, y: 0, z: 0 }, direction: "east", accepts: ["wall", "pillar", "door", "window"] },
      { localPosition: { x: 0, y: 0.5, z: 0 }, direction: "up", accepts: ["wall", "roof", "floor", "beam"] },
      { localPosition: { x: 0, y: -0.5, z: 0 }, direction: "down", accepts: ["wall", "foundation", "floor"] },
    ],
    materialType: "wood",
    ...overrides,
  };
}

function makeEntity(piece: ModularPieceComponent): Entity {
  return {
    id: `test_${piece.gridX}_${piece.gridY}_${piece.gridZ}`,
    modularPiece: piece,
  } as Entity;
}

describe("Kitbashing System", () => {
  describe("validatePlacement", () => {
    it("should allow first piece anywhere", () => {
      const piece = makePiece();
      expect(validatePlacement(piece, [])).toBe(true);
    });

    it("should reject collision at same grid position with same type", () => {
      const existing = makePiece();
      const newPiece = makePiece();
      expect(validatePlacement(newPiece, [makeEntity(existing)])).toBe(false);
    });

    it("should allow placement at adjacent grid position with snap connection", () => {
      const existing = makePiece({ gridX: 0 });
      const newPiece = makePiece({ gridX: 1 });
      expect(validatePlacement(newPiece, [makeEntity(existing)])).toBe(true);
    });

    it("should reject placement with no snap connection", () => {
      const existing = makePiece({ gridX: 0 });
      const newPiece = makePiece({ gridX: 5 });
      expect(validatePlacement(newPiece, [makeEntity(existing)])).toBe(false);
    });
  });

  describe("getAvailableSnapPoints", () => {
    it("should return snap points that accept the new piece type", () => {
      const existing = makePiece();
      const newPiece = makePiece({ gridX: 1 });
      const snaps = getAvailableSnapPoints([makeEntity(existing)], newPiece);
      expect(snaps.length).toBeGreaterThan(0);
    });

    it("should return empty for incompatible piece types", () => {
      const existing = makePiece({
        snapPoints: [
          { localPosition: { x: 0.5, y: 0, z: 0 }, direction: "east", accepts: ["roof"] },
        ],
      });
      const newPiece = makePiece({ pieceType: "stairs" });
      const snaps = getAvailableSnapPoints([makeEntity(existing)], newPiece);
      expect(snaps.length).toBe(0);
    });
  });

  describe("calculateBaseValue", () => {
    it("should sum piece values from config", () => {
      const entities: Entity[] = [
        makeEntity(makePiece({ pieceType: "wall" })),
        makeEntity(makePiece({ pieceType: "floor", gridX: 1 })),
        makeEntity(makePiece({ pieceType: "roof", gridX: 2 })),
      ];
      const value = calculateBaseValue(entities);
      // wall=10, floor=8, roof=12 from config
      expect(value).toBe(30);
    });

    it("should return 0 for empty pieces", () => {
      expect(calculateBaseValue([])).toBe(0);
    });

    it("should skip entities without modularPiece", () => {
      const entities: Entity[] = [
        { id: "no-piece" } as Entity,
        makeEntity(makePiece({ pieceType: "wall" })),
      ];
      expect(calculateBaseValue(entities)).toBe(10);
    });
  });

  describe("getUnlockedPieces", () => {
    it("should unlock wall/floor/roof/foundation/door at level 5", () => {
      const pieces = getUnlockedPieces(5);
      expect(pieces).toContain("wall");
      expect(pieces).toContain("floor");
      expect(pieces).toContain("roof");
      expect(pieces).toContain("foundation");
      expect(pieces).toContain("door");
    });

    it("should not unlock pillar at level 5", () => {
      const pieces = getUnlockedPieces(5);
      expect(pieces).not.toContain("pillar");
    });

    it("should unlock pillar at level 10", () => {
      const pieces = getUnlockedPieces(10);
      expect(pieces).toContain("pillar");
    });

    it("should unlock beam and pipe at level 15", () => {
      const pieces = getUnlockedPieces(15);
      expect(pieces).toContain("beam");
      expect(pieces).toContain("pipe");
    });
  });

  describe("getUnlockedMaterials", () => {
    it("should unlock thatch at level 1", () => {
      const materials = getUnlockedMaterials(1);
      expect(materials).toContain("thatch");
      expect(materials).not.toContain("wood");
    });

    it("should unlock wood at level 5", () => {
      const materials = getUnlockedMaterials(5);
      expect(materials).toContain("wood");
    });

    it("should unlock stone at level 10", () => {
      const materials = getUnlockedMaterials(10);
      expect(materials).toContain("stone");
    });

    it("should unlock metal at level 15", () => {
      const materials = getUnlockedMaterials(15);
      expect(materials).toContain("metal");
    });
  });
});

// ---------------------------------------------------------------------------
// Rapier physics snap validation -- Spec §35.1
// ---------------------------------------------------------------------------

function makeRapierWorld(overrides: {
  castRay?: jest.Mock;
  intersectionsWithShape?: jest.Mock;
} = {}): KitbashRapierWorld {
  return {
    castRay: overrides.castRay ?? jest.fn().mockReturnValue(null),
    intersectionsWithShape: overrides.intersectionsWithShape ?? jest.fn().mockReturnValue(false),
  } as unknown as KitbashRapierWorld;
}

function makeRapierModule(): KitbashRapierModule {
  return {
    Ray: jest.fn().mockImplementation((o, d) => ({ o, d })),
    Cuboid: jest.fn().mockImplementation((x, y, z) => ({ x, y, z })),
  } as unknown as KitbashRapierModule;
}

describe("Kitbashing Rapier Physics (Spec §35.1)", () => {
  describe("checkSnapDirectionMatch", () => {
    it("returns true for east<->west opposing directions at adjacent positions", () => {
      const placed = makePiece({ gridX: 0 });
      const newPiece = makePiece({ gridX: 1 });
      const placedSnap: SnapPoint = { localPosition: { x: 0.5, y: 0, z: 0 }, direction: "east", accepts: ["wall"] };
      const newSnap: SnapPoint = { localPosition: { x: -0.5, y: 0, z: 0 }, direction: "west", accepts: ["wall"] };
      expect(checkSnapDirectionMatch(placedSnap, placed, newSnap, newPiece, 0.1)).toBe(true);
    });

    it("returns false for non-opposing directions (both east)", () => {
      const placed = makePiece({ gridX: 0 });
      const newPiece = makePiece({ gridX: 1 });
      const placedSnap: SnapPoint = { localPosition: { x: 0.5, y: 0, z: 0 }, direction: "east", accepts: ["wall"] };
      const newSnap: SnapPoint = { localPosition: { x: 0.5, y: 0, z: 0 }, direction: "east", accepts: ["wall"] };
      expect(checkSnapDirectionMatch(placedSnap, placed, newSnap, newPiece, 0.1)).toBe(false);
    });

    it("returns true for up<->down opposing directions", () => {
      const placed = makePiece({ gridY: 0 });
      const newPiece = makePiece({ gridY: 1 });
      const placedSnap: SnapPoint = { localPosition: { x: 0, y: 0.5, z: 0 }, direction: "up", accepts: ["wall", "roof", "floor", "beam"] };
      const newSnap: SnapPoint = { localPosition: { x: 0, y: -0.5, z: 0 }, direction: "down", accepts: ["wall", "foundation", "floor"] };
      expect(checkSnapDirectionMatch(placedSnap, placed, newSnap, newPiece, 0.1)).toBe(true);
    });

    it("returns false when positions are too far apart", () => {
      const placed = makePiece({ gridX: 0 });
      const newPiece = makePiece({ gridX: 5 });
      const placedSnap: SnapPoint = { localPosition: { x: 0.5, y: 0, z: 0 }, direction: "east", accepts: ["wall"] };
      const newSnap: SnapPoint = { localPosition: { x: -0.5, y: 0, z: 0 }, direction: "west", accepts: ["wall"] };
      expect(checkSnapDirectionMatch(placedSnap, placed, newSnap, newPiece, 0.1)).toBe(false);
    });
  });

  describe("checkClearance", () => {
    it("returns true when no collider overlaps (intersectionsWithShape = false)", () => {
      const world = makeRapierWorld({ intersectionsWithShape: jest.fn().mockReturnValue(false) });
      const rapier = makeRapierModule();
      expect(checkClearance({ x: 0, y: 0, z: 0 }, world, rapier)).toBe(true);
    });

    it("returns false when a collider exists (intersectionsWithShape = true)", () => {
      const world = makeRapierWorld({ intersectionsWithShape: jest.fn().mockReturnValue(true) });
      const rapier = makeRapierModule();
      expect(checkClearance({ x: 0, y: 0, z: 0 }, world, rapier)).toBe(false);
    });

    it("creates a Cuboid shape with positive half-extents", () => {
      const world = makeRapierWorld();
      const rapier = makeRapierModule();
      checkClearance({ x: 1, y: 2, z: 3 }, world, rapier);
      const CuboidMock = rapier.Cuboid as unknown as jest.Mock;
      const [hx, hy, hz] = CuboidMock.mock.calls[0];
      expect(hx).toBeGreaterThan(0);
      expect(hy).toBeGreaterThan(0);
      expect(hz).toBeGreaterThan(0);
    });
  });

  describe("checkGroundContact", () => {
    it("returns true when castRay hits ground", () => {
      const world = makeRapierWorld({ castRay: jest.fn().mockReturnValue({ toi: 0.5 }) });
      const rapier = makeRapierModule();
      expect(checkGroundContact({ x: 0, y: 0, z: 0 }, world, rapier)).toBe(true);
    });

    it("returns false when no ground found (castRay = null)", () => {
      const world = makeRapierWorld({ castRay: jest.fn().mockReturnValue(null) });
      const rapier = makeRapierModule();
      expect(checkGroundContact({ x: 0, y: 5, z: 0 }, world, rapier)).toBe(false);
    });

    it("casts ray straight down (direction y = -1)", () => {
      const world = makeRapierWorld();
      const rapier = makeRapierModule();
      checkGroundContact({ x: 0, y: 0, z: 0 }, world, rapier);
      const RayMock = rapier.Ray as unknown as jest.Mock;
      const [, dir] = RayMock.mock.calls[0];
      expect(dir).toEqual({ x: 0, y: -1, z: 0 });
    });

    it("passes solid=true to castRay", () => {
      const world = makeRapierWorld();
      const rapier = makeRapierModule();
      checkGroundContact({ x: 0, y: 0, z: 0 }, world, rapier);
      const castRayMock = world.castRay as jest.Mock;
      expect(castRayMock.mock.calls[0][2]).toBe(true);
    });
  });

  describe("validatePlacementWithRapier", () => {
    it("rejects when target position has a collider (clearance fails)", () => {
      const world = makeRapierWorld({ intersectionsWithShape: jest.fn().mockReturnValue(true) });
      const rapier = makeRapierModule();
      expect(validatePlacementWithRapier(makePiece(), [], world, rapier)).toBe(false);
    });

    it("accepts first piece when clear and grounded", () => {
      const world = makeRapierWorld({
        intersectionsWithShape: jest.fn().mockReturnValue(false),
        castRay: jest.fn().mockReturnValue({ toi: 0.1 }),
      });
      const rapier = makeRapierModule();
      expect(validatePlacementWithRapier(makePiece(), [], world, rapier)).toBe(true);
    });

    it("rejects first piece when not grounded (no terrain below)", () => {
      const world = makeRapierWorld({
        intersectionsWithShape: jest.fn().mockReturnValue(false),
        castRay: jest.fn().mockReturnValue(null),
      });
      const rapier = makeRapierModule();
      expect(validatePlacementWithRapier(makePiece(), [], world, rapier)).toBe(false);
    });

    it("accepts adjacent piece with valid snap direction match when clear", () => {
      const existing = makePiece({ gridX: 0 });
      const newPiece = makePiece({ gridX: 1 });
      const world = makeRapierWorld({ intersectionsWithShape: jest.fn().mockReturnValue(false) });
      const rapier = makeRapierModule();
      expect(validatePlacementWithRapier(newPiece, [makeEntity(existing)], world, rapier)).toBe(true);
    });

    it("rejects piece with no snap connection to existing pieces", () => {
      const existing = makePiece({ gridX: 0 });
      const newPiece = makePiece({ gridX: 5 });
      const world = makeRapierWorld({ intersectionsWithShape: jest.fn().mockReturnValue(false) });
      const rapier = makeRapierModule();
      expect(validatePlacementWithRapier(newPiece, [makeEntity(existing)], world, rapier)).toBe(false);
    });
  });
});
