/**
 * PlacementGhost pure utility tests (Spec §35.4).
 *
 * Pure .ts file -- no React/RN imports, no JSX runtime chain.
 */

import { snapToGrid, rotateIncrement, buildGhostPiece } from "./PlacementGhostUtils";
import type { ModularPieceComponent } from "@/game/ecs/components/building";

function makePiece(overrides: Partial<ModularPieceComponent> = {}): ModularPieceComponent {
  return {
    pieceType: "wall",
    variant: "wood-01",
    modelPath: "assets/models/modular/walls/wall_hr_1.glb",
    gridX: 0,
    gridY: 0,
    gridZ: 0,
    rotation: 0,
    snapPoints: [],
    materialType: "wood",
    ...overrides,
  };
}

describe("PlacementGhost utils (Spec §35.4)", () => {
  describe("snapToGrid", () => {
    it("rounds positive floats to nearest integer", () => {
      expect(snapToGrid({ x: 1.4, y: 0.1, z: 2.6 })).toEqual({ x: 1, y: 0, z: 3 });
    });

    it("rounds negative floats to nearest integer", () => {
      expect(snapToGrid({ x: -1.6, y: 0, z: -1.4 })).toEqual({ x: -2, y: 0, z: -1 });
    });

    it("keeps exact integers unchanged", () => {
      expect(snapToGrid({ x: 3, y: 0, z: 5 })).toEqual({ x: 3, y: 0, z: 5 });
    });

    it("handles zero position", () => {
      expect(snapToGrid({ x: 0, y: 0, z: 0 })).toEqual({ x: 0, y: 0, z: 0 });
    });
  });

  describe("rotateIncrement", () => {
    it("increments CW: 0 -> 90 -> 180 -> 270 -> 0", () => {
      expect(rotateIncrement(0, "cw")).toBe(90);
      expect(rotateIncrement(90, "cw")).toBe(180);
      expect(rotateIncrement(180, "cw")).toBe(270);
      expect(rotateIncrement(270, "cw")).toBe(0);
    });

    it("decrements CCW: 0 -> 270 -> 180 -> 90 -> 0", () => {
      expect(rotateIncrement(0, "ccw")).toBe(270);
      expect(rotateIncrement(270, "ccw")).toBe(180);
      expect(rotateIncrement(180, "ccw")).toBe(90);
      expect(rotateIncrement(90, "ccw")).toBe(0);
    });
  });

  describe("buildGhostPiece", () => {
    it("applies grid position and rotation to template", () => {
      const template = makePiece();
      const ghost = buildGhostPiece(template, 3, 0, -2, 90);
      expect(ghost.gridX).toBe(3);
      expect(ghost.gridY).toBe(0);
      expect(ghost.gridZ).toBe(-2);
      expect(ghost.rotation).toBe(90);
    });

    it("preserves all other template fields", () => {
      const template = makePiece({ pieceType: "floor", materialType: "stone" });
      const ghost = buildGhostPiece(template, 0, 0, 0, 0);
      expect(ghost.pieceType).toBe("floor");
      expect(ghost.materialType).toBe("stone");
      expect(ghost.snapPoints).toEqual([]);
    });

    it("does not mutate the original template", () => {
      const template = makePiece({ gridX: 0, gridZ: 0 });
      buildGhostPiece(template, 5, 0, 7, 180);
      expect(template.gridX).toBe(0);
      expect(template.gridZ).toBe(0);
      expect(template.rotation).toBe(0);
    });
  });
});
