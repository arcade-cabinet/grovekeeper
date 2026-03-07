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
} from "./kitbashing";
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
